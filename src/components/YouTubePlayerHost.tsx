import { useEffect, useImperativeHandle, useRef, forwardRef } from 'react';

interface YTPlayerInstance {
  loadVideoById: (videoId: string) => void;
  playVideo: () => void;
  pauseVideo: () => void;
  stopVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  setVolume: (volume: number) => void;
  mute: () => void;
  unMute: () => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlayerState: () => number;
  destroy: () => void;
}

declare global {
  interface Window {
    YT?: {
      Player: new (
        element: HTMLElement | string,
        options: {
          height?: string | number;
          width?: string | number;
          videoId?: string;
          playerVars?: Record<string, number | string>;
          events?: {
            onReady?: () => void;
            onStateChange?: (event: { data: number }) => void;
            onError?: (event: { data: number }) => void;
          };
        }
      ) => YTPlayerInstance;
      PlayerState?: {
        ENDED: number;
        PLAYING: number;
        PAUSED: number;
        BUFFERING: number;
        CUED: number;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

export interface YouTubePlayerHandle {
  loadAndPlay: (videoIds: string[]) => void;
  play: () => void;
  pause: () => void;
  stop: () => void;
  seekTo: (seconds: number) => void;
  setVolume: (volume01: number, muted: boolean) => void;
}

interface YouTubePlayerHostProps {
  visibleInRightPanel: boolean;
  active: boolean;
  onTimeUpdate: (currentTime: number, duration: number) => void;
  onPlayingStateChange: (playing: boolean) => void;
  onEnded: () => void;
  onAllCandidatesFailed: () => void;
  onActiveVideoChange?: (videoId: string) => void;
}

let ytApiPromise: Promise<void> | null = null;

function ensureYouTubeApi(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.YT && window.YT.Player) return Promise.resolve();
  if (ytApiPromise) return ytApiPromise;

  ytApiPromise = new Promise((resolve) => {
    const prevCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (prevCallback) prevCallback();
      resolve();
    };
    const existing = document.querySelector(
      'script[src="https://www.youtube.com/iframe_api"]'
    );
    if (!existing) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
    }
  });
  return ytApiPromise;
}

export const YouTubePlayerHost = forwardRef<YouTubePlayerHandle, YouTubePlayerHostProps>(
  function YouTubePlayerHost(
    {
      visibleInRightPanel,
      active,
      onTimeUpdate,
      onPlayingStateChange,
      onEnded,
      onAllCandidatesFailed,
      onActiveVideoChange,
    },
    ref
  ) {
    const mountRef = useRef<HTMLDivElement | null>(null);
    const playerRef = useRef<YTPlayerInstance | null>(null);
    const readyRef = useRef(false);
    const pendingVideoIdsRef = useRef<string[] | null>(null);
    const candidatesRef = useRef<string[]>([]);
    const candidateIndexRef = useRef(0);
    const activeRef = useRef(active);
    activeRef.current = active;

    const callbacksRef = useRef({
      onTimeUpdate,
      onPlayingStateChange,
      onEnded,
      onAllCandidatesFailed,
      onActiveVideoChange,
    });
    callbacksRef.current = {
      onTimeUpdate,
      onPlayingStateChange,
      onEnded,
      onAllCandidatesFailed,
      onActiveVideoChange,
    };

    const loadCandidateAt = (idx: number) => {
      const id = candidatesRef.current[idx];
      if (!id) {
        callbacksRef.current.onAllCandidatesFailed();
        return;
      }
      candidateIndexRef.current = idx;
      callbacksRef.current.onActiveVideoChange?.(id);
      if (playerRef.current && readyRef.current) {
        playerRef.current.loadVideoById(id);
      } else {
        pendingVideoIdsRef.current = candidatesRef.current.slice(idx);
      }
    };

    useEffect(() => {
      let cancelled = false;
      void ensureYouTubeApi().then(() => {
        if (cancelled || !mountRef.current || !window.YT?.Player) return;
        const container = document.createElement('div');
        mountRef.current.innerHTML = '';
        mountRef.current.appendChild(container);

        playerRef.current = new window.YT.Player(container, {
          width: '100%',
          height: '100%',
          playerVars: {
            autoplay: 0,
            controls: 1,
            rel: 0,
            modestbranding: 1,
            playsinline: 1,
            origin: window.location.origin,
          },
          events: {
            onReady: () => {
              readyRef.current = true;
              if (pendingVideoIdsRef.current && pendingVideoIdsRef.current.length > 0) {
                candidatesRef.current = pendingVideoIdsRef.current;
                pendingVideoIdsRef.current = null;
                loadCandidateAt(0);
              }
            },
            onStateChange: (event) => {
              if (!activeRef.current) return;
              const state = event.data;
              if (state === 1) {
                callbacksRef.current.onPlayingStateChange(true);
                const dur = playerRef.current?.getDuration() || 0;
                const cur = playerRef.current?.getCurrentTime() || 0;
                if (dur > 0) callbacksRef.current.onTimeUpdate(cur, dur);
              } else if (state === 2) {
                callbacksRef.current.onPlayingStateChange(false);
              } else if (state === 0) {
                callbacksRef.current.onEnded();
              }
            },
            onError: () => {
              if (!activeRef.current) return;
              const nextIdx = candidateIndexRef.current + 1;
              if (nextIdx < candidatesRef.current.length) {
                loadCandidateAt(nextIdx);
              } else {
                callbacksRef.current.onAllCandidatesFailed();
              }
            },
          },
        });
      });

      const pollTimer = window.setInterval(() => {
        if (!activeRef.current || !playerRef.current || !readyRef.current) return;
        try {
          const state = playerRef.current.getPlayerState();
          if (state === 1 || state === 2) {
            const cur = playerRef.current.getCurrentTime() || 0;
            const dur = playerRef.current.getDuration() || 0;
            if (dur > 0) {
              callbacksRef.current.onTimeUpdate(cur, dur);
            }
          }
        } catch {
          // Ignore polling before player ready
        }
      }, 400);

      return () => {
        cancelled = true;
        window.clearInterval(pollTimer);
        if (playerRef.current) {
          try {
            playerRef.current.destroy();
          } catch {
            // Ignore cleanup errors
          }
          playerRef.current = null;
        }
        readyRef.current = false;
      };
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        loadAndPlay: (videoIds: string[]) => {
          candidatesRef.current = videoIds;
          candidateIndexRef.current = 0;
          if (playerRef.current && readyRef.current) {
            loadCandidateAt(0);
          } else {
            pendingVideoIdsRef.current = videoIds;
          }
        },
        play: () => {
          if (playerRef.current && readyRef.current) {
            playerRef.current.playVideo();
          }
        },
        pause: () => {
          if (playerRef.current && readyRef.current) {
            playerRef.current.pauseVideo();
          }
        },
        stop: () => {
          pendingVideoIdsRef.current = null;
          if (playerRef.current && readyRef.current) {
            try {
              playerRef.current.stopVideo();
            } catch {
              // Ignore
            }
          }
        },
        seekTo: (seconds: number) => {
          if (playerRef.current && readyRef.current) {
            playerRef.current.seekTo(seconds, true);
          }
        },
        setVolume: (volume01: number, muted: boolean) => {
          if (playerRef.current && readyRef.current) {
            if (muted) {
              playerRef.current.mute();
            } else {
              playerRef.current.unMute();
              playerRef.current.setVolume(Math.round(volume01 * 100));
            }
          }
        },
      }),
      []
    );

    return (
      <div
        aria-hidden={!active}
        className={
          active
            ? visibleInRightPanel
              ? 'fixed z-30 bottom-[96px] right-4 xl:bottom-auto xl:top-[124px] xl:right-6 w-[210px] xl:w-[258px] aspect-video rounded-md overflow-hidden bg-black shadow-2xl border border-white/10 transition-opacity duration-200'
              : 'fixed z-30 bottom-[84px] sm:bottom-[96px] right-3 w-[196px] aspect-video rounded-md overflow-hidden bg-black shadow-2xl border border-white/15 transition-opacity duration-200'
            : 'fixed -left-[9999px] -top-[9999px] w-[200px] h-[112px] opacity-0 pointer-events-none'
        }
      >
        <div ref={mountRef} className="w-full h-full" />
      </div>
    );
  }
);
