import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
} from 'react';
import { Disc3, Heart, Home, Search, Upload, Youtube } from 'lucide-react';
import { DEFAULT_PLAYLISTS, SEED_TRACKS } from './data/initialLibrary';
import type {
  ActiveView,
  AudioSourceKind,
  Playlist,
  RepeatMode,
  SearchResultTrack,
  SleepTimerOption,
  SpotLocalBackupData,
  Track,
} from './types/music';
import {
  extractYouTubeVideoId,
  formatTime,
  getNextTrackIndex,
  getPreviousTrackIndex,
  isExpiredDeezerPreviewUrl,
  isTransientSignedStreamUrl,
  matchLocalFilenameToTrack,
  parseAudioFilename,
} from './utils/musicLogic';
import {
  getAudioBlobUrl,
  readAudioDurationFromFile,
  saveAudioBlob,
} from './utils/indexedDbAudio';
import {
  hasLocalBackend,
  markLocalBackendAbsent,
  resolvePreviewHybrid,
  resolveYouTubeMetadataClient,
} from './utils/webCatalogSearch';
import { resolvePublicAssetUrl } from './components/AlbumCover';
import { TopBar } from './components/TopBar';
import { Sidebar } from './components/Sidebar';
import { TrackListView } from './components/TrackListView';
import { RightQueuePanel } from './components/RightQueuePanel';
import { PlayerBar } from './components/PlayerBar';
import {
  YouTubePlayerHost,
  type VideoDisplayMode,
} from './components/YouTubePlayerHost';
import type { YouTubeTrackDraft } from './components/YouTubeLinkModal';

const HomeView = lazy(() =>
  import('./components/HomeView').then((m) => ({ default: m.HomeView }))
);
const SearchView = lazy(() =>
  import('./components/SearchView').then((m) => ({ default: m.SearchView }))
);
const LocalExeModal = lazy(() =>
  import('./components/LocalExeModal').then((m) => ({
    default: m.LocalExeModal,
  }))
);
const LegalOpenSourceModal = lazy(() =>
  import('./components/LegalOpenSourceModal').then((m) => ({
    default: m.LegalOpenSourceModal,
  }))
);
const CreatePlaylistModal = lazy(() =>
  import('./components/CreatePlaylistModal').then((m) => ({
    default: m.CreatePlaylistModal,
  }))
);
const YouTubeLinkModal = lazy(() =>
  import('./components/YouTubeLinkModal').then((m) => ({
    default: m.YouTubeLinkModal,
  }))
);
const KeyboardShortcutsModal = lazy(() =>
  import('./components/KeyboardShortcutsModal').then((m) => ({
    default: m.KeyboardShortcutsModal,
  }))
);

const STORAGE_USER_STATE_KEY = 'spotlocal_user_state_v2';
const STORAGE_PLAYLISTS_KEY = 'spotlocal_playlists_v2';
const STORAGE_VOLUME_KEY = 'spotlocal_volume_v1';

interface PersistedUserState {
  trackOverrides: Record<string, Partial<Track>>;
  customTracks: Track[];
  recentTrackIds: string[];
}

const SEED_IDS = new Set(SEED_TRACKS.map((t) => t.id));
const SEED_MAP = new Map(SEED_TRACKS.map((t) => [t.id, t]));

function detectStreamKind(url: string): 'deezer' | 'itunes' | 'stream' {
  if (/dzcdn\.net|deezer\.com/i.test(url)) return 'deezer';
  if (/mzstatic\.com|itunes\.apple\.com|apple\.com/i.test(url)) return 'itunes';
  return 'stream';
}

function loadPersistedState(): {
  tracks: Track[];
  recentIds: string[];
} {
  try {
    localStorage.removeItem('spotlocal_tracks_v1');

    const raw = localStorage.getItem(STORAGE_USER_STATE_KEY);
    if (!raw) {
      return { tracks: SEED_TRACKS, recentIds: [] };
    }
    const parsed = JSON.parse(raw) as Partial<PersistedUserState>;
    const overrides = parsed.trackOverrides || {};
    const customTracks = Array.isArray(parsed.customTracks)
      ? parsed.customTracks
          .filter((t) => t && t.id)
          .map((t) => ({
            ...t,
            previewUrl: isTransientSignedStreamUrl(t.previewUrl)
              ? ''
              : t.previewUrl || '',
            fallbackPreviewUrl: isTransientSignedStreamUrl(t.fallbackPreviewUrl)
              ? undefined
              : t.fallbackPreviewUrl,
          }))
      : [];

    const hydratedSeeds = SEED_TRACKS.map((seed) => {
      const ov = overrides[seed.id];
      if (!ov) return seed;
      return {
        ...seed,
        ...ov,
        previewUrl: isTransientSignedStreamUrl(ov.previewUrl)
          ? seed.previewUrl
          : (ov.previewUrl ?? seed.previewUrl),
      };
    });

    return {
      tracks: [...customTracks, ...hydratedSeeds],
      recentIds: Array.isArray(parsed.recentTrackIds)
        ? parsed.recentTrackIds.slice(0, 15)
        : [],
    };
  } catch {
    return { tracks: SEED_TRACKS, recentIds: [] };
  }
}

