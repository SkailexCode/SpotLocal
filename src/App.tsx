import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Hls from 'hls.js';
import { Upload } from 'lucide-react';
import { DEFAULT_PLAYLISTS, SEED_TRACKS } from './data/initialLibrary';
import type {
  ActiveView,
  Playlist,
  RepeatMode,
  SearchResultTrack,
  Track,
} from './types/music';
import {
  formatTime,
  getNextTrackIndex,
  getPreviousTrackIndex,
  matchLocalFilenameToTrack,
  parseAudioFilename,
} from './utils/musicLogic';
import {
  getAudioBlobUrl,
  readAudioDurationFromFile,
  saveAudioBlob,
} from './utils/indexedDbAudio';
import { TopBar } from './components/TopBar';
import { Sidebar } from './components/Sidebar';
import { TrackListView } from './components/TrackListView';
import { SearchView } from './components/SearchView';
import { HomeView } from './components/HomeView';
import { PlayerBar } from './components/PlayerBar';
import { RightQueuePanel } from './components/RightQueuePanel';
import { LocalExeModal } from './components/LocalExeModal';
import { CreatePlaylistModal } from './components/CreatePlaylistModal';
import { LegalOpenSourceModal } from './components/LegalOpenSourceModal';
import {
  YouTubePlayerHost,
  type YouTubePlayerHandle,
} from './components/YouTubePlayerHost';

const STORAGE_TRACKS_KEY = 'spotlocal_tracks_v1';
const STORAGE_PLAYLISTS_KEY = 'spotlocal_playlists_v1';

function loadStoredTracks(): Track[] {
  const seedById = new Map(SEED_TRACKS.map((s) => [s.id, s]));
  try {
    const raw = localStorage.getItem(STORAGE_TRACKS_KEY);
    if (!raw) return SEED_TRACKS;
    const parsed = JSON.parse(raw) as Track[];
    if (!Array.isArray(parsed) || parsed.length === 0) return SEED_TRACKS;
    const existingIds = new Set(parsed.map((p) => p.id));
    const merged = parsed.map((stored) => {
      const seed = seedById.get(stored.id);
      if (!seed) return stored;
      return {
        ...stored,
        coverUrl: stored.coverUrl || seed.coverUrl,
        previewUrl: stored.previewUrl || seed.previewUrl,
        dailymotionId: stored.dailymotionId ?? seed.dailymotionId,
        soundcloudTrackId: stored.soundcloudTrackId ?? seed.soundcloudTrackId,
        youtubeVideoIds:
          stored.youtubeVideoIds && stored.youtubeVideoIds.length > 0
            ? stored.youtubeVideoIds
            : seed.youtubeVideoIds,
        sourceKind:
          stored.localFileKey || stored.localServerUrl
            ? stored.sourceKind
            : (stored.dailymotionId ?? seed.dailymotionId) ||
                (stored.soundcloudTrackId ?? seed.soundcloudTrackId)
              ? 'stream'
              : seed.youtubeVideoIds?.length
                ? 'youtube'
                : stored.sourceKind,
      };
    });
    // Append any newly added seed tracks
    for (const seed of SEED_TRACKS) {
      if (!existingIds.has(seed.id)) {
        merged.push(seed);
      }
    }
    return merged;
  } catch {
    return SEED_TRACKS;
  }
}

function loadStoredPlaylists(): Playlist[] {
  const defaultById = new Map(DEFAULT_PLAYLISTS.map((p) => [p.id, p]));
  try {
    const raw = localStorage.getItem(STORAGE_PLAYLISTS_KEY);
    if (!raw) return DEFAULT_PLAYLISTS;
    const parsed = JSON.parse(raw) as Playlist[];
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_PLAYLISTS;
    const existingIds = new Set(parsed.map((p) => p.id));
    const merged = parsed.map((stored) => {
      const def = defaultById.get(stored.id);
      if (!def) return stored;
      const combinedTrackIds = Array.from(new Set([...def.trackIds, ...stored.trackIds]));
      return {
        ...def,
        ...stored,
        trackIds: combinedTrackIds,
      };
    });
    for (const def of DEFAULT_PLAYLISTS) {
      if (!existingIds.has(def.id)) {
        merged.push(def);
      }
    }
    return merged;
  } catch {
    return DEFAULT_PLAYLISTS;
  }
}

