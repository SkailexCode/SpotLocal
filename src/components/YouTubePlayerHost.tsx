import { useEffect, useRef } from 'react';
import { Link2, Maximize2, Minimize2, X, Youtube } from 'lucide-react';

declare global {
  interface Window {
    YT?: {
      Player: new (
        element: HTMLElement | string,
        options: Record<string, unknown>
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

interface YTPlayerInstance {
  loadVideoById: (videoId: string, startSeconds?: number) => void;
  cueVideoById: (videoId: string, startSeconds?: number) => void;
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  setVolume: (volume: number) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlayerState: () => number;
  destroy: () => void;
}

export type VideoDisplayMode = 'hidden' | 'pip' | 'theater';

interface YouTubePlayerHostProps {
  videoId: string | null;
  active: boolean;
  isPlaying: boolean;
  volumePercent: number;
  seekRequestSec: number | null;
  displayMode: VideoDisplayMode;
  trackTitle?: string;
  trackArtist?: string;
  onDisplayModeChange: (mode: VideoDisplayMode) => void;
  onClosePlayer?: () => void;
  onChangeYouTubeLink?: () => void;
  onTimeUpdate: (currentSec: number, durationSec: number) => void;
  onEnded: () => void;
  onUnavailable: () => void;
  onReadyStateChange?: (ready: boolean) => void;
}

let ytScriptLoaded = false;
const readyCallbacks: Array<() => void> = [];

function ensureYouTubeIframeApi(cb: () => void) {
  if (window.YT && window.YT.Player) {
    cb();
    return;
  }
  readyCallbacks.push(cb);
  if (!ytScriptLoaded) {
    ytScriptLoaded = true;
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (prev) prev();
      while (readyCallbacks.length > 0) {
        const fn = readyCallbacks.shift();
        fn?.();
      }
    };
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    document.head.appendChild(script);
  }
}

export function YouTubePlayerHost({
  videoId,
  active,
  isPlaying,
  volumePercent,
  seekRequestSec,
  displayMode,
  trackTitle,
  trackArtist,
  onDisplayModeChange,
  onClosePlayer,
  onChangeYouTubeLink,
  onTimeUpdate,
  onEnded,
  onUnavailable,
  onReadyStateChange,
}: YouTubePlayerHostProps) {
  const mountNodeRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YTPlayerInstance | null>(null);
  const playerReadyRef = useRef(false);
  const loadedVideoIdRef = useRef<string | null>(null);

  const stateCallbacksRef = useRef({
    onTimeUpdate,
    onEnded,
    onUnavailable,
    onReadyStateChange,
    active,
    isPlaying,
    volumePercent,
    videoId,
  });
  stateCallbacksRef.current = {
    onTimeUpdate,
    onEnded,
    onUnavailable,
    onReadyStateChange,
    active,
    isPlaying,
    volumePercent,
    videoId,
  };

  // Initialize single persistent YT.Player instance (never reparented in DOM)
  useEffect(() => {
    let cancelled = false;

    ensureYouTubeIframeApi(() => {
      if (cancelled || !mountNodeRef.current || !window.YT?.Player) return;

      const innerDiv = document.createElement('div');
      mountNodeRef.current.innerHTML = '';
      mountNodeRef.current.appendChild(innerDiv);

      playerRef.current = new window.YT.Player(innerDiv, {
        width: '100%',
        height: '100%',
        playerVars: {
          autoplay: 0,
          controls: 1,
          disablekb: 1,
          fs: 1,
          iv_load_policy: 3,
          modestbranding: 1,
          playsinline: 1,
          rel: 0,
          origin: window.location.origin,
        },
        events: {
          onReady: () => {
            if (cancelled) return;
            playerReadyRef.current = true;
            stateCallbacksRef.current.onReadyStateChange?.(true);
            playerRef.current?.setVolume(stateCallbacksRef.current.volumePercent);

            const initialVid = stateCallbacksRef.current.videoId;
            if (initialVid && stateCallbacksRef.current.active) {
              loadedVideoIdRef.current = initialVid;
              if (stateCallbacksRef.current.isPlaying) {
                playerRef.current?.loadVideoById(initialVid, 0);
              } else {
                playerRef.current?.cueVideoById(initialVid, 0);
              }
            }
          },
          onStateChange: (event: { data: number }) => {
            if (!stateCallbacksRef.current.active) return;
            if (event.data === 0) {
              stateCallbacksRef.current.onEnded();
            }
          },
          onError: () => {
            if (!stateCallbacksRef.current.active) return;
            stateCallbacksRef.current.onUnavailable();
          },
        },
      });
    });

    return () => {
      cancelled = true;
      playerReadyRef.current = false;
      try {
        playerRef.current?.destroy();
      } catch {
        // Ignore teardown errors
      }
      playerRef.current = null;
    };
  }, []);

  // Load or cue video when videoId or active changes
  useEffect(() => {
    const player = playerRef.current;
    if (!player || !playerReadyRef.current) return;

    if (!active || !videoId) {
      try {
        player.pauseVideo();
      } catch {
        // ignore
      }
      return;
    }

    if (loadedVideoIdRef.current !== videoId) {
      loadedVideoIdRef.current = videoId;
      if (isPlaying) {
        player.loadVideoById(videoId, 0);
      } else {
        player.cueVideoById(videoId, 0);
      }
    }
  }, [videoId, active, isPlaying]);

  // Play / Pause synchronization
  useEffect(() => {
    const player = playerRef.current;
    if (!player || !playerReadyRef.current || !active || !videoId) return;

    try {
      const state = player.getPlayerState?.();
      if (isPlaying && state !== 1 && state !== 3) {
        player.playVideo();
      } else if (!isPlaying && state === 1) {
        player.pauseVideo();
      }
    } catch {
      // ignore transient iframe state errors
    }
  }, [isPlaying, active, videoId]);

  // Volume synchronization
  useEffect(() => {
    const player = playerRef.current;
    if (!player || !playerReadyRef.current) return;
    try {
      player.setVolume(volumePercent);
    } catch {
      // ignore
    }
  }, [volumePercent]);

  // Seek synchronization
  useEffect(() => {
    const player = playerRef.current;
    if (
      seekRequestSec === null ||
      !player ||
      !playerReadyRef.current ||
      !active ||
      !videoId
    ) {
      return;
    }
    try {
      player.seekTo(seekRequestSec, true);
    } catch {
      // ignore
    }
  }, [seekRequestSec, active, videoId]);

  // Poll currentTime & duration at 250ms when active
  useEffect(() => {
    if (!active || !videoId) return;
    const interval = window.setInterval(() => {
      const player = playerRef.current;
      if (!player || !playerReadyRef.current) return;
      try {
        const cur = player.getCurrentTime?.() || 0;
        const dur = player.getDuration?.() || 0;
        if (dur > 0) {
          stateCallbacksRef.current.onTimeUpdate(cur, dur);
        }
      } catch {
        // ignore
      }
    }, 250);
    return () => window.clearInterval(interval);
  }, [active, videoId]);

  const isVisible = active && Boolean(videoId) && displayMode !== 'hidden';
  const isTheater = isVisible && displayMode === 'theater';

  return (
    <>
      {/* Optional backdrop in Theater Mode */}
      {isTheater && (
        <div
          onClick={() => onDisplayModeChange('pip')}
          className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm"
        />
      )}

      <div
        aria-hidden={!isVisible}
        className={
          !isVisible
            ? 'fixed -left-[9999px] -top-[9999px] w-[356px] h-[200px] opacity-0 pointer-events-none overflow-hidden'
            : isTheater
            ? 'fixed z-50 inset-x-4 sm:inset-x-10 lg:inset-x-24 top-16 bottom-28 bg-[#141414] rounded-2xl border border-white/15 shadow-2xl flex flex-col overflow-hidden'
            : 'fixed z-30 right-4 bottom-24 w-72 sm:w-[356px] bg-[#181818] rounded-xl border border-white/15 shadow-2xl flex flex-col overflow-hidden'
        }
      >
        {isVisible && (
          <div className="flex items-center justify-between gap-2 px-3 py-2 bg-[#121212] border-b border-white/10 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <Youtube className="w-4 h-4 text-red-500 fill-red-500 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate">
                  {trackTitle || 'Clip YouTube'}
                </p>
                {trackArtist && isTheater && (
                  <p className="text-[11px] text-[#a0a0a0] truncate">
                    {trackArtist}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {onChangeYouTubeLink && (
                <button
                  type="button"
                  onClick={onChangeYouTubeLink}
                  title="Changer le lien YouTube associé"
                  className="p-1.5 rounded-md text-[#b3b3b3] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <Link2 className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() =>
                  onDisplayModeChange(isTheater ? 'pip' : 'theater')
                }
                title={isTheater ? 'Réduire en mini-lecteur' : 'Mode Cinéma'}
                className="p-1.5 rounded-md text-[#b3b3b3] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                {isTheater ? (
                  <Minimize2 className="w-3.5 h-3.5" />
                ) : (
                  <Maximize2 className="w-3.5 h-3.5" />
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onClosePlayer) {
                    onClosePlayer();
                  } else {
                    onDisplayModeChange('hidden');
                  }
                }}
                title="Fermer le lecteur vidéo (met en pause)"
                className="p-1.5 rounded-md text-[#b3b3b3] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        <div
          ref={mountNodeRef}
          className={
            isTheater
              ? 'flex-1 w-full bg-black'
              : 'w-full aspect-video sm:h-[200px] bg-black'
          }
        />
      </div>
    </>
  );
}