function loadInitialPlaylists(): Playlist[] {
  try {
    const raw = localStorage.getItem(STORAGE_PLAYLISTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Playlist[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // Ignore storage read failure
  }
  return DEFAULT_PLAYLISTS;
}

export default function App() {
  const initialData = useMemo(() => loadPersistedState(), []);
  const [tracks, setTracks] = useState<Track[]>(initialData.tracks);
  const [recentTrackIds, setRecentTrackIds] = useState<string[]>(
    initialData.recentIds
  );
  const [playlists, setPlaylists] = useState<Playlist[]>(loadInitialPlaylists);

  // Navigation State
  const [activeView, setActiveView] = useState<ActiveView>('liked');
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(
    null
  );
  const [selectedArtist, setSelectedArtist] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const [showQueuePanel, setShowQueuePanel] = useState<boolean>(
    () => typeof window !== 'undefined' && window.innerWidth >= 1280
  );
  const [videoDisplayMode, setVideoDisplayMode] =
    useState<VideoDisplayMode>('pip');

  // Modals
  const [showImportModal, setShowImportModal] = useState(false);
  const [showLegalModal, setShowLegalModal] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [showYouTubeModal, setShowYouTubeModal] = useState(false);
  const [showCreatePlaylistModal, setShowCreatePlaylistModal] = useState(false);
  const [attachTargetTrack, setAttachTargetTrack] = useState<Track | null>(null);

  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Playback State
  const [queueIds, setQueueIds] = useState<string[]>(() =>
    SEED_TRACKS.filter((t) => t.liked).map((t) => t.id)
  );
  const [currentTrackId, setCurrentTrackId] = useState<string | null>(
    SEED_TRACKS[0]?.id ?? null
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('off');
  const [currentTimeSec, setCurrentTimeSec] = useState(0);
  const [durationSec, setDurationSec] = useState(0);

  // Ref mirror of playback timestamps so keyboard/MediaSession hooks never re-bind 4x/sec
  const playbackTimeRef = useRef({ currentSec: 0, durationSec: 0 });
  const streamRetryRef = useRef<string | null>(null);

  // Hybrid Audio Source State
  const [activeAudioSource, setActiveAudioSource] =
    useState<AudioSourceKind>('none');
  const [activeYtVideoId, setActiveYtVideoId] = useState<string | null>(null);
  const [ytCandidateIndex, setYtCandidateIndex] = useState(0);
  const [ytSeekRequest, setYtSeekRequest] = useState<number | null>(null);

  // Sleep Timer State
  const [sleepOption, setSleepOption] = useState<SleepTimerOption>(0);
  const [sleepDeadlineMs, setSleepDeadlineMs] = useState<number | null>(null);
  const [sleepRemainingMin, setSleepRemainingMin] = useState<number | null>(
    null
  );

  const [volume, setVolume] = useState<number>(() => {
    const saved = Number(localStorage.getItem(STORAGE_VOLUME_KEY));
    return Number.isFinite(saved) && saved >= 0 && saved <= 1 ? saved : 0.8;
  });
  const [isMuted, setIsMuted] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const tracksRef = useRef<Track[]>(tracks);
  tracksRef.current = tracks;
  const playbackRequestIdRef = useRef(0);
  const createdBlobUrlsRef = useRef<string[]>([]);
  const toastTimerRef = useRef<number | null>(null);

  const updateCurrentTimeThrottled = useCallback((sec: number) => {
    playbackTimeRef.current.currentSec = sec;
    setCurrentTimeSec((prev) => (Math.abs(sec - prev) >= 0.2 ? sec : prev));
  }, []);

  const updateDuration = useCallback((dur: number) => {
    playbackTimeRef.current.durationSec = dur;
    setDurationSec((prev) => (Math.abs(dur - prev) >= 0.5 ? dur : prev));
  }, []);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage(null);
    }, 3400);
  }, []);

  useEffect(() => {
    return () => {
      for (const url of createdBlobUrlsRef.current) {
        URL.revokeObjectURL(url);
      }
    };
  }, []);

  // Lightweight delta persistence (~2-5 KB, never persists expiring dzcdn signed URLs)
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const trackOverrides: Record<string, Partial<Track>> = {};
        const customTracks: Track[] = [];

        for (const t of tracks) {
          if (SEED_IDS.has(t.id)) {
            const orig = SEED_MAP.get(t.id);
            const diff: Partial<Track> = {};
            if (orig && orig.liked !== t.liked) diff.liked = t.liked;
            if (t.youtubeVideoIds && t.youtubeVideoIds.length > 0) {
              diff.youtubeVideoIds = t.youtubeVideoIds;
            }
            if (t.deezerId) diff.deezerId = t.deezerId;
            if (t.itunesId) diff.itunesId = t.itunesId;
            if (t.previewUrl && !isTransientSignedStreamUrl(t.previewUrl)) {
              diff.previewUrl = t.previewUrl;
            }
            if (t.localFileKey) {
              diff.localFileKey = t.localFileKey;
              diff.durationSec = t.durationSec;
              diff.durationLabel = t.durationLabel;
            }
            if (Object.keys(diff).length > 0) {
              trackOverrides[t.id] = diff;
            }
          } else {
            customTracks.push({
              ...t,
              previewUrl: isTransientSignedStreamUrl(t.previewUrl)
                ? ''
                : t.previewUrl,
              fallbackPreviewUrl: isTransientSignedStreamUrl(
                t.fallbackPreviewUrl
              )
                ? undefined
                : t.fallbackPreviewUrl,
              localServerUrl: undefined,
            });
          }
        }

        const payload: PersistedUserState = {
          trackOverrides,
          customTracks,
          recentTrackIds,
        };
        localStorage.setItem(STORAGE_USER_STATE_KEY, JSON.stringify(payload));
      } catch {
        // Ignore quota errors
      }
    }, 250);

    return () => window.clearTimeout(timer);
  }, [tracks, recentTrackIds]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_PLAYLISTS_KEY, JSON.stringify(playlists));
    } catch {
      // Ignore quota errors
    }
  }, [playlists]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_VOLUME_KEY, String(volume));
    } catch {
      // Ignore
    }
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Auto-scan server /music folder once on boot (works in local Node/Electron mode; skipped on static hosts like GitHub Pages)
  useEffect(() => {
    if (!hasLocalBackend()) return;
    let cancelled = false;
    fetch('/api/local-music')
      .then((res) => {
        const ct = res.headers.get('content-type') || '';
        if (!res.ok || !ct.includes('application/json')) {
          markLocalBackendAbsent();
          return null;
        }
        return res.json();
      })
      .then(
        (
          data: {
            files?: Array<{ filename: string; url: string }>;
          } | null
        ) => {
          if (cancelled || !data?.files || data.files.length === 0) return;

          setTracks((prev) => {
            const updated = [...prev];
            let linkedCount = 0;

            for (const file of data.files!) {
              const matched = matchLocalFilenameToTrack(file.filename, updated);
              if (matched) {
                const idx = updated.findIndex((t) => t.id === matched.id);
                if (idx >= 0) {
                  updated[idx] = {
                    ...updated[idx],
                    localServerUrl: file.url,
                    sourceKind: 'local-folder',
                  };
                  linkedCount++;
                }
              } else {
                const meta = parseAudioFilename(file.filename);
                const diskId = `disk-${file.filename}`;
                if (!updated.some((t) => t.id === diskId)) {
                  updated.unshift({
                    id: diskId,
                    title: meta.title,
                    artist: meta.artist,
                    album: 'Dossier /music',
                    genre: 'MP3 Local',
                    addedAt: 'Dossier /music',
                    durationSec: 210,
                    durationLabel: '3:30',
                    coverUrl: '/covers/track-1.jpg',
                    previewUrl: '',
                    explicit: false,
                    liked: true,
                    localServerUrl: file.url,
                    sourceKind: 'local-folder',
                  });
                  linkedCount++;
                }
              }
            }

            if (linkedCount > 0) {
              showToast(
                `${linkedCount} fichier(s) du dossier /music chargés.`
              );
            }
            return updated;
          });
        }
      )
      .catch(() => {
        // Ignore when running statically
      });

    return () => {
      cancelled = true;
    };
  }, [showToast]);

  // Sleep Timer countdown effect
  useEffect(() => {
    if (!sleepDeadlineMs) {
      setSleepRemainingMin(null);
      return;
    }

    const updateRemaining = () => {
      const diffMs = sleepDeadlineMs - Date.now();
      if (diffMs <= 0) {
        setSleepDeadlineMs(null);
        setSleepOption(0);
        setSleepRemainingMin(null);
        setIsPlaying(false);
        audioRef.current?.pause();
        showToast('Mise en veille activée — lecture mise en pause.');
      } else {
        setSleepRemainingMin(Math.max(1, Math.ceil(diffMs / 60_000)));
      }
    };

    updateRemaining();
    const timer = window.setInterval(updateRemaining, 10_000);
    return () => window.clearInterval(timer);
  }, [sleepDeadlineMs, showToast]);

  const handleSelectSleepTimer = useCallback(
    (opt: SleepTimerOption) => {
      setSleepOption(opt);
      if (opt === 0) {
        setSleepDeadlineMs(null);
        showToast('Minuterie de mise en veille désactivée.');
      } else if (opt === 'end-of-track') {
        setSleepDeadlineMs(null);
        showToast('La lecture s’arrêtera à la fin de ce titre.');
      } else {
        setSleepDeadlineMs(Date.now() + opt * 60_000);
        showToast(`Mise en veille programmée dans ${opt} min.`);
      }
    },
    [showToast]
  );

  // Fast lookup map
  const trackMap = useMemo(() => {
    const map = new Map<string, Track>();
    for (const t of tracks) map.set(t.id, t);
    return map;
  }, [tracks]);

  const likedTracks = useMemo(() => tracks.filter((t) => t.liked), [tracks]);
  const recentTracks = useMemo(
    () =>
      recentTrackIds
        .map((id) => trackMap.get(id))
        .filter((t): t is Track => Boolean(t)),
    [recentTrackIds, trackMap]
  );

  const currentTrack = useMemo(
    () => (currentTrackId ? trackMap.get(currentTrackId) ?? null : null),
    [currentTrackId, trackMap]
  );

  const selectedPlaylist = useMemo(
    () => playlists.find((p) => p.id === selectedPlaylistId) ?? null,
    [playlists, selectedPlaylistId]
  );

  const selectedPlaylistTracks = useMemo(() => {
    if (!selectedPlaylist) return [];
    return selectedPlaylist.trackIds
      .map((id) => trackMap.get(id))
      .filter((t): t is Track => Boolean(t));
  }, [selectedPlaylist, trackMap]);

  const selectedArtistTracks = useMemo(() => {
    if (!selectedArtist) return [];
    const target = selectedArtist.toLowerCase();
    return tracks.filter((t) =>
      t.artist
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .includes(target)
    );
  }, [tracks, selectedArtist]);

  const upcomingTracks = useMemo(() => {
    if (!currentTrackId || queueIds.length === 0) return [];
    const idx = queueIds.indexOf(currentTrackId);
    const orderedIds =
      idx >= 0
        ? [...queueIds.slice(idx + 1), ...queueIds.slice(0, idx)]
        : queueIds;
    return orderedIds
      .map((id) => trackMap.get(id))
      .filter((t): t is Track => Boolean(t));
  }, [queueIds, currentTrackId, trackMap]);

  // Background Next-Track Stream Prefetching (zero-latency skip)
  useEffect(() => {
    if (!isPlaying) return;
    const nextUp = upcomingTracks[0];
    if (
      !nextUp ||
      nextUp.localFileKey ||
      nextUp.localServerUrl ||
      (nextUp.youtubeVideoIds && nextUp.youtubeVideoIds.length > 0) ||
      (nextUp.previewUrl && !isExpiredDeezerPreviewUrl(nextUp.previewUrl))
    ) {
      return;
    }

    const timer = window.setTimeout(() => {
      const q =
        nextUp.searchQuery ||
        `${nextUp.artist.split(',')[0]} ${nextUp.title}`;
      resolvePreviewHybrid({
        query: q,
        deezerId: nextUp.deezerId,
        itunesId: nextUp.itunesId,
      })
        .then((res) => {
          if (!res.previewUrl) return;
          setTracks((prev) =>
            prev.map((t) =>
              t.id === nextUp.id
                ? {
                    ...t,
                    previewUrl: res.previewUrl,
                    fallbackPreviewUrl:
                      res.fallbackPreviewUrl || t.fallbackPreviewUrl,
                    deezerId: res.deezerId ?? t.deezerId,
                    itunesId: res.itunesId ?? t.itunesId,
                    coverUrl: t.coverUrl || res.coverUrl,
                  }
                : t
            )
          );
        })
        .catch(() => {
          // Ignore background prefetch errors
        });
    }, 3000);

    return () => window.clearTimeout(timer);
  }, [isPlaying, currentTrackId, upcomingTracks]);

  // Race-free Hybrid Audio Engine (MP3 Local -> YouTube -> Parallel Apple iTunes & Deezer)
  const startPlaybackForTrack = useCallback(
    async (track: Track) => {
      const requestId = ++playbackRequestIdRef.current;
      const audio = audioRef.current;
      if (!audio) return;

      streamRetryRef.current = null;
      setCurrentTrackId(track.id);
      playbackTimeRef.current = { currentSec: 0, durationSec: track.durationSec };
      setCurrentTimeSec(0);
      setDurationSec(track.durationSec);
      setYtSeekRequest(null);

      setRecentTrackIds((prev) =>
        [track.id, ...prev.filter((id) => id !== track.id)].slice(0, 15)
      );

      // 1A. Browser IndexedDB Local MP3 File -> Full-Length HTML5 <audio>
      if (track.localFileKey) {
        setIsLoadingAudio(true);
        try {
          const blobUrl = await getAudioBlobUrl(track.localFileKey);
          if (requestId !== playbackRequestIdRef.current) return;
          if (blobUrl) {
            createdBlobUrlsRef.current.push(blobUrl);
            setActiveYtVideoId(null);
            setActiveAudioSource('local-idb');
            audio.src = blobUrl;
            audio.volume = isMuted ? 0 : volume;
            await audio.play();
            setIsPlaying(true);
            setIsLoadingAudio(false);
            return;
          }
        } catch {
          // Fall through if IndexedDB entry was cleared
        }
        setIsLoadingAudio(false);
      }

      // 1B. Server /music Disk Audio File -> Full-Length HTML5 <audio>
      if (track.localServerUrl) {
        setActiveYtVideoId(null);
        setActiveAudioSource('local-folder');
        setIsLoadingAudio(true);
        audio.src = track.localServerUrl;
        audio.volume = isMuted ? 0 : volume;
        try {
          await audio.play();
          if (requestId === playbackRequestIdRef.current) {
            setIsPlaying(true);
          }
        } catch {
          if (requestId === playbackRequestIdRef.current) {
            setIsPlaying(false);
            showToast('Cliquez sur Lecture pour autoriser le son.');
          }
        } finally {
          if (requestId === playbackRequestIdRef.current) {
            setIsLoadingAudio(false);
          }
        }
        return;
      }

      // Pause HTML5 <audio> before checking YouTube or Apple/Deezer stream
      audio.pause();

      // 2. Attached YouTube Video ID -> Instant Zero-Key YouTube IFrame Playback
      let ytCandidates = track.youtubeVideoIds || [];

      if (ytCandidates.length === 0 && hasLocalBackend()) {
        setIsLoadingAudio(true);
        try {
          const cleanQuery = `${track.artist.split(',')[0]} ${track.title}`;
          const ytRes = await fetch(
            `/api/music/youtube?q=${encodeURIComponent(cleanQuery)}`
          );
          if (ytRes.ok) {
            const ytData = (await ytRes.json()) as { videoIds?: string[] };
            if (ytData.videoIds && ytData.videoIds.length > 0) {
              ytCandidates = ytData.videoIds;
              setTracks((prev) =>
                prev.map((t) =>
                  t.id === track.id
                    ? { ...t, youtubeVideoIds: ytCandidates }
                    : t
                )
              );
            }
          }
        } catch {
          // Ignore and proceed to Apple iTunes + Deezer
        }
      }

      if (requestId !== playbackRequestIdRef.current) return;

      if (ytCandidates.length > 0) {
        setIsLoadingAudio(false);
        setYtCandidateIndex(0);
        setActiveYtVideoId(ytCandidates[0]);
        setActiveAudioSource('youtube');
        setVideoDisplayMode((prev) => (prev === 'hidden' ? 'pip' : prev));
        setIsPlaying(true);
        return;
      }

      // 3. Parallel Apple iTunes (CORS) + Deezer (JSONP) Audio Stream
      let resolvedUrl = track.previewUrl;
      if (resolvedUrl && isExpiredDeezerPreviewUrl(resolvedUrl)) {
        resolvedUrl = '';
      }

      if (!resolvedUrl) {
        setIsLoadingAudio(true);
        const query =
          track.searchQuery || `${track.artist.split(',')[0]} ${track.title}`;
        const resolved = await resolvePreviewHybrid({
          query,
          deezerId: track.deezerId,
          itunesId: track.itunesId,
        });

        if (requestId !== playbackRequestIdRef.current) return;

        if (resolved.previewUrl) {
          resolvedUrl = resolved.previewUrl;
          setTracks((prev) =>
            prev.map((t) =>
              t.id === track.id
                ? {
                    ...t,
                    previewUrl: resolved.previewUrl,
                    fallbackPreviewUrl:
                      resolved.fallbackPreviewUrl || t.fallbackPreviewUrl,
                    deezerId: resolved.deezerId ?? t.deezerId,
                    itunesId: resolved.itunesId ?? t.itunesId,
                    coverUrl: t.coverUrl || resolved.coverUrl,
                  }
                : t
            )
          );
        }
      }

      setIsLoadingAudio(false);

      if (!resolvedUrl) {
        setIsPlaying(false);
        setActiveAudioSource('none');
        showToast(
          `Aucun flux trouvé pour « ${track.title} » — collez un lien YouTube via le menu (•••) !`
        );
        return;
      }

      setActiveYtVideoId(null);
      setActiveAudioSource(detectStreamKind(resolvedUrl));
      audio.src = resolvedUrl;
      audio.volume = isMuted ? 0 : volume;

      try {
        await audio.play();
        if (requestId === playbackRequestIdRef.current) {
          setIsPlaying(true);
        }
      } catch {
        if (requestId === playbackRequestIdRef.current) {
          setIsPlaying(false);
          showToast('Cliquez sur Lecture pour lancer l’audio.');
        }
      }
    },
    [isMuted, volume, showToast]
  );

  // Auto-healing <audio> stream error handler (switches between Apple & Deezer on CDN/token failure)
  const handleAudioStreamError = useCallback(async () => {
    if (
      activeAudioSource === 'youtube' ||
      activeAudioSource === 'local-idb' ||
      activeAudioSource === 'local-folder' ||
      !currentTrackId
    ) {
      return;
    }

    const track = tracksRef.current.find((t) => t.id === currentTrackId);
    const audio = audioRef.current;
    if (!track || !audio) return;

    // Prevent infinite retry loops on the same track
    if (streamRetryRef.current === track.id) {
      setIsPlaying(false);
      return;
    }
    streamRetryRef.current = track.id;

    // 1. Try pre-resolved secondary stream (e.g. Apple <-> Deezer) if valid
    if (
      track.fallbackPreviewUrl &&
      track.fallbackPreviewUrl !== audio.src &&
      !isExpiredDeezerPreviewUrl(track.fallbackPreviewUrl)
    ) {
      setActiveAudioSource(detectStreamKind(track.fallbackPreviewUrl));
      audio.src = track.fallbackPreviewUrl;
      audio
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
      return;
    }

    // 2. Refresh fresh URL from Apple iTunes + Deezer APIs
    const query =
      track.searchQuery || `${track.artist.split(',')[0]} ${track.title}`;
    const refreshed = await resolvePreviewHybrid({
      query,
      deezerId: track.deezerId,
      itunesId: track.itunesId,
    });

    if (refreshed.previewUrl && refreshed.previewUrl !== audio.src) {
      setTracks((prev) =>
        prev.map((t) =>
          t.id === track.id ? { ...t, previewUrl: refreshed.previewUrl } : t
        )
      );
      setActiveAudioSource(detectStreamKind(refreshed.previewUrl));
      audio.src = refreshed.previewUrl;
      audio
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    } else {
      setIsPlaying(false);
    }
  }, [activeAudioSource, currentTrackId]);

  // Automatic fallback if an embedded YouTube video is restricted by its label
  const handleYouTubeUnavailable = useCallback(async () => {
    if (!currentTrackId) return;
    const track = tracksRef.current.find((t) => t.id === currentTrackId);
    if (!track) return;

    const candidates = track.youtubeVideoIds || [];
    const nextIdx = ytCandidateIndex + 1;
    if (nextIdx < candidates.length) {
      setYtCandidateIndex(nextIdx);
      setActiveYtVideoId(candidates[nextIdx]);
      return;
    }

    setActiveYtVideoId(null);
    let previewUrl =
      track.previewUrl && !isExpiredDeezerPreviewUrl(track.previewUrl)
        ? track.previewUrl
        : '';

    if (!previewUrl) {
      const resolved = await resolvePreviewHybrid({
        query: `${track.artist.split(',')[0]} ${track.title}`,
        deezerId: track.deezerId,
        itunesId: track.itunesId,
      });
      previewUrl = resolved.previewUrl;
    }

    if (previewUrl && audioRef.current) {
      setActiveAudioSource(detectStreamKind(previewUrl));
      audioRef.current.src = previewUrl;
      audioRef.current.volume = isMuted ? 0 : volume;
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
      showToast(
        'Intégration YouTube restreinte par le label — bascule sur aperçu Apple/Deezer.'
      );
    } else {
      setActiveAudioSource('none');
      setIsPlaying(false);
      showToast(
        'Cette vidéo refuse l’intégration externe — essayez un lien « Topic / Lyrics » YouTube.'
      );
    }
  }, [currentTrackId, ytCandidateIndex, isMuted, volume, showToast]);

  const handlePlayTrack = useCallback(
    (track: Track, contextQueue?: Track[]) => {
      if (contextQueue && contextQueue.length > 0) {
        setQueueIds(contextQueue.map((t) => t.id));
      } else if (!queueIds.includes(track.id)) {
        setQueueIds((prev) => [track.id, ...prev]);
      }

      if (currentTrackId === track.id && activeAudioSource !== 'none') {
        if (activeAudioSource === 'youtube') {
          setIsPlaying((prev) => {
            const next = !prev;
            if (next) {
              setVideoDisplayMode((m) => (m === 'hidden' ? 'pip' : m));
            }
            return next;
          });
          return;
        }
        const audio = audioRef.current;
        if (audio && audio.src) {
          if (isPlaying) {
            audio.pause();
            setIsPlaying(false);
          } else {
            audio
              .play()
              .then(() => setIsPlaying(true))
              .catch(() => startPlaybackForTrack(track));
          }
          return;
        }
      }

      startPlaybackForTrack(track);
    },
    [
      currentTrackId,
      activeAudioSource,
      isPlaying,
      queueIds,
      startPlaybackForTrack,
    ]
  );

  const handleTogglePlay = useCallback(() => {
    if (!currentTrack) {
      if (likedTracks[0]) handlePlayTrack(likedTracks[0], likedTracks);
      else if (tracks[0]) handlePlayTrack(tracks[0], tracks);
      return;
    }

    if (activeAudioSource === 'youtube' && activeYtVideoId) {
      setIsPlaying((prev) => {
        const next = !prev;
        if (next) {
          setVideoDisplayMode((m) => (m === 'hidden' ? 'pip' : m));
        }
        return next;
      });
      return;
    }

    const audio = audioRef.current;
    if (!audio || !audio.src || activeAudioSource === 'none') {
      startPlaybackForTrack(currentTrack);
      return;
    }

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => startPlaybackForTrack(currentTrack));
    }
  }, [
    currentTrack,
    activeAudioSource,
    activeYtVideoId,
    isPlaying,
    likedTracks,
    tracks,
    handlePlayTrack,
    startPlaybackForTrack,
  ]);

  const handleNext = useCallback(() => {
    if (queueIds.length === 0) return;
    const curIdx = currentTrackId ? queueIds.indexOf(currentTrackId) : 0;
    const nextIdx = getNextTrackIndex(
      curIdx >= 0 ? curIdx : 0,
      queueIds.length,
      isShuffle,
      repeatMode === 'off' ? 'all' : repeatMode
    );
    if (nextIdx < 0) {
      setIsPlaying(false);
      return;
    }
    const nextTrack = tracksRef.current.find(
      (t) => t.id === queueIds[nextIdx]
    );
    if (nextTrack) startPlaybackForTrack(nextTrack);
  }, [queueIds, currentTrackId, isShuffle, repeatMode, startPlaybackForTrack]);

  const handlePrev = useCallback(() => {
    if (playbackTimeRef.current.currentSec > 3) {
      if (activeAudioSource === 'youtube') {
        setYtSeekRequest(0);
      } else if (audioRef.current) {
        audioRef.current.currentTime = 0;
      }
      playbackTimeRef.current.currentSec = 0;
      setCurrentTimeSec(0);
      return;
    }
    if (queueIds.length === 0) return;
    const curIdx = currentTrackId ? queueIds.indexOf(currentTrackId) : 0;
    const prevIdx = getPreviousTrackIndex(
      curIdx >= 0 ? curIdx : 0,
      queueIds.length,
      repeatMode
    );
    if (prevIdx < 0) return;
    const prevTrack = tracksRef.current.find(
      (t) => t.id === queueIds[prevIdx]
    );
    if (prevTrack) startPlaybackForTrack(prevTrack);
  }, [
    activeAudioSource,
    queueIds,
    currentTrackId,
    repeatMode,
    startPlaybackForTrack,
  ]);

  const handleTrackEnded = useCallback(() => {
    if (sleepOption === 'end-of-track') {
      setSleepOption(0);
      setIsPlaying(false);
      showToast('Fin du titre atteinte — mise en veille activée.');
      return;
    }

    if (repeatMode === 'one') {
      if (activeAudioSource === 'youtube') {
        setYtSeekRequest(0);
        setIsPlaying(true);
      } else if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => setIsPlaying(false));
      }
      return;
    }

    const curIdx = currentTrackId ? queueIds.indexOf(currentTrackId) : 0;
    const nextIdx = getNextTrackIndex(
      curIdx >= 0 ? curIdx : 0,
      queueIds.length,
      isShuffle,
      repeatMode
    );
    if (nextIdx < 0) {
      setIsPlaying(false);
      return;
    }
    const nextTrack = tracksRef.current.find(
      (t) => t.id === queueIds[nextIdx]
    );
    if (nextTrack) startPlaybackForTrack(nextTrack);
  }, [
    sleepOption,
    repeatMode,
    activeAudioSource,
    currentTrackId,
    queueIds,
    isShuffle,
    startPlaybackForTrack,
    showToast,
  ]);

  const handleSeek = useCallback(
    (newTime: number) => {
      playbackTimeRef.current.currentSec = newTime;
      setCurrentTimeSec(newTime);
      if (activeAudioSource === 'youtube') {
        setYtSeekRequest(newTime);
      } else if (audioRef.current) {
        audioRef.current.currentTime = newTime;
      }
    },
    [activeAudioSource]
  );

  // Library & Playlist Actions
  const handleToggleLike = useCallback((trackId: string) => {
    setTracks((prev) =>
      prev.map((t) => (t.id === trackId ? { ...t, liked: !t.liked } : t))
    );
  }, []);

  const handleCreatePlaylist = useCallback(
    (name: string, description: string) => {
      const newPlaylist: Playlist = {
        id: `pl-custom-${Date.now()}`,
        name,
        description: description || 'Playlist personnalisée SpotLocal',
        trackIds: [],
        createdAt: new Date().toISOString().slice(0, 10),
      };
      setPlaylists((prev) => [newPlaylist, ...prev]);
      setSelectedPlaylistId(newPlaylist.id);
      setActiveView('playlist');
      showToast(`Playlist « ${newPlaylist.name} » créée.`);
    },
    [showToast]
  );

  const handleDeletePlaylist = useCallback(
    (playlistId: string) => {
      const target = playlists.find((p) => p.id === playlistId);
      setPlaylists((prev) => prev.filter((p) => p.id !== playlistId));
      setActiveView('liked');
      setSelectedPlaylistId(null);
      if (target) showToast(`Playlist « ${target.name} » supprimée.`);
    },
    [playlists, showToast]
  );

  const handleAddTrackToPlaylist = useCallback(
    (trackId: string, playlistId: string) => {
      setPlaylists((prev) =>
        prev.map((pl) => {
          if (pl.id !== playlistId) return pl;
          if (pl.trackIds.includes(trackId)) return pl;
          return { ...pl, trackIds: [...pl.trackIds, trackId] };
        })
      );
      const plName = playlists.find((p) => p.id === playlistId)?.name;
      if (plName) showToast(`Ajouté à « ${plName} ».`);
    },
    [playlists, showToast]
  );

  const handleRemoveTrackFromPlaylist = useCallback(
    (trackId: string, playlistId: string) => {
      setPlaylists((prev) =>
        prev.map((pl) =>
          pl.id === playlistId
            ? { ...pl, trackIds: pl.trackIds.filter((id) => id !== trackId) }
            : pl
        )
      );
    },
    []
  );

  // Direct YouTube Share Link Handlers
  const handleAddYouTubeDrafts = useCallback(
    (
      drafts: YouTubeTrackDraft[],
      playlistId?: string,
      playImmediately = false
    ) => {
      if (drafts.length === 0) return;

      const addedTracks: Track[] = [];

      setTracks((prev) => {
        const updated = [...prev];
        for (const draft of drafts) {
          const existingIdx = updated.findIndex(
            (t) =>
              t.id === `yt-${draft.videoId}` ||
              t.youtubeVideoIds?.includes(draft.videoId)
          );
          if (existingIdx >= 0) {
            updated[existingIdx] = {
              ...updated[existingIdx],
              title: draft.title || updated[existingIdx].title,
              artist: draft.artist || updated[existingIdx].artist,
              liked: playlistId ? updated[existingIdx].liked : true,
              youtubeVideoIds: [
                draft.videoId,
                ...(updated[existingIdx].youtubeVideoIds || []).filter(
                  (id) => id !== draft.videoId
                ),
              ],
              sourceKind: 'youtube',
            };
            addedTracks.push(updated[existingIdx]);
          } else {
            const newTrack: Track = {
              id: `yt-${draft.videoId}`,
              title: draft.title,
              artist: draft.artist,
              album: 'YouTube Share',
              genre: 'YouTube',
              addedAt: "Aujourd'hui",
              durationSec: 210,
              durationLabel: '3:30',
              coverUrl: draft.coverUrl,
              previewUrl: '',
              explicit: false,
              liked: !playlistId,
              youtubeVideoIds: [draft.videoId],
              sourceKind: 'youtube',
            };
            updated.unshift(newTrack);
            addedTracks.push(newTrack);
          }
        }
        return updated;
      });

      if (playlistId && addedTracks.length > 0) {
        setPlaylists((prev) =>
          prev.map((pl) => {
            if (pl.id !== playlistId) return pl;
            const merged = [...pl.trackIds];
            for (const t of addedTracks) {
              if (!merged.includes(t.id)) merged.push(t.id);
            }
            return { ...pl, trackIds: merged };
          })
        );
      }

      if (playImmediately && addedTracks[0]) {
        const first = addedTracks[0];
        setQueueIds((prev) => [
          ...addedTracks.map((t) => t.id),
          ...prev.filter((id) => !addedTracks.some((a) => a.id === id)),
        ]);
        startPlaybackForTrack(first);
        showToast(`Lecture YouTube : « ${first.title} »`);
      } else {
        showToast(
          addedTracks.length === 1
            ? `« ${addedTracks[0].title} » ajouté avec son lien YouTube.`
            : `${addedTracks.length} titres YouTube ajoutés à la bibliothèque.`
        );
      }
    },
    [startPlaybackForTrack, showToast]
  );

  const handleAttachYouTubeToTrack = useCallback(
    (trackId: string, videoId: string, coverUrl?: string) => {
      let updatedTrack: Track | null = null;
      setTracks((prev) =>
        prev.map((t) => {
          if (t.id !== trackId) return t;
          updatedTrack = {
            ...t,
            coverUrl: t.coverUrl || coverUrl || '',
            youtubeVideoIds: [
              videoId,
              ...(t.youtubeVideoIds || []).filter((id) => id !== videoId),
            ],
            sourceKind: 'youtube',
          };
          return updatedTrack;
        })
      );

      if (updatedTrack && currentTrackId === trackId) {
        startPlaybackForTrack(updatedTrack);
      }
      showToast('Lien YouTube associé au titre avec succès !');
    },
    [currentTrackId, startPlaybackForTrack, showToast]
  );

  const handleQuickPasteYouTubeUrl = useCallback(
    async (rawUrl: string) => {
      const videoId = extractYouTubeVideoId(rawUrl, { allowRawId: true });
      if (!videoId) return;
      showToast('Résolution du lien YouTube…');
      const meta = await resolveYouTubeMetadataClient(videoId);
      handleAddYouTubeDrafts(
        [
          {
            videoId: meta.videoId,
            title: meta.title,
            artist: meta.artist,
            coverUrl: meta.coverUrl,
          },
        ],
        undefined,
        true
      );
    },
    [handleAddYouTubeDrafts, showToast]
  );

  // Search Result Actions (Apple iTunes & Deezer)
  const convertSearchResultToTrack = (
    item: SearchResultTrack,
    liked: boolean
  ): Track => ({
    id: item.externalId,
    title: item.title,
    artist: item.artist,
    album: item.album,
    genre: item.genre,
    releaseYear: item.releaseYear,
    addedAt: "Aujourd'hui",
    durationSec: item.durationSec,
    durationLabel: item.durationLabel,
    coverUrl: item.coverUrl,
    previewUrl: item.previewUrl,
    fallbackPreviewUrl: item.fallbackPreviewUrl,
    deezerId: item.deezerId,
    itunesId: item.itunesId,
    explicit: item.explicit,
    liked,
    youtubeVideoIds: item.youtubeVideoId ? [item.youtubeVideoId] : undefined,
    sourceKind: item.youtubeVideoId
      ? 'youtube'
      : item.source === 'deezer'
        ? 'deezer'
        : 'itunes',
  });

  const handlePlaySearchResult = useCallback(
    (item: SearchResultTrack) => {
      const existing = tracksRef.current.find((t) => t.id === item.externalId);
      const track = existing
        ? {
            ...existing,
            previewUrl: item.previewUrl || existing.previewUrl,
            fallbackPreviewUrl:
              item.fallbackPreviewUrl || existing.fallbackPreviewUrl,
            deezerId: item.deezerId ?? existing.deezerId,
            itunesId: item.itunesId ?? existing.itunesId,
          }
        : convertSearchResultToTrack(item, false);
      if (!existing) {
        setTracks((prev) => [track, ...prev]);
      }
      handlePlayTrack(track);
    },
    [handlePlayTrack]
  );

  const handleAddSearchResultToLibrary = useCallback(
    (item: SearchResultTrack, playlistId?: string) => {
      const exists = tracksRef.current.find((t) => t.id === item.externalId);
      if (!exists) {
        const newTrack = convertSearchResultToTrack(item, !playlistId);
        setTracks((prev) => [newTrack, ...prev]);
      } else if (!playlistId && !exists.liked) {
        handleToggleLike(exists.id);
      }

      if (playlistId) {
        handleAddTrackToPlaylist(item.externalId, playlistId);
      } else {
        showToast(`« ${item.title} » ajouté aux Titres likés.`);
      }
    },
    [handleAddTrackToPlaylist, handleToggleLike, showToast]
  );

  // Persistent Browser MP3 Import via IndexedDB
  const handleImportAudioFiles = useCallback(
    async (files: FileList) => {
      const audioFiles = Array.from(files).filter(
        (f) =>
          f.type.startsWith('audio/') ||
          /\.(mp3|wav|ogg|m4a|flac|aac|opus)$/i.test(f.name)
      );
      if (audioFiles.length === 0) {
        showToast('Aucun fichier audio reconnu.');
        return;
      }

      const importedTracks: Track[] = [];
      let matchedExistingCount = 0;

      for (const file of audioFiles) {
        const durSec = await readAudioDurationFromFile(file);
        const fileKey = `idb-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        try {
          await saveAudioBlob(fileKey, file);
        } catch {
          showToast('Impossible de stocker le fichier dans IndexedDB.');
          continue;
        }

        const matched = matchLocalFilenameToTrack(file.name, tracksRef.current);

        if (matched) {
          matchedExistingCount++;
          setTracks((prev) =>
            prev.map((t) =>
              t.id === matched.id
                ? {
                    ...t,
                    localFileKey: fileKey,
                    sourceKind: 'local-idb',
                    durationSec: durSec,
                    durationLabel: formatTime(durSec),
                  }
                : t
            )
          );
        } else {
          const meta = parseAudioFilename(file.name);
          const newId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
          importedTracks.push({
            id: newId,
            title: meta.title,
            artist: meta.artist,
            album: 'Fichiers locaux',
            genre: 'MP3 Local',
            addedAt: "Aujourd'hui",
            durationSec: durSec,
            durationLabel: formatTime(durSec),
            coverUrl: '',
            previewUrl: '',
            explicit: false,
            liked: true,
            localFileKey: fileKey,
            sourceKind: 'local-idb',
          });

          // Auto-enrich cover art from Apple Music / Deezer in the background
          if (meta.artist !== 'Fichier local') {
            resolvePreviewHybrid({ query: `${meta.artist} ${meta.title}` })
              .then((res) => {
                if (!res.coverUrl) return;
                setTracks((prev) =>
                  prev.map((t) =>
                    t.id === newId ? { ...t, coverUrl: res.coverUrl } : t
                  )
                );
              })
              .catch(() => {
                // Keep gradient fallback cover
              });
          }
        }
      }

      if (importedTracks.length > 0) {
        setTracks((prev) => [...importedTracks, ...prev]);
        startPlaybackForTrack(importedTracks[0]);
      }

      showToast(
        `${audioFiles.length} fichier(s) MP3 importés (${matchedExistingCount} associés).`
      );
    },
    [startPlaybackForTrack, showToast]
  );

  // Web JSON Backup Export & Restore
  const handleExportBackupJson = useCallback(() => {
    const trackOverrides: Record<string, Partial<Track>> = {};
    const customTracks: Track[] = [];

    for (const t of tracks) {
      if (SEED_IDS.has(t.id)) {
        const orig = SEED_MAP.get(t.id);
        const diff: Partial<Track> = {};
        if (orig && orig.liked !== t.liked) diff.liked = t.liked;
        if (t.youtubeVideoIds?.length) diff.youtubeVideoIds = t.youtubeVideoIds;
        if (t.deezerId) diff.deezerId = t.deezerId;
        if (t.itunesId) diff.itunesId = t.itunesId;
        if (Object.keys(diff).length > 0) trackOverrides[t.id] = diff;
      } else {
        customTracks.push({
          ...t,
          previewUrl: isTransientSignedStreamUrl(t.previewUrl)
            ? ''
            : t.previewUrl,
          fallbackPreviewUrl: undefined,
          localFileKey: undefined,
          localServerUrl: undefined,
        });
      }
    }

    const backup: SpotLocalBackupData = {
      version: 2,
      exportedAt: new Date().toISOString(),
      customTracks,
      trackOverrides,
      playlists,
      recentTrackIds,
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `spotlocal-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Sauvegarde JSON téléchargée !');
  }, [tracks, playlists, recentTrackIds, showToast]);

  const handleImportBackupJson = useCallback(
    async (file: File) => {
      try {
        const text = await file.text();
        const parsed = JSON.parse(text) as Partial<SpotLocalBackupData>;
        if (!parsed || typeof parsed !== 'object') {
          throw new Error('Invalid JSON');
        }

        const overrides = parsed.trackOverrides || {};
        const custom = Array.isArray(parsed.customTracks)
          ? parsed.customTracks
          : [];

        const restoredSeeds = SEED_TRACKS.map((seed) => {
          const ov = overrides[seed.id];
          return ov ? { ...seed, ...ov } : seed;
        });

        setTracks([...custom, ...restoredSeeds]);
        if (Array.isArray(parsed.playlists) && parsed.playlists.length > 0) {
          setPlaylists(parsed.playlists);
        }
        if (Array.isArray(parsed.recentTrackIds)) {
          setRecentTrackIds(parsed.recentTrackIds);
        }
        setShowImportModal(false);
        showToast('Bibliothèque restaurée depuis la sauvegarde JSON !');
      } catch {
        showToast('Fichier de sauvegarde JSON invalide.');
      }
    },
    [showToast]
  );

  const handleResetLibrary = useCallback(() => {
    for (const url of createdBlobUrlsRef.current) {
      URL.revokeObjectURL(url);
    }
    createdBlobUrlsRef.current = [];
    localStorage.removeItem(STORAGE_USER_STATE_KEY);
    localStorage.removeItem(STORAGE_PLAYLISTS_KEY);
    setTracks(SEED_TRACKS);
    setPlaylists(DEFAULT_PLAYLISTS);
    setRecentTrackIds([]);
    setActiveView('liked');
    setSelectedPlaylistId(null);
    setSelectedArtist(null);
    setShowImportModal(false);
    showToast('Bibliothèque réinitialisée aux valeurs par défaut.');
  }, [showToast]);

  // Global Drag-and-Drop MP3 Handler
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    if (e.dataTransfer.types.includes('Files')) {
      e.preventDefault();
      if (!isDraggingFiles) setIsDraggingFiles(true);
    }
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDraggingFiles(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingFiles(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleImportAudioFiles(e.dataTransfer.files);
    }
  };

  const handleToggleVideoMode = useCallback(() => {
    setVideoDisplayMode((prev) => (prev === 'theater' ? 'pip' : 'theater'));
  }, []);

  const handleCloseYouTubePlayer = useCallback(() => {
    setIsPlaying(false);
    setVideoDisplayMode('hidden');
  }, []);

  // Stable UI modal & navigation callbacks (prevents breaking React.memo on children)
  const goHome = useCallback(() => setActiveView('home'), []);
  const goLiked = useCallback(() => setActiveView('liked'), []);
  const goAllTracks = useCallback(() => setActiveView('all-tracks'), []);
  const goSearch = useCallback(() => setActiveView('search'), []);
  const openPlaylistView = useCallback((id: string) => {
    setSelectedPlaylistId(id);
    setActiveView('playlist');
  }, []);
  const openArtistView = useCallback((artistName: string) => {
    const clean = artistName.split(',')[0].trim();
    if (!clean) return;
    setSelectedArtist(clean);
    setActiveView('artist');
  }, []);
  const openYouTubeAddModal = useCallback(() => {
    setAttachTargetTrack(null);
    setShowYouTubeModal(true);
  }, []);
  const openYouTubeAttachModal = useCallback((track: Track) => {
    setAttachTargetTrack(track);
    setShowYouTubeModal(true);
  }, []);
  const openImportModal = useCallback(() => setShowImportModal(true), []);
  const openLegalModal = useCallback(() => setShowLegalModal(true), []);
  const openShortcutsModal = useCallback(() => setShowShortcutsModal(true), []);
  const openMobileDrawer = useCallback(() => setMobileMenuOpen(true), []);
  const closeMobileDrawer = useCallback(() => setMobileMenuOpen(false), []);
  const openCreatePlaylist = useCallback(
    () => setShowCreatePlaylistModal(true),
    []
  );
  const toggleShuffle = useCallback(() => setIsShuffle((prev) => !prev), []);
  const closeQueuePanel = useCallback(() => setShowQueuePanel(false), []);
  const removeFromQueue = useCallback((id: string) => {
    setQueueIds((prev) => prev.filter((qId) => qId !== id));
  }, []);

  // Media Session API (only updates when currentTrack or handlers change — NOT 4x/sec)
  useEffect(() => {
    if (!('mediaSession' in navigator) || !currentTrack) return;
    try {
      const artworkSrc = resolvePublicAssetUrl(currentTrack.coverUrl);
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title,
        artist: currentTrack.artist,
        album: currentTrack.album,
        artwork: artworkSrc
          ? [{ src: artworkSrc, sizes: '300x300', type: 'image/jpeg' }]
          : [],
      });
      navigator.mediaSession.setActionHandler('play', handleTogglePlay);
      navigator.mediaSession.setActionHandler('pause', handleTogglePlay);
      navigator.mediaSession.setActionHandler('previoustrack', handlePrev);
      navigator.mediaSession.setActionHandler('nexttrack', handleNext);
    } catch {
      // Ignore unsupported MediaSession environments
    }
  }, [currentTrack, handleTogglePlay, handlePrev, handleNext]);

  // Global Web Keyboard Shortcuts (reads playbackTimeRef so listener is NOT rebound 4x/sec)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setActiveView('search');
        searchInputRef.current?.focus();
        return;
      }

      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);

      if (e.key === 'Escape') {
        if (showYouTubeModal) setShowYouTubeModal(false);
        else if (showImportModal) setShowImportModal(false);
        else if (showLegalModal) setShowLegalModal(false);
        else if (showShortcutsModal) setShowShortcutsModal(false);
        else if (showCreatePlaylistModal) setShowCreatePlaylistModal(false);
        else if (videoDisplayMode === 'theater') setVideoDisplayMode('pip');
        return;
      }

      if (isInput) return;

      if (e.code === 'Space') {
        e.preventDefault();
        handleTogglePlay();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        const { currentSec, durationSec: dur } = playbackTimeRef.current;
        handleSeek(Math.min(dur || 300, currentSec + 5));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const { currentSec } = playbackTimeRef.current;
        handleSeek(Math.max(0, currentSec - 5));
      } else if (e.key === 'n' || e.key === 'N') {
        handleNext();
      } else if (e.key === 'p' || e.key === 'P') {
        handlePrev();
      } else if (e.key === 'm' || e.key === 'M') {
        setIsMuted((prev) => !prev);
      } else if (e.key === 's' || e.key === 'S') {
        setIsShuffle((prev) => !prev);
      } else if (e.key === 'r' || e.key === 'R') {
        setRepeatMode((prev) =>
          prev === 'off' ? 'all' : prev === 'all' ? 'one' : 'off'
        );
      } else if ((e.key === 'l' || e.key === 'L') && currentTrack) {
        handleToggleLike(currentTrack.id);
      } else if (e.key === 'y' || e.key === 'Y') {
        setAttachTargetTrack(null);
        setShowYouTubeModal(true);
      } else if (
        (e.key === 'v' || e.key === 'V') &&
        activeAudioSource === 'youtube'
      ) {
        handleToggleVideoMode();
      } else if (e.key === '/') {
        e.preventDefault();
        setActiveView('search');
        searchInputRef.current?.focus();
      } else if (e.key === '?') {
        setShowShortcutsModal((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    handleTogglePlay,
    handleSeek,
    handleNext,
    handlePrev,
    handleToggleLike,
    handleToggleVideoMode,
    currentTrack,
    activeAudioSource,
    videoDisplayMode,
    showYouTubeModal,
    showImportModal,
    showLegalModal,
    showShortcutsModal,
    showCreatePlaylistModal,
  ]);

  const localTrackCount = useMemo(
    () =>
      tracks.filter((t) => Boolean(t.localFileKey || t.localServerUrl)).length,
    [tracks]
  );
  const customTrackCount = useMemo(
    () => tracks.filter((t) => !SEED_IDS.has(t.id)).length,
    [tracks]
  );

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="h-screen w-screen overflow-hidden bg-black text-white flex flex-col select-none relative"
    >
      {/* Hidden HTML5 Audio Engine for local MP3s & Apple/Deezer streams */}
      <audio
        ref={audioRef}
        preload="metadata"
        onTimeUpdate={(e) => {
          if (activeAudioSource !== 'youtube') {
            updateCurrentTimeThrottled(e.currentTarget.currentTime);
          }
        }}
        onLoadedMetadata={(e) => {
          if (
            activeAudioSource !== 'youtube' &&
            Number.isFinite(e.currentTarget.duration) &&
            e.currentTarget.duration > 0
          ) {
            updateDuration(e.currentTarget.duration);
          }
        }}
        onEnded={() => {
          if (activeAudioSource !== 'youtube') {
            handleTrackEnded();
          }
        }}
        onPause={() => {
          if (activeAudioSource !== 'youtube') {
            setIsPlaying(false);
          }
        }}
        onPlay={() => {
          if (activeAudioSource !== 'youtube') {
            setIsPlaying(true);
          }
        }}
        onError={handleAudioStreamError}
      />

      {/* Persistent Zero-Reparenting YouTube IFrame Host */}
      <YouTubePlayerHost
        videoId={activeYtVideoId}
        active={activeAudioSource === 'youtube'}
        isPlaying={isPlaying}
        volumePercent={isMuted ? 0 : Math.round(volume * 100)}
        seekRequestSec={ytSeekRequest}
        displayMode={videoDisplayMode}
        trackTitle={currentTrack?.title}
        trackArtist={currentTrack?.artist}
        onDisplayModeChange={setVideoDisplayMode}
        onClosePlayer={handleCloseYouTubePlayer}
        onChangeYouTubeLink={
          currentTrack ? () => openYouTubeAttachModal(currentTrack) : undefined
        }
        onTimeUpdate={(cur, dur) => {
          updateCurrentTimeThrottled(cur);
          updateDuration(dur);
        }}
        onEnded={handleTrackEnded}
        onUnavailable={handleYouTubeUnavailable}
      />

      {/* Drag-and-Drop Overlay */}
      {isDraggingFiles && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm border-4 border-dashed border-[#1ED760] m-3 rounded-2xl flex flex-col items-center justify-center gap-3 pointer-events-none">
          <Upload className="w-14 h-14 text-[#1ED760]" />
          <p className="font-display font-bold text-2xl text-white">
            Déposez vos fichiers MP3 / Audio ici
          </p>
          <p className="text-sm text-[#b3b3b3]">
            Stockage persistant dans le navigateur (IndexedDB) — aucun envoi réseau
          </p>
        </div>
      )}

      {/* Top Navigation Bar */}
      <TopBar
        activeView={activeView}
        searchQuery={searchQuery}
        searchInputRef={searchInputRef}
        onSearchChange={setSearchQuery}
        onGoHome={goHome}
        onGoLiked={goLiked}
        onOpenSearch={goSearch}
        onOpenYouTubeModal={openYouTubeAddModal}
        onOpenImportModal={openImportModal}
        onOpenShortcutsModal={openShortcutsModal}
        onOpenLegalModal={openLegalModal}
        onOpenMobileMenu={openMobileDrawer}
      />

      {/* Main 3-Pane Workspace */}
      <div className="flex-1 min-h-0 flex gap-2 px-2 pb-2">
        <Sidebar
          activeView={activeView}
          selectedPlaylistId={selectedPlaylistId}
          selectedArtist={selectedArtist}
          likedCount={likedTracks.length}
          playlists={playlists}
          tracks={tracks}
          onSelectLiked={goLiked}
          onSelectAllTracks={goAllTracks}
          onSelectArtist={openArtistView}
          onSelectPlaylist={openPlaylistView}
          onCreatePlaylist={openCreatePlaylist}
          onOpenImportModal={openImportModal}
          onOpenYouTubeModal={openYouTubeAddModal}
          mobileOpen={mobileMenuOpen}
          onCloseMobile={closeMobileDrawer}
        />

        {/* Center Content View */}
        <Suspense
          fallback={
            <div className="flex-1 rounded-lg bg-[#121212] animate-pulse" />
          }
        >
          {activeView === 'home' && (
            <HomeView
              likedCount={likedTracks.length}
              playlists={playlists}
              tracks={tracks}
              recentTracks={recentTracks}
              currentTrackId={currentTrackId}
              isPlaying={isPlaying}
              onOpenLiked={goLiked}
              onOpenAllTracks={goAllTracks}
              onOpenPlaylist={openPlaylistView}
              onPlayTrack={handlePlayTrack}
              onPlaySearchResult={handlePlaySearchResult}
              onAddSearchResultToLibrary={handleAddSearchResultToLibrary}
              onQuickPasteYouTubeUrl={handleQuickPasteYouTubeUrl}
              onOpenYouTubeModal={openYouTubeAddModal}
              onOpenImportModal={openImportModal}
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
              onPlayLibraryTrack={handlePlayTrack}
              onPlaySearchResult={handlePlaySearchResult}
              onAddSearchResultToLibrary={handleAddSearchResultToLibrary}
              onAddYouTubeDrafts={handleAddYouTubeDrafts}
              onOpenYouTubeModal={openYouTubeAddModal}
            />
          )}
        </Suspense>

        {activeView === 'liked' && (
          <TrackListView
            headerType="liked"
            title="Titres likés"
            ownerName="SpotLocal"
            tracks={likedTracks}
            allPlaylists={playlists}
            currentTrackId={currentTrackId}
            isPlaying={isPlaying}
            isShuffle={isShuffle}
            onPlayAll={() => {
              if (
                isPlaying &&
                likedTracks.some((t) => t.id === currentTrackId)
              ) {
                handleTogglePlay();
              } else if (likedTracks[0]) {
                handlePlayTrack(likedTracks[0], likedTracks);
              }
            }}
            onToggleShuffle={toggleShuffle}
            onPlayTrack={handlePlayTrack}
            onPlayTrackInContext={handlePlayTrack}
            onToggleLike={handleToggleLike}
            onAddTrackToPlaylist={handleAddTrackToPlaylist}
            onAttachYouTubeLink={openYouTubeAttachModal}
            onSelectArtist={openArtistView}
            onOpenImportModal={openImportModal}
          />
        )}

        {activeView === 'all-tracks' && (
          <TrackListView
            headerType="all"
            title="Toutes les musiques"
            subtitle="L’intégralité de votre catalogue local, liens YouTube et sélections"
            ownerName="SpotLocal"
            coverUrl={tracks[0]?.coverUrl}
            tracks={tracks}
            allPlaylists={playlists}
            currentTrackId={currentTrackId}
            isPlaying={isPlaying}
            isShuffle={isShuffle}
            onPlayAll={() => {
              if (isPlaying && tracks.some((t) => t.id === currentTrackId)) {
                handleTogglePlay();
              } else if (tracks[0]) {
                handlePlayTrack(tracks[0], tracks);
              }
            }}
            onToggleShuffle={toggleShuffle}
            onPlayTrack={handlePlayTrack}
            onPlayTrackInContext={handlePlayTrack}
            onToggleLike={handleToggleLike}
            onAddTrackToPlaylist={handleAddTrackToPlaylist}
            onAttachYouTubeLink={openYouTubeAttachModal}
            onSelectArtist={openArtistView}
            onOpenImportModal={openImportModal}
          />
        )}

        {activeView === 'artist' && selectedArtist && (
          <TrackListView
            headerType="artist"
            title={selectedArtist}
            subtitle={`Titres de ${selectedArtist} dans votre bibliothèque`}
            ownerName="SpotLocal"
            coverUrl={selectedArtistTracks[0]?.coverUrl}
            tracks={selectedArtistTracks}
            allPlaylists={playlists}
            currentTrackId={currentTrackId}
            isPlaying={isPlaying}
            isShuffle={isShuffle}
            onPlayAll={() => {
              if (
                isPlaying &&
                selectedArtistTracks.some((t) => t.id === currentTrackId)
              ) {
                handleTogglePlay();
              } else if (selectedArtistTracks[0]) {
                handlePlayTrack(selectedArtistTracks[0], selectedArtistTracks);
              }
            }}
            onToggleShuffle={toggleShuffle}
            onPlayTrack={handlePlayTrack}
            onPlayTrackInContext={handlePlayTrack}
            onToggleLike={handleToggleLike}
            onAddTrackToPlaylist={handleAddTrackToPlaylist}
            onAttachYouTubeLink={openYouTubeAttachModal}
            onSelectArtist={openArtistView}
            onOpenImportModal={openImportModal}
          />
        )}

        {activeView === 'playlist' && selectedPlaylist && (
          <TrackListView
            headerType="playlist"
            title={selectedPlaylist.name}
            subtitle={selectedPlaylist.description}
            ownerName="SpotLocal"
            coverUrl={selectedPlaylist.coverUrl}
            tracks={selectedPlaylistTracks}
            allPlaylists={playlists}
            currentPlaylistId={selectedPlaylist.id}
            currentTrackId={currentTrackId}
            isPlaying={isPlaying}
            isShuffle={isShuffle}
            onPlayAll={() => {
              if (
                isPlaying &&
                selectedPlaylistTracks.some((t) => t.id === currentTrackId)
              ) {
                handleTogglePlay();
              } else if (selectedPlaylistTracks[0]) {
                handlePlayTrack(
                  selectedPlaylistTracks[0],
                  selectedPlaylistTracks
                );
              }
            }}
            onToggleShuffle={toggleShuffle}
            onPlayTrack={handlePlayTrack}
            onPlayTrackInContext={handlePlayTrack}
            onToggleLike={handleToggleLike}
            onAddTrackToPlaylist={handleAddTrackToPlaylist}
            onRemoveTrackFromPlaylist={(trackId) =>
              handleRemoveTrackFromPlaylist(trackId, selectedPlaylist.id)
            }
            onDeletePlaylist={() => handleDeletePlaylist(selectedPlaylist.id)}
            onAttachYouTubeLink={openYouTubeAttachModal}
            onSelectArtist={openArtistView}
            onOpenImportModal={openImportModal}
          />
        )}

        {/* Right Now Playing & Queue Panel */}
        {showQueuePanel && (
          <RightQueuePanel
            currentTrack={currentTrack}
            upcomingTracks={upcomingTracks}
            isPlaying={isPlaying}
            activeAudioSource={activeAudioSource}
            videoDisplayMode={videoDisplayMode}
            onToggleVideoMode={handleToggleVideoMode}
            onAttachYouTubeLink={openYouTubeAttachModal}
            onPlayFromQueue={handlePlayTrack}
            onRemoveFromQueue={removeFromQueue}
            onSelectArtist={openArtistView}
            onClose={closeQueuePanel}
          />
        )}
      </div>

      {/* Bottom Persistent Player Bar */}
      <PlayerBar
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        isLoadingAudio={isLoadingAudio}
        isShuffle={isShuffle}
        repeatMode={repeatMode}
        currentTimeSec={currentTimeSec}
        durationSec={durationSec}
        volume={volume}
        isMuted={isMuted}
        showQueuePanel={showQueuePanel}
        activeAudioSource={activeAudioSource}
        videoDisplayMode={videoDisplayMode}
        sleepTimerRemainingMin={sleepRemainingMin}
        activeSleepOption={sleepOption}
        onTogglePlay={handleTogglePlay}
        onPrev={handlePrev}
        onNext={handleNext}
        onToggleShuffle={toggleShuffle}
        onCycleRepeat={() =>
          setRepeatMode((prev) =>
            prev === 'off' ? 'all' : prev === 'all' ? 'one' : 'off'
          )
        }
        onSeek={handleSeek}
        onVolumeChange={(v) => {
          setVolume(v);
          if (v > 0 && isMuted) setIsMuted(false);
        }}
        onToggleMute={() => setIsMuted((prev) => !prev)}
        onToggleLike={handleToggleLike}
        onToggleQueuePanel={() => setShowQueuePanel((prev) => !prev)}
        onToggleVideoMode={handleToggleVideoMode}
        onAttachYouTubeLink={openYouTubeAttachModal}
        onSelectSleepTimer={handleSelectSleepTimer}
        onSelectArtist={openArtistView}
      />

      {/* Mobile Bottom Navigation Bar (< lg) */}
      <nav
        aria-label="Navigation mobile"
        className="lg:hidden h-13 bg-[#0a0a0a] border-t border-white/[0.08] grid grid-cols-5 items-center shrink-0 z-20"
      >
        <button
          type="button"
          onClick={goHome}
          className={`flex flex-col items-center justify-center gap-0.5 py-1.5 text-[10px] font-medium cursor-pointer ${
            activeView === 'home' ? 'text-white' : 'text-[#9e9e9e]'
          }`}
        >
          <Home className="w-4 h-4" />
          <span>Accueil</span>
        </button>
        <button
          type="button"
          onClick={goSearch}
          className={`flex flex-col items-center justify-center gap-0.5 py-1.5 text-[10px] font-medium cursor-pointer ${
            activeView === 'search' ? 'text-white' : 'text-[#9e9e9e]'
          }`}
        >
          <Search className="w-4 h-4" />
          <span>Recherche</span>
        </button>
        <button
          type="button"
          onClick={goLiked}
          className={`flex flex-col items-center justify-center gap-0.5 py-1.5 text-[10px] font-medium cursor-pointer ${
            activeView === 'liked' ? 'text-white' : 'text-[#9e9e9e]'
          }`}
        >
          <Heart className="w-4 h-4" />
          <span>Likés</span>
        </button>
        <button
          type="button"
          onClick={goAllTracks}
          className={`flex flex-col items-center justify-center gap-0.5 py-1.5 text-[10px] font-medium cursor-pointer ${
            activeView === 'all-tracks' ? 'text-white' : 'text-[#9e9e9e]'
          }`}
        >
          <Disc3 className="w-4 h-4" />
          <span>Catalogue</span>
        </button>
        <button
          type="button"
          onClick={openYouTubeAddModal}
          className="flex flex-col items-center justify-center gap-0.5 py-1.5 text-[10px] font-semibold text-[#1ED760] cursor-pointer"
        >
          <Youtube className="w-4 h-4 fill-current" />
          <span>Lien YT</span>
        </button>
      </nav>

      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          className="fixed bottom-26 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-lg bg-[#2b69e6] text-white text-xs sm:text-sm font-semibold shadow-2xl border border-white/15"
        >
          {toastMessage}
        </div>
      )}

      {/* Lazy-Loaded Modals (only downloaded when opened) */}
      <Suspense fallback={null}>
        {showYouTubeModal && (
          <YouTubeLinkModal
            playlists={playlists}
            targetTrack={attachTargetTrack}
            onClose={() => {
              setShowYouTubeModal(false);
              setAttachTargetTrack(null);
            }}
            onAddTracks={handleAddYouTubeDrafts}
            onAttachVideoToTrack={handleAttachYouTubeToTrack}
          />
        )}

        {showCreatePlaylistModal && (
          <CreatePlaylistModal
            onCreate={handleCreatePlaylist}
            onClose={() => setShowCreatePlaylistModal(false)}
          />
        )}

        {showImportModal && (
          <LocalExeModal
            open={showImportModal}
            localTrackCount={localTrackCount}
            customTrackCount={customTrackCount}
            onClose={() => setShowImportModal(false)}
            onImportAudioFiles={handleImportAudioFiles}
            onExportBackupJson={handleExportBackupJson}
            onImportBackupJson={handleImportBackupJson}
            onResetLibrary={handleResetLibrary}
          />
        )}

        {showLegalModal && (
          <LegalOpenSourceModal
            open={showLegalModal}
            onClose={() => setShowLegalModal(false)}
          />
        )}

        {showShortcutsModal && (
          <KeyboardShortcutsModal
            onClose={() => setShowShortcutsModal(false)}
          />
        )}
      </Suspense>
    </div>
  );
}