export default function App() {
  const [tracks, setTracks] = useState<Track[]>(loadStoredTracks);
  const [playlists, setPlaylists] = useState<Playlist[]>(loadStoredPlaylists);
  const [activeView, setActiveView] = useState<ActiveView>('liked');
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Playback state
  const [queue, setQueue] = useState<Track[]>(() => loadStoredTracks());
  const [currentTrackId, setCurrentTrackId] = useState<string | null>(null);
  const [playbackEngine, setPlaybackEngine] = useState<'audio' | 'hls' | 'youtube'>('audio');
  const [playingKind, setPlayingKind] = useState<'local' | 'full' | 'preview'>('preview');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<RepeatMode>('off');
  const [audioError, setAudioError] = useState<string | null>(null);

  // Panels & Modals
  const [queueOpen, setQueueOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [localModalTab, setLocalModalTab] = useState<'import' | 'exe' | null>(null);
  const [createPlaylistOpen, setCreatePlaylistOpen] = useState(false);
  const [legalModalOpen, setLegalModalOpen] = useState(false);
  const [activeYtVideoId, setActiveYtVideoId] = useState<string | null>(null);
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const [importSummary, setImportSummary] = useState<string | null>(null);
  const [musicDir, setMusicDir] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamVideoRef = useRef<HTMLVideoElement | null>(null);
  const hlsInstanceRef = useRef<Hls | null>(null);
  const ytRef = useRef<YouTubePlayerHandle | null>(null);
  const objectUrlCacheRef = useRef<Map<string, string>>(new Map());
  const retryAttemptedRef = useRef<Set<string>>(new Set());
  const playbackSessionRef = useRef(0);
  const playbackEngineRef = useRef<'audio' | 'hls' | 'youtube'>('audio');
  const playingKindRef = useRef<'local' | 'full' | 'preview'>('preview');
  const currentTrackRef = useRef<Track | null>(null);
  const volumeRef = useRef(volume);
  const mutedRef = useRef(muted);
  volumeRef.current = volume;
  mutedRef.current = muted;

  const updateEngine = useCallback(
    (engine: 'audio' | 'hls' | 'youtube', kind: 'local' | 'full' | 'preview') => {
      playbackEngineRef.current = engine;
      playingKindRef.current = kind;
      setPlaybackEngine(engine);
      setPlayingKind(kind);
    },
    []
  );

  // Persist library & playlists
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_TRACKS_KEY, JSON.stringify(tracks));
    } catch {
      // Ignore storage quota errors
    }
  }, [tracks]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_PLAYLISTS_KEY, JSON.stringify(playlists));
    } catch {
      // Ignore storage quota errors
    }
  }, [playlists]);

  // Create audio element once & clean up HLS on unmount
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'metadata';
    audio.volume = volumeRef.current;
    audioRef.current = audio;

    return () => {
      audio.pause();
      audio.src = '';
      if (hlsInstanceRef.current) {
        hlsInstanceRef.current.destroy();
        hlsInstanceRef.current = null;
      }
    };
  }, []);

  const currentTrack = useMemo(
    () =>
      tracks.find((t) => t.id === currentTrackId) ||
      queue.find((t) => t.id === currentTrackId) ||
      null,
    [tracks, queue, currentTrackId]
  );
  currentTrackRef.current = currentTrack;

  const currentIndex = useMemo(
    () => queue.findIndex((t) => t.id === currentTrackId),
    [queue, currentTrackId]
  );

  // Scan local ./music folder on startup
  const scanServerLocalFolder = useCallback(async () => {
    try {
      const res = await fetch('/api/local-music');
      if (!res.ok) return;
      const data = (await res.json()) as {
        musicDir?: string;
        files?: Array<{ filename: string; url: string }>;
      };
      if (data.musicDir) setMusicDir(data.musicDir);
      const files = data.files || [];
      if (files.length === 0) return;

      setTracks((prev) => {
        const next = [...prev];
        let linked = 0;
        let added = 0;
        for (const f of files) {
          const match = matchLocalFilenameToTrack(f.filename, next);
          if (match) {
            const idx = next.findIndex((t) => t.id === match.id);
            if (idx >= 0) {
              next[idx] = {
                ...next[idx],
                localServerUrl: f.url,
                sourceKind: 'local-folder',
              };
              linked += 1;
            }
          } else if (!next.some((t) => t.localServerUrl === f.url)) {
            const parsed = parseAudioFilename(f.filename);
            next.unshift({
              id: `local-srv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              title: parsed.title,
              artist: parsed.artist,
              album: 'Dossier local',
              addedAt: "Aujourd'hui",
              durationLabel: '3:00',
              durationSec: 180,
              liked: true,
              coverUrl: '',
              previewUrl: '',
              localServerUrl: f.url,
              sourceKind: 'local-folder',
            });
            added += 1;
          }
        }
        if (linked > 0 || added > 0) {
          setImportSummary(
            `${linked} titre(s) relié(s) et ${added} nouveau(x) titre(s) chargé(s) depuis le dossier local.`
          );
        }
        return next;
      });
    } catch {
      // Server offline or unreachable
    }
  }, []);

  useEffect(() => {
    void scanServerLocalFolder();
  }, [scanServerLocalFolder]);

  const destroyHlsPlayback = useCallback(() => {
    if (hlsInstanceRef.current) {
      hlsInstanceRef.current.destroy();
      hlsInstanceRef.current = null;
    }
    const video = streamVideoRef.current;
    if (video) {
      video.pause();
      video.removeAttribute('src');
      video.load();
    }
  }, []);

  const playHtmlAudioFallback = useCallback(
    async (track: Track, sessionId: number) => {
      const audio = audioRef.current;
      if (!audio) return;

      let src = track.previewUrl;
      if (!src) {
        try {
          const r = await fetch(
            `/api/music/resolve?q=${encodeURIComponent(
              track.searchQuery || `${track.title} ${track.artist}`
            )}`
          );
          if (r.ok) {
            const d = (await r.json()) as { previewUrl?: string };
            if (d.previewUrl) {
              src = d.previewUrl;
              setTracks((prev) =>
                prev.map((t) =>
                  t.id === track.id ? { ...t, previewUrl: d.previewUrl! } : t
                )
              );
            }
          }
        } catch {
          // Ignore network error
        }
      }

      if (playbackSessionRef.current !== sessionId) return;
      if (!src) {
        setIsPlaying(false);
        setAudioError('Aucune source audio trouvée — associez un MP3 local.');
        return;
      }

      destroyHlsPlayback();
      ytRef.current?.stop();
      updateEngine('audio', 'preview');
      audio.src = src;
      audio.currentTime = 0;
      audio.volume = mutedRef.current ? 0 : volumeRef.current;
      audio.muted = mutedRef.current;
      try {
        await audio.play();
        setIsPlaying(true);
      } catch {
        setIsPlaying(false);
      }
    },
    [destroyHlsPlayback, updateEngine]
  );

  const playHlsStream = useCallback(
    async (hlsUrl: string, sessionId: number): Promise<boolean> => {
      const video = streamVideoRef.current;
      if (!video) return false;

      destroyHlsPlayback();
      if (playbackSessionRef.current !== sessionId) return false;

      video.volume = mutedRef.current ? 0 : volumeRef.current;
      video.muted = mutedRef.current;

      if (Hls.isSupported()) {
        return new Promise<boolean>((resolve) => {
          let settled = false;
          const finish = (ok: boolean) => {
            if (!settled) {
              settled = true;
              resolve(ok);
            }
          };

          const hls = new Hls({
            enableWorker: true,
            lowLatencyMode: false,
            backBufferLength: 30,
          });
          hlsInstanceRef.current = hls;

          const timeoutId = window.setTimeout(() => {
            if (!settled && playbackSessionRef.current === sessionId) {
              hls.destroy();
              if (hlsInstanceRef.current === hls) hlsInstanceRef.current = null;
              finish(false);
            }
          }, 12000);

          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            if (playbackSessionRef.current !== sessionId) {
              window.clearTimeout(timeoutId);
              hls.destroy();
              if (hlsInstanceRef.current === hls) hlsInstanceRef.current = null;
              finish(false);
              return;
            }
            updateEngine('hls', 'full');
            video.volume = mutedRef.current ? 0 : volumeRef.current;
            video.muted = mutedRef.current;
            video
              .play()
              .then(() => {
                window.clearTimeout(timeoutId);
                setIsPlaying(true);
                finish(true);
              })
              .catch(() => {
                window.clearTimeout(timeoutId);
                hls.destroy();
                if (hlsInstanceRef.current === hls) hlsInstanceRef.current = null;
                finish(false);
              });
          });

          let recoveryTried = false;
          hls.on(Hls.Events.ERROR, (_evt, data) => {
            if (!data.fatal) return;
            if (playbackSessionRef.current !== sessionId) {
              window.clearTimeout(timeoutId);
              finish(false);
              return;
            }
            if (!settled) {
              window.clearTimeout(timeoutId);
              hls.destroy();
              if (hlsInstanceRef.current === hls) hlsInstanceRef.current = null;
              finish(false);
              return;
            }
            if (!recoveryTried && data.type === Hls.ErrorTypes.MEDIA_ERROR) {
              recoveryTried = true;
              hls.recoverMediaError();
              return;
            }
            hls.destroy();
            if (hlsInstanceRef.current === hls) hlsInstanceRef.current = null;
            const active = currentTrackRef.current;
            if (active) {
              void playHtmlAudioFallback(active, sessionId);
            }
          });

          hls.loadSource(hlsUrl);
          hls.attachMedia(video);
        });
      }

      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        updateEngine('hls', 'full');
        video.src = hlsUrl;
        try {
          await video.play();
          setIsPlaying(true);
          return true;
        } catch {
          return false;
        }
      }

      return false;
    },
    [destroyHlsPlayback, playHtmlAudioFallback, updateEngine]
  );

  // Resolve playable source: Local MP3 > Full Stream (Dailymotion/SoundCloud) > YouTube > 30s Preview
  const startTrackPlayback = useCallback(
    async (track: Track) => {
      const audio = audioRef.current;
      if (!audio) return;

      const sessionId = ++playbackSessionRef.current;
      setAudioError(null);
      setCurrentTrackId(track.id);
      setCurrentTime(0);
      setDuration(track.durationSec || 0);

      // Stop any active playback cleanly
      audio.pause();
      audio.removeAttribute('src');
      destroyHlsPlayback();
      ytRef.current?.stop();

      // 1. Local MP3/FLAC/WAV priority (IndexedDB or local ./music folder)
      let localSrc = '';
      if (track.localFileKey) {
        const cached = objectUrlCacheRef.current.get(track.localFileKey);
        if (cached) {
          localSrc = cached;
        } else {
          const blobUrl = await getAudioBlobUrl(track.localFileKey);
          if (blobUrl) {
            objectUrlCacheRef.current.set(track.localFileKey, blobUrl);
            localSrc = blobUrl;
          }
        }
      }
      if (!localSrc && track.localServerUrl) {
        localSrc = track.localServerUrl;
      }

      if (playbackSessionRef.current !== sessionId) return;

      if (localSrc) {
        updateEngine('audio', 'local');
        audio.src = localSrc;
        audio.currentTime = 0;
        audio.volume = mutedRef.current ? 0 : volumeRef.current;
        audio.muted = mutedRef.current;
        try {
          await audio.play();
          setIsPlaying(true);
        } catch {
          setIsPlaying(false);
        }
        return;
      }

      // 2. Official YouTube IFrame Player (Primary online source — transparent, legal & open-source compliant)
      let ytIds = track.youtubeVideoIds || [];
      if (ytIds.length === 0) {
        try {
          const firstArtist = track.artist.split(',')[0].trim();
          const res = await fetch(
            `/api/music/youtube?q=${encodeURIComponent(`${track.title} ${firstArtist}`)}`
          );
          if (res.ok) {
            const data = (await res.json()) as { videoIds?: string[] };
            ytIds = data.videoIds || [];
            if (ytIds.length > 0) {
              setTracks((prev) =>
                prev.map((t) =>
                  t.id === track.id
                    ? { ...t, youtubeVideoIds: ytIds, sourceKind: 'youtube' }
                    : t
                )
              );
            }
          }
        } catch {
          // Ignore network error
        }
      }

      if (playbackSessionRef.current !== sessionId) return;

      if (ytIds.length > 0 && ytRef.current) {
        setActiveYtVideoId(ytIds[0]);
        updateEngine('youtube', 'full');
        ytRef.current.setVolume(volumeRef.current, mutedRef.current);
        ytRef.current.loadAndPlay(ytIds);
        setIsPlaying(true);
        return;
      }

      // 3. Fallback streaming source if YouTube candidates unavailable
      try {
        const params = new URLSearchParams();
        if (track.dailymotionId) params.set('dmId', track.dailymotionId);
        if (track.soundcloudTrackId) params.set('scId', String(track.soundcloudTrackId));
        params.set('title', track.title);
        params.set('artist', track.artist);
        params.set('durationSec', String(track.durationSec || 180));

        const fullRes = await fetch(`/api/music/full-stream?${params.toString()}`);
        if (playbackSessionRef.current !== sessionId) return;

        if (fullRes.ok) {
          const data = (await fullRes.json()) as {
            kind?: 'hls' | 'audio';
            url?: string;
            durationSec?: number;
          };
          if (data.url) {
            if (data.durationSec && data.durationSec > 0) {
              setDuration(data.durationSec);
            }
            if (data.kind === 'hls') {
              const started = await playHlsStream(data.url, sessionId);
              if (started || playbackSessionRef.current !== sessionId) {
                return;
              }
            } else if (data.kind === 'audio') {
              updateEngine('audio', 'full');
              audio.src = data.url;
              audio.currentTime = 0;
              audio.volume = mutedRef.current ? 0 : volumeRef.current;
              audio.muted = mutedRef.current;
              try {
                await audio.play();
                setIsPlaying(true);
                return;
              } catch {
                // Fall through to next source
              }
            }
          }
        }
      } catch {
        // Continue to preview
      }

      if (playbackSessionRef.current !== sessionId) return;

      // 4. Final fallback to preview
      await playHtmlAudioFallback(track, sessionId);
    },
    [destroyHlsPlayback, playHlsStream, playHtmlAudioFallback, updateEngine]
  );

  const handlePlayTrack = useCallback(
    (track: Track, listQueue: Track[]) => {
      setQueue(listQueue);
      void startTrackPlayback(track);
    },
    [startTrackPlayback]
  );

  const handleTogglePlayPause = useCallback(() => {
    if (!currentTrack) return;
    if (playbackEngineRef.current === 'youtube') {
      if (isPlaying) {
        ytRef.current?.pause();
        setIsPlaying(false);
      } else {
        ytRef.current?.play();
        setIsPlaying(true);
      }
      return;
    }

    if (playbackEngineRef.current === 'hls') {
      const video = streamVideoRef.current;
      if (!video) return;
      if (isPlaying) {
        video.pause();
        setIsPlaying(false);
      } else {
        video
          .play()
          .then(() => setIsPlaying(true))
          .catch(() => setIsPlaying(false));
      }
      return;
    }

    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      if (!audio.src) {
        void startTrackPlayback(currentTrack);
      } else {
        audio
          .play()
          .then(() => setIsPlaying(true))
          .catch(() => setIsPlaying(false));
      }
    }
  }, [currentTrack, isPlaying, startTrackPlayback]);

  const handleNext = useCallback(() => {
    const nextIdx = getNextTrackIndex(currentIndex, queue.length, shuffle, repeat);
    if (nextIdx >= 0 && queue[nextIdx]) {
      void startTrackPlayback(queue[nextIdx]);
    } else {
      setIsPlaying(false);
    }
  }, [currentIndex, queue, shuffle, repeat, startTrackPlayback]);

  const handlePrevious = useCallback(() => {
    if (currentTime > 3) {
      if (playbackEngineRef.current === 'youtube') {
        ytRef.current?.seekTo(0);
      } else if (playbackEngineRef.current === 'hls' && streamVideoRef.current) {
        streamVideoRef.current.currentTime = 0;
      } else if (audioRef.current) {
        audioRef.current.currentTime = 0;
      }
      setCurrentTime(0);
      return;
    }
    const prevIdx = getPreviousTrackIndex(currentIndex, queue.length, repeat);
    if (prevIdx >= 0 && queue[prevIdx]) {
      void startTrackPlayback(queue[prevIdx]);
    }
  }, [currentIndex, currentTime, queue, repeat, startTrackPlayback]);

  // HTMLAudioElement event listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => {
      if (playbackEngineRef.current === 'audio') {
        setCurrentTime(audio.currentTime || 0);
      }
    };
    const onLoadedMetadata = () => {
      if (
        playbackEngineRef.current === 'audio' &&
        Number.isFinite(audio.duration) &&
        audio.duration > 0
      ) {
        setDuration(audio.duration);
      }
    };
    const onEnded = () => {
      if (playbackEngineRef.current !== 'audio') return;
      if (repeat === 'one') {
        audio.currentTime = 0;
        void audio.play();
      } else {
        handleNext();
      }
    };
    const onError = async () => {
      if (playbackEngineRef.current !== 'audio') return;
      const activeTrack = currentTrackRef.current;
      if (!activeTrack) return;
      if (playingKindRef.current === 'full') {
        void playHtmlAudioFallback(activeTrack, playbackSessionRef.current);
        return;
      }
      if (retryAttemptedRef.current.has(activeTrack.id)) {
        setIsPlaying(false);
        setAudioError('Source indisponible — importez le MP3 local.');
        return;
      }
      retryAttemptedRef.current.add(activeTrack.id);
      try {
        const res = await fetch(
          `/api/music/resolve?q=${encodeURIComponent(
            activeTrack.searchQuery || `${activeTrack.title} ${activeTrack.artist}`
          )}`
        );
        if (res.ok) {
          const data = (await res.json()) as { previewUrl?: string };
          if (data.previewUrl && data.previewUrl !== audio.src) {
            setTracks((prev) =>
              prev.map((t) =>
                t.id === activeTrack.id ? { ...t, previewUrl: data.previewUrl! } : t
              )
            );
            audio.src = data.previewUrl;
            await audio.play();
            setIsPlaying(true);
            return;
          }
        }
      } catch {
        // Ignore refresh error
      }
      setIsPlaying(false);
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
    };
  }, [handleNext, playHtmlAudioFallback, repeat]);

  // HLS video element event listeners
  useEffect(() => {
    const video = streamVideoRef.current;
    if (!video) return;

    const onTimeUpdate = () => {
      if (playbackEngineRef.current === 'hls') {
        setCurrentTime(video.currentTime || 0);
      }
    };
    const onMetadata = () => {
      if (
        playbackEngineRef.current === 'hls' &&
        Number.isFinite(video.duration) &&
        video.duration > 0
      ) {
        setDuration(video.duration);
      }
    };
    const onEnded = () => {
      if (playbackEngineRef.current !== 'hls') return;
      if (repeat === 'one') {
        video.currentTime = 0;
        void video.play();
      } else {
        handleNext();
      }
    };

    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('loadedmetadata', onMetadata);
    video.addEventListener('durationchange', onMetadata);
    video.addEventListener('ended', onEnded);

    return () => {
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('loadedmetadata', onMetadata);
      video.removeEventListener('durationchange', onMetadata);
      video.removeEventListener('ended', onEnded);
    };
  }, [handleNext, repeat]);

  // Sync volume & mute across all engines
  useEffect(() => {
    const targetVol = muted ? 0 : volume;
    if (audioRef.current) {
      audioRef.current.volume = targetVol;
      audioRef.current.muted = muted;
    }
    if (streamVideoRef.current) {
      streamVideoRef.current.volume = targetVol;
      streamVideoRef.current.muted = muted;
    }
    ytRef.current?.setVolume(volume, muted);
  }, [volume, muted]);

  // OS MediaSession integration
  useEffect(() => {
    if (!('mediaSession' in navigator) || !currentTrack) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentTrack.title,
      artist: currentTrack.artist,
      album: currentTrack.album,
      artwork: currentTrack.coverUrl ? [{ src: currentTrack.coverUrl }] : [],
    });
    navigator.mediaSession.setActionHandler('play', handleTogglePlayPause);
    navigator.mediaSession.setActionHandler('pause', handleTogglePlayPause);
    navigator.mediaSession.setActionHandler('nexttrack', handleNext);
    navigator.mediaSession.setActionHandler('previoustrack', handlePrevious);
  }, [currentTrack, handleNext, handlePrevious, handleTogglePlayPause]);

  // Library mutations
  const handleToggleLike = (trackId: string) => {
    setTracks((prev) =>
      prev.map((t) => (t.id === trackId ? { ...t, liked: !t.liked } : t))
    );
  };

  const handleAddSearchResultToLibrary = (
    item: SearchResultTrack,
    playlistId?: string
  ) => {
    let resolvedId = item.externalId;
    setTracks((prev) => {
      const existing = prev.find(
        (t) =>
          t.id === item.externalId ||
          (t.title.toLowerCase() === item.title.toLowerCase() &&
            t.artist.toLowerCase().includes(item.artist.toLowerCase()))
      );
      if (existing) {
        resolvedId = existing.id;
        return prev.map((t) =>
          t.id === existing.id ? { ...t, liked: playlistId ? t.liked : true } : t
        );
      }
      const newTrack: Track = {
        id: item.externalId,
        title: item.title,
        artist: item.artist,
        album: item.album,
        addedAt: "Aujourd'hui",
        durationLabel: item.durationLabel,
        durationSec: item.durationSec,
        liked: !playlistId,
        explicit: item.explicit,
        coverUrl: item.coverUrl,
        previewUrl: item.previewUrl,
        searchQuery: `${item.title} ${item.artist}`,
        sourceKind: 'stream',
      };
      return [newTrack, ...prev];
    });

    if (playlistId) {
      setPlaylists((prev) =>
        prev.map((pl) =>
          pl.id === playlistId && !pl.trackIds.includes(resolvedId)
            ? { ...pl, trackIds: [resolvedId, ...pl.trackIds] }
            : pl
        )
      );
    }
  };

  const handlePlaySearchResult = (item: SearchResultTrack) => {
    if (currentTrackId === item.externalId) {
      handleTogglePlayPause();
      return;
    }
    const tempTrack: Track = {
      id: item.externalId,
      title: item.title,
      artist: item.artist,
      album: item.album,
      addedAt: "Aujourd'hui",
      durationLabel: item.durationLabel,
      durationSec: item.durationSec,
      liked: false,
      explicit: item.explicit,
      coverUrl: item.coverUrl,
      previewUrl: item.previewUrl,
      searchQuery: `${item.title} ${item.artist}`,
      sourceKind: 'stream',
    };
    handlePlayTrack(tempTrack, [tempTrack, ...tracks]);
  };

  const handleCreatePlaylist = (name: string, description: string) => {
    const newPl: Playlist = {
      id: `pl-${Date.now()}`,
      name,
      description,
      trackIds: [],
      createdAt: new Date().toISOString().slice(0, 10),
    };
    setPlaylists((prev) => [newPl, ...prev]);
    setSelectedPlaylistId(newPl.id);
    setActiveView('playlist');
  };

  const handleAddTrackToPlaylist = (trackId: string, playlistId: string) => {
    setPlaylists((prev) =>
      prev.map((pl) =>
        pl.id === playlistId && !pl.trackIds.includes(trackId)
          ? { ...pl, trackIds: [...pl.trackIds, trackId] }
          : pl
      )
    );
  };

  const handleRemoveTrackFromPlaylist = (trackId: string, playlistId: string) => {
    setPlaylists((prev) =>
      prev.map((pl) =>
        pl.id === playlistId
          ? { ...pl, trackIds: pl.trackIds.filter((id) => id !== trackId) }
          : pl
      )
    );
  };

  const handleDeletePlaylist = (playlistId: string) => {
    setPlaylists((prev) => prev.filter((pl) => pl.id !== playlistId));
    setSelectedPlaylistId(null);
    setActiveView('liked');
  };

  const handleAttachLocalFile = async (trackId: string, file: File) => {
    const key = `audio-${trackId}-${Date.now()}`;
    await saveAudioBlob(key, file);
    const dur = await readAudioDurationFromFile(file);
    const blobUrl = URL.createObjectURL(file);
    objectUrlCacheRef.current.set(key, blobUrl);

    setTracks((prev) =>
      prev.map((t) =>
        t.id === trackId
          ? {
              ...t,
              localFileKey: key,
              sourceKind: 'local-idb',
              durationSec: dur,
              durationLabel: formatTime(dur),
            }
          : t
      )
    );
  };

  const handleImportFiles = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList).filter((f) =>
      /\.(mp3|flac|wav|m4a|ogg|aac|opus)$/i.test(f.name)
    );
    if (files.length === 0) return;

    let linked = 0;
    let added = 0;
    const newTracks: Track[] = [];
    const updatedMap = new Map<string, Partial<Track>>();

    for (const file of files) {
      const key = `audio-imp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      await saveAudioBlob(key, file);
      const dur = await readAudioDurationFromFile(file);
      const blobUrl = URL.createObjectURL(file);
      objectUrlCacheRef.current.set(key, blobUrl);

      let localServerUrl: string | undefined;
      try {
        const up = await fetch(
          `/api/local-music/upload?filename=${encodeURIComponent(file.name)}`,
          {
            method: 'POST',
            body: file,
          }
        );
        if (up.ok) {
          const d = (await up.json()) as { url?: string };
          localServerUrl = d.url;
        }
      } catch {
        // IndexedDB holds the file cleanly
      }

      const match = matchLocalFilenameToTrack(file.name, tracks);
      if (match) {
        updatedMap.set(match.id, {
          localFileKey: key,
          localServerUrl,
          sourceKind: 'local-idb',
          durationSec: dur,
          durationLabel: formatTime(dur),
        });
        linked += 1;
      } else {
        const parsed = parseAudioFilename(file.name);
        newTracks.push({
          id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          title: parsed.title,
          artist: parsed.artist,
          album: 'Import local',
          addedAt: "Aujourd'hui",
          durationSec: dur,
          durationLabel: formatTime(dur),
          liked: true,
          coverUrl: '',
          previewUrl: '',
          localFileKey: key,
          localServerUrl,
          sourceKind: 'local-idb',
        });
        added += 1;
      }
    }

    setTracks((prev) => [
      ...newTracks,
      ...prev.map((t) => (updatedMap.has(t.id) ? { ...t, ...updatedMap.get(t.id) } : t)),
    ]);

    setImportSummary(
      `${files.length} fichier(s) importé(s) : ${linked} associé(s) aux titres existants, ${added} ajouté(s).`
    );
  };

  const handleQueueNext = (track: Track) => {
    setQueue((prev) => {
      const idx = prev.findIndex((t) => t.id === currentTrackId);
      const filtered = prev.filter((t) => t.id !== track.id);
      if (idx < 0) return [track, ...filtered];
      const copy = [...filtered];
      copy.splice(idx + 1, 0, track);
      return copy;
    });
  };

  const likedTracks = useMemo(() => tracks.filter((t) => t.liked), [tracks]);
  const activePlaylist = useMemo(
    () => playlists.find((p) => p.id === selectedPlaylistId) || null,
    [playlists, selectedPlaylistId]
  );
  const activePlaylistTracks = useMemo(() => {
    if (!activePlaylist) return [];
    const byId = new Map(tracks.map((t) => [t.id, t]));
    return activePlaylist.trackIds
      .map((id) => byId.get(id))
      .filter((t): t is Track => Boolean(t));
  }, [activePlaylist, tracks]);

  const localTrackCount = useMemo(
    () =>
      tracks.filter(
        (t) => t.sourceKind === 'local-idb' || t.sourceKind === 'local-folder'
      ).length,
    [tracks]
  );

  return (
    <div
      className="h-screen w-screen flex flex-col bg-black text-white overflow-hidden"
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes('Files')) {
          e.preventDefault();
          setIsDraggingFiles(true);
        }
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) setIsDraggingFiles(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setIsDraggingFiles(false);
        if (e.dataTransfer.files?.length) {
          void handleImportFiles(e.dataTransfer.files);
        }
      }}
    >
      <TopBar
        activeView={activeView}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onGoHome={() => setActiveView('home')}
        onGoLiked={() => setActiveView('liked')}
        onOpenSearch={() => setActiveView('search')}
        onOpenImportModal={() => setLocalModalTab('import')}
        onOpenExeModal={() => setLocalModalTab('exe')}
        onOpenLegalModal={() => setLegalModalOpen(true)}
        onOpenMobileMenu={() => setMobileMenuOpen(true)}
      />

      <main className="flex-1 flex min-h-0 px-2 gap-2">
        <Sidebar
          activeView={activeView}
          selectedPlaylistId={selectedPlaylistId}
          likedCount={likedTracks.length}
          playlists={playlists}
          tracks={tracks}
          onSelectLiked={() => setActiveView('liked')}
          onSelectPlaylist={(id) => {
            setSelectedPlaylistId(id);
            setActiveView('playlist');
          }}
          onCreatePlaylist={() => setCreatePlaylistOpen(true)}
          onOpenImportModal={() => setLocalModalTab('import')}
          mobileOpen={mobileMenuOpen}
          onCloseMobile={() => setMobileMenuOpen(false)}
        />

        {activeView === 'liked' && (
          <TrackListView
            title="Titres likés"
            isLikedView
            tracks={likedTracks}
            allPlaylists={playlists}
            currentTrackId={currentTrackId}
            isPlaying={isPlaying}
            shuffle={shuffle}
            onPlayTrack={handlePlayTrack}
            onTogglePlayPause={handleTogglePlayPause}
            onToggleShuffle={() => setShuffle((s) => !s)}
            onToggleLike={handleToggleLike}
            onAddTrackToPlaylist={handleAddTrackToPlaylist}
            onAttachLocalFile={handleAttachLocalFile}
            onQueueNext={handleQueueNext}
            onOpenSearch={() => setActiveView('search')}
          />
        )}

        {activeView === 'playlist' && activePlaylist && (
          <TrackListView
            title={activePlaylist.name}
            subtitle={activePlaylist.description}
            playlist={activePlaylist}
            tracks={activePlaylistTracks}
            allPlaylists={playlists}
            currentTrackId={currentTrackId}
            isPlaying={isPlaying}
            shuffle={shuffle}
            onPlayTrack={handlePlayTrack}
            onTogglePlayPause={handleTogglePlayPause}
            onToggleShuffle={() => setShuffle((s) => !s)}
            onToggleLike={handleToggleLike}
            onAddTrackToPlaylist={handleAddTrackToPlaylist}
            onRemoveTrackFromPlaylist={handleRemoveTrackFromPlaylist}
            onAttachLocalFile={handleAttachLocalFile}
            onQueueNext={handleQueueNext}
            onOpenSearch={() => setActiveView('search')}
            onDeletePlaylist={handleDeletePlaylist}
          />
        )}

        {activeView === 'search' && (
          <SearchView
            query={searchQuery}
            onQueryChange={setSearchQuery}
            libraryTracks={tracks}
            playlists={playlists}
            currentTrackId={currentTrackId}
            isPlaying={isPlaying}
            onPlaySearchResult={handlePlaySearchResult}
            onAddSearchResultToLibrary={handleAddSearchResultToLibrary}
          />
        )}

        {activeView === 'home' && (
          <HomeView
            likedCount={likedTracks.length}
            playlists={playlists}
            tracks={tracks}
            currentTrackId={currentTrackId}
            isPlaying={isPlaying}
            onOpenLiked={() => setActiveView('liked')}
            onOpenPlaylist={(id) => {
              setSelectedPlaylistId(id);
              setActiveView('playlist');
            }}
            onPlayTrack={handlePlayTrack}
          />
        )}

        {queueOpen && (
          <RightQueuePanel
            currentTrack={currentTrack}
            youtubeActive={playbackEngine === 'youtube' && Boolean(currentTrack)}
            activeVideoId={activeYtVideoId}
            playbackMode={playingKind}
            queue={queue}
            currentIndex={currentIndex}
            onPlayTrack={handlePlayTrack}
            onClose={() => setQueueOpen(false)}
            onOpenLegalModal={() => setLegalModalOpen(true)}
          />
        )}
      </main>

      <video
        ref={streamVideoRef}
        playsInline
        preload="metadata"
        className="fixed w-px h-px opacity-0 pointer-events-none -z-10"
        aria-hidden="true"
      />

      <YouTubePlayerHost
        ref={ytRef}
        active={playbackEngine === 'youtube' && Boolean(currentTrack)}
        visibleInRightPanel={queueOpen}
        onActiveVideoChange={(id) => setActiveYtVideoId(id)}
        onTimeUpdate={(cur, dur) => {
          setCurrentTime(cur);
          setDuration(dur);
        }}
        onPlayingStateChange={(playing) => setIsPlaying(playing)}
        onEnded={() => {
          if (repeat === 'one') {
            ytRef.current?.seekTo(0);
            ytRef.current?.play();
          } else {
            handleNext();
          }
        }}
        onAllCandidatesFailed={() => {
          const track = currentTrackRef.current;
          if (track) {
            void playHtmlAudioFallback(track, playbackSessionRef.current);
          }
        }}
      />

      <PlayerBar
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        volume={volume}
        muted={muted}
        shuffle={shuffle}
        repeat={repeat}
        queueOpen={queueOpen}
        audioError={audioError}
        youtubeActive={playbackEngine === 'youtube' && Boolean(currentTrack)}
        activeVideoId={activeYtVideoId}
        onTogglePlayPause={handleTogglePlayPause}
        onPrevious={handlePrevious}
        onNext={handleNext}
        onSeek={(timeSec) => {
          if (playbackEngineRef.current === 'youtube') {
            ytRef.current?.seekTo(timeSec);
            setCurrentTime(timeSec);
          } else if (playbackEngineRef.current === 'hls' && streamVideoRef.current) {
            streamVideoRef.current.currentTime = timeSec;
            setCurrentTime(timeSec);
          } else if (audioRef.current) {
            audioRef.current.currentTime = timeSec;
            setCurrentTime(timeSec);
          }
        }}
        onVolumeChange={(v) => {
          setVolume(v);
          if (v > 0 && muted) setMuted(false);
        }}
        onToggleMute={() => setMuted((m) => !m)}
        onToggleShuffle={() => setShuffle((s) => !s)}
        onCycleRepeat={() =>
          setRepeat((r) => (r === 'off' ? 'all' : r === 'all' ? 'one' : 'off'))
        }
        onToggleLike={handleToggleLike}
        onToggleQueue={() => setQueueOpen((o) => !o)}
      />

      {localModalTab && (
        <LocalExeModal
          initialTab={localModalTab}
          musicDir={musicDir}
          localTrackCount={localTrackCount}
          totalTrackCount={tracks.length}
          importSummary={importSummary}
          onImportFiles={handleImportFiles}
          onScanServerFolder={scanServerLocalFolder}
          onClose={() => setLocalModalTab(null)}
        />
      )}

      {createPlaylistOpen && (
        <CreatePlaylistModal
          onCreate={handleCreatePlaylist}
          onClose={() => setCreatePlaylistOpen(false)}
        />
      )}

      {legalModalOpen && (
        <LegalOpenSourceModal onClose={() => setLegalModalOpen(false)} />
      )}

      {isDraggingFiles && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center pointer-events-none">
          <div className="p-8 rounded-2xl border-2 border-dashed border-[#1ED760] bg-[#181818] text-center space-y-3">
            <Upload className="w-12 h-12 text-[#1ED760] mx-auto" />
            <p className="font-display font-bold text-xl text-white">
              Déposez vos musiques MP3 / FLAC / WAV ici
            </p>
            <p className="text-sm text-[#b3b3b3]">
              Elles seront ajoutées et reliées automatiquement à votre bibliothèque.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
