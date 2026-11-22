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
import { Disc3, Heart, Home, Radio, Search, Upload } from 'lucide-react';
import { DEFAULT_PLAYLISTS, SEED_TRACKS } from './data/initialLibrary';
import type {
  ActiveView,
  AudioSourceKind,
  Playlist,
  RepeatMode,
  SleepTimerOption,
  SpotLocalBackupData,
  Track,
} from './types/music';
import {
  catalogStore,
  type UserLibraryOverlay,
} from './utils/catalogEngine';
import {
  extractYouTubeVideoId,
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
import {
  hasLocalBackend,
  markLocalBackendAbsent,
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
const MoodsView = lazy(() =>
  import('./components/MoodsView').then((m) => ({ default: m.MoodsView }))
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

const STORAGE_USER_STATE_KEY = 'spotlocal_user_state_v4';
const STORAGE_PLAYLISTS_KEY = 'spotlocal_playlists_v4';
const STORAGE_VOLUME_KEY = 'spotlocal_volume_v1';

interface PersistedUserStateV4 {
  likedIds: string[];
  trackOverrides: Record<string, Partial<Track>>;
  customTracks: Track[];
  recentTrackIds: string[];
}

function loadInitialUserState(): {
  likedIds: Set<string>;
  trackOverrides: Record<string, Partial<Track>>;
  customTracks: Track[];
  recentIds: string[];
} {
  try {
    // Purge legacy storage keys
    localStorage.removeItem('spotlocal_tracks_v1');
    localStorage.removeItem('spotlocal_user_state_v2');
    localStorage.removeItem('spotlocal_playlists_v2');

    const raw =
      localStorage.getItem(STORAGE_USER_STATE_KEY) ||
      localStorage.getItem('spotlocal_user_state_v3');
    if (!raw) {
      return {
        likedIds: new Set(),
        trackOverrides: {},
        customTracks: [],
        recentIds: [],
      };
    }

    const parsed = JSON.parse(raw) as Partial<PersistedUserStateV4>;
    const likedSet = new Set<string>(
      Array.isArray(parsed.likedIds) ? parsed.likedIds : []
    );
    const overrides = parsed.trackOverrides || {};
    for (const [id, ov] of Object.entries(overrides)) {
      if (ov?.liked) likedSet.add(id);
    }

    const customTracks = Array.isArray(parsed.customTracks)
      ? parsed.customTracks.filter((t) => t && t.id)
      : [];
    for (const c of customTracks) {
      if (c.liked) likedSet.add(c.id);
    }

    return {
      likedIds: likedSet,
      trackOverrides: overrides,
      customTracks,
      recentIds: Array.isArray(parsed.recentTrackIds)
        ? parsed.recentTrackIds.slice(0, 15)
        : [],
    };
  } catch {
    return {
      likedIds: new Set(),
      trackOverrides: {},
      customTracks: [],
      recentIds: [],
    };
  }
}

function loadInitialPlaylists(): Playlist[] {
  try {
    const raw =
      localStorage.getItem(STORAGE_PLAYLISTS_KEY) ||
      localStorage.getItem('spotlocal_playlists_v3');
    if (raw) {
      const parsed = JSON.parse(raw) as Playlist[];
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // Ignore
  }
  return DEFAULT_PLAYLISTS;
}

export default function App() {
  const initial = useMemo(() => loadInitialUserState(), []);

  // O(1) User State Overlay on top of the 112,000-track Columnar Catalog
  const [likedIds, setLikedIds] = useState<Set<string>>(initial.likedIds);
  const [trackOverrides, setTrackOverrides] = useState<
    Record<string, Partial<Track>>
  >(initial.trackOverrides);
  const [customTracks, setCustomTracks] = useState<Track[]>(
    initial.customTracks
  );
  const [recentTrackIds, setRecentTrackIds] = useState<string[]>(
    initial.recentIds
  );
  const [playlists, setPlaylists] = useState<Playlist[]>(loadInitialPlaylists);

  // Progressive 112k Catalog Sync State
  const [catalogVersion, setCatalogVersion] = useState(0);
  const [isCatalogSyncing, setIsCatalogSyncing] = useState(
    !catalogStore.isFullyLoaded()
  );

  useEffect(() => {
    let active = true;
    catalogStore
      .loadExtendedShards(() => {
        if (active) setCatalogVersion((v) => v + 1);
      })
      .finally(() => {
        if (active) {
          setIsCatalogSyncing(false);
          setCatalogVersion((v) => v + 1);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const overlay = useMemo<UserLibraryOverlay>(
    () => ({
      customTracks,
      likedIds,
      trackOverrides,
    }),
    [customTracks, likedIds, trackOverrides]
  );
  const overlayRef = useRef<UserLibraryOverlay>(overlay);
  overlayRef.current = overlay;

  const catalogCount = useMemo(() => {
    void catalogVersion;
    return catalogStore.getCatalogCount() + customTracks.length;
  }, [catalogVersion, customTracks.length]);

  const artistCount = useMemo(() => {
    void catalogVersion;
    return catalogStore.getArtistCount();
  }, [catalogVersion]);

  const totalHours = useMemo(() => {
    void catalogVersion;
    return catalogStore.getTotalDurationHours();
  }, [catalogVersion]);

  // Navigation State (clean first-visit starts on Home)
  const [activeView, setActiveView] = useState<ActiveView>('home');
  const [allTracksGenre, setAllTracksGenre] = useState<string>('all');
  const [allTracksMoodBit, setAllTracksMoodBit] = useState<number>(0);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(
    null
  );
  const [selectedArtist, setSelectedArtist] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const [showQueuePanel, setShowQueuePanel] = useState<boolean>(false);
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

  // Playback State (idle on first visit)
  const [queueIds, setQueueIds] = useState<string[]>([]);
  const [currentTrackId, setCurrentTrackId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('off');
  const [currentTimeSec, setCurrentTimeSec] = useState(0);
  const [durationSec, setDurationSec] = useState(0);

  const playbackTimeRef = useRef({ currentSec: 0, durationSec: 0 });

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

  // Lightweight O(liked + custom) persistence (~1 KB!)
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const payload: PersistedUserStateV4 = {
          likedIds: Array.from(likedIds),
          trackOverrides,
          customTracks: customTracks.map((t) => ({
            ...t,
            localServerUrl: undefined,
          })),
          recentTrackIds,
        };
        localStorage.setItem(STORAGE_USER_STATE_KEY, JSON.stringify(payload));
      } catch {
        // Ignore quota errors
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [likedIds, trackOverrides, customTracks, recentTrackIds]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_PLAYLISTS_KEY, JSON.stringify(playlists));
    } catch {
      // Ignore
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

  // Auto-scan server /music folder once on boot (local Node/Electron mode)
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
          const addedDiskTracks: Track[] = [];
          for (const file of data.files) {
            const meta = parseAudioFilename(file.filename);
            addedDiskTracks.push({
              id: `disk-${file.filename}`,
              title: meta.title,
              artist: meta.artist,
              album: 'Dossier /music',
              genre: 'MP3 Local',
              addedAt: 'Dossier /music',
              durationSec: 210,
              durationLabel: '3:30',
              coverUrl: '',
              previewUrl: '',
              explicit: false,
              liked: false,
              localServerUrl: file.url,
              sourceKind: 'local-folder',
            });
          }
          if (addedDiskTracks.length > 0) {
            setCustomTracks((prev) => {
              const existing = new Set(prev.map((t) => t.id));
              return [
                ...addedDiskTracks.filter((t) => !existing.has(t.id)),
                ...prev,
              ];
            });
            showToast(
              `${addedDiskTracks.length} fichier(s) du dossier /music chargés.`
            );
          }
        }
      )
      .catch(() => {
        // Ignore on static hosting
      });

    return () => {
      cancelled = true;
    };
  }, [showToast]);

  // Sleep Timer countdown
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

  // O(k) Hydrated Views
  const likedTracks = useMemo(() => {
    void catalogVersion;
    return catalogStore.getLikedTracks(overlay);
  }, [overlay, catalogVersion]);

  const recentTracks = useMemo(() => {
    void catalogVersion;
    return catalogStore.getTracksByIds(recentTrackIds, overlay);
  }, [recentTrackIds, overlay, catalogVersion]);

  const currentTrack = useMemo(() => {
    void catalogVersion;
    return currentTrackId
      ? catalogStore.getTrackById(currentTrackId, overlay)
      : null;
  }, [currentTrackId, overlay, catalogVersion]);

  const selectedPlaylist = useMemo(
    () => playlists.find((p) => p.id === selectedPlaylistId) ?? null,
    [playlists, selectedPlaylistId]
  );

  const selectedPlaylistTracks = useMemo(() => {
    void catalogVersion;
    if (!selectedPlaylist) return [];
    return catalogStore.getTracksByIds(selectedPlaylist.trackIds, overlay);
  }, [selectedPlaylist, overlay, catalogVersion]);

  const upcomingTracks = useMemo(() => {
    void catalogVersion;
    if (!currentTrackId || queueIds.length === 0) return [];
    const idx = queueIds.indexOf(currentTrackId);
    const orderedIds =
      idx >= 0
        ? [
            ...queueIds.slice(idx + 1, idx + 25),
            ...(queueIds.length - (idx + 1) < 24
              ? queueIds.slice(
                  0,
                  Math.min(idx, 24 - (queueIds.length - (idx + 1)))
                )
              : []),
          ]
        : queueIds.slice(0, 24);
    return catalogStore.getTracksByIds(orderedIds, overlay);
  }, [queueIds, currentTrackId, overlay, catalogVersion]);

  // Full-Length Playback Engine (Local MP3 -> YouTube IFrame)
  const startPlaybackForTrack = useCallback(
    async (track: Track) => {
      const requestId = ++playbackRequestIdRef.current;
      const audio = audioRef.current;
      if (!audio) return;

      setCurrentTrackId(track.id);
      playbackTimeRef.current = {
        currentSec: 0,
        durationSec: track.durationSec,
      };
      setCurrentTimeSec(0);
      setDurationSec(track.durationSec);
      setYtSeekRequest(null);

      setRecentTrackIds((prev) =>
        [track.id, ...prev.filter((id) => id !== track.id)].slice(0, 15)
      );

      // 1A. Browser IndexedDB MP3
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
          // Fall through
        }
        setIsLoadingAudio(false);
      }

      // 1B. Local /music Folder MP3
      if (track.localServerUrl) {
        setActiveYtVideoId(null);
        setActiveAudioSource('local-folder');
        setIsLoadingAudio(true);
        audio.src = track.localServerUrl;
        audio.volume = isMuted ? 0 : volume;
        try {
          await audio.play();
          if (requestId === playbackRequestIdRef.current) setIsPlaying(true);
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

      audio.pause();

      // 2. Full-Length YouTube IFrame Playback
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
              setTrackOverrides((prev) => ({
                ...prev,
                [track.id]: { ...prev[track.id], youtubeVideoIds: ytCandidates },
              }));
            }
          }
        } catch {
          // Ignore
        }
      }

      if (requestId !== playbackRequestIdRef.current) return;
      setIsLoadingAudio(false);

      if (ytCandidates.length > 0) {
        setYtCandidateIndex(0);
        setActiveYtVideoId(ytCandidates[0]);
        setActiveAudioSource('youtube');
        setVideoDisplayMode((prev) => (prev === 'hidden' ? 'pip' : prev));
        setIsPlaying(true);
        return;
      }

      setIsPlaying(false);
      setActiveAudioSource('none');
      showToast(
        `Aucun lien YouTube sur « ${track.title} » — associez-en un via (•••).`
      );
    },
    [isMuted, volume, showToast]
  );

  // Automatic failover to backup YouTube ID (e.g. Topic ATV <-> OMV)
  const handleYouTubeUnavailable = useCallback(() => {
    if (!currentTrackId) return;
    const track = catalogStore.getTrackById(currentTrackId, overlayRef.current);
    if (!track) return;

    const candidates = track.youtubeVideoIds || [];
    const nextIdx = ytCandidateIndex + 1;
    if (nextIdx < candidates.length) {
      setYtCandidateIndex(nextIdx);
      setActiveYtVideoId(candidates[nextIdx]);
      return;
    }

    // If in a multi-track radio/queue, automatically advance to next playable song!
    if (queueIds.length > 1) {
      const curIdx = queueIds.indexOf(currentTrackId);
      const nextQueueIdx = (curIdx + 1) % queueIds.length;
      const nextTrack = catalogStore.getTrackById(
        queueIds[nextQueueIdx],
        overlayRef.current
      );
      if (nextTrack && nextTrack.id !== track.id) {
        showToast(
          `« ${track.title} » est restreint hors YouTube — passage au titre suivant.`
        );
        startPlaybackForTrack(nextTrack);
        return;
      }
    }

    setActiveYtVideoId(null);
    setActiveAudioSource('none');
    setIsPlaying(false);
    showToast(
      `Le label de « ${track.title} » limite l’intégration externe — essayez un autre titre ou collez un lien alternatif.`
    );
  }, [currentTrackId, ytCandidateIndex, queueIds, startPlaybackForTrack, showToast]);

  const handlePlayTrack = useCallback(
    (track: Track, contextQueue?: Track[]) => {
      if (contextQueue && contextQueue.length > 0) {
        const sliced =
          contextQueue.length > 300
            ? contextQueue.slice(0, 300)
            : contextQueue;
        setQueueIds(sliced.map((t) => t.id));
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

  const handlePlaySmartMix = useCallback(
    (genre?: string, moodBit?: number, label?: string) => {
      const sample = catalogStore.sampleRandomMix(
        { genre, moodBit, count: 60 },
        overlayRef.current
      );
      if (sample.length === 0) return;
      setQueueIds(sample.map((t) => t.id));
      startPlaybackForTrack(sample[0]);
      showToast(
        label
          ? `Radio « ${label} » lancée (60 titres intégraux)`
          : genre && genre !== 'all'
            ? `Mix « ${genre} » lancé (60 titres intégraux)`
            : 'Mix Intelligent lancé (60 titres intégraux)'
      );
    },
    [startPlaybackForTrack, showToast]
  );

  const handleTogglePlay = useCallback(() => {
    if (!currentTrack) {
      handlePlaySmartMix();
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
    handlePlaySmartMix,
    startPlaybackForTrack,
  ]);

  const handleNext = useCallback(() => {
    if (queueIds.length === 0) {
      handlePlaySmartMix();
      return;
    }
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
    const nextTrack = catalogStore.getTrackById(
      queueIds[nextIdx],
      overlayRef.current
    );
    if (nextTrack) startPlaybackForTrack(nextTrack);
  }, [
    queueIds,
    currentTrackId,
    isShuffle,
    repeatMode,
    handlePlaySmartMix,
    startPlaybackForTrack,
  ]);

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
    const prevTrack = catalogStore.getTrackById(
      queueIds[prevIdx],
      overlayRef.current
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
    const nextTrack = catalogStore.getTrackById(
      queueIds[nextIdx],
      overlayRef.current
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

  // O(1) Like Toggle!
  const handleToggleLike = useCallback((trackId: string) => {
    setLikedIds((prev) => {
      const next = new Set(prev);
      if (next.has(trackId)) next.delete(trackId);
      else next.add(trackId);
      return next;
    });
  }, []);

  // Playlist Actions
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
      setActiveView('home');
      setSelectedPlaylistId(null);
      if (target) showToast(`Playlist « ${target.name} » supprimée.`);
    },
    [playlists, showToast]
  );

  const handleAddTrackToPlaylist = useCallback(
    (trackId: string, playlistId: string) => {
      const track = catalogStore.getTrackById(trackId, overlayRef.current);
      setPlaylists((prev) =>
        prev.map((pl) => {
          if (pl.id !== playlistId) return pl;
          if (pl.trackIds.includes(trackId)) return pl;
          return {
            ...pl,
            coverUrl: pl.coverUrl || track?.coverUrl,
            trackIds: [...pl.trackIds, trackId],
          };
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

  // Direct YouTube Link Handlers
  const handleAddYouTubeDrafts = useCallback(
    (
      drafts: YouTubeTrackDraft[],
      playlistId?: string,
      playImmediately = false
    ) => {
      if (drafts.length === 0) return;

      const resolvedTracks: Track[] = [];
      const newCustoms: Track[] = [];
      const newLikes: string[] = [];

      for (const draft of drafts) {
        const existingInCatalog = catalogStore.findTrackByVideoId(
          draft.videoId,
          overlayRef.current
        );
        if (existingInCatalog) {
          resolvedTracks.push(existingInCatalog);
          if (!playlistId) newLikes.push(existingInCatalog.id);
        } else {
          const newTrack: Track = {
            id: `yt-custom-${draft.videoId}`,
            title: draft.title,
            artist: draft.artist,
            album: 'Import YouTube',
            genre: 'Pop',
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
          newCustoms.push(newTrack);
          resolvedTracks.push(newTrack);
          if (!playlistId) newLikes.push(newTrack.id);
        }
      }

      if (newCustoms.length > 0) {
        setCustomTracks((prev) => {
          const seen = new Set(prev.map((t) => t.id));
          return [...newCustoms.filter((t) => !seen.has(t.id)), ...prev];
        });
      }

      if (newLikes.length > 0) {
        setLikedIds((prev) => {
          const next = new Set(prev);
          for (const id of newLikes) next.add(id);
          return next;
        });
      }

      if (playlistId && resolvedTracks.length > 0) {
        setPlaylists((prev) =>
          prev.map((pl) => {
            if (pl.id !== playlistId) return pl;
            const merged = [...pl.trackIds];
            for (const t of resolvedTracks) {
              if (!merged.includes(t.id)) merged.push(t.id);
            }
            return {
              ...pl,
              coverUrl: pl.coverUrl || resolvedTracks[0]?.coverUrl,
              trackIds: merged,
            };
          })
        );
      }

      if (playImmediately && resolvedTracks[0]) {
        const first = resolvedTracks[0];
        setQueueIds((prev) => [
          ...resolvedTracks.map((t) => t.id),
          ...prev.filter((id) => !resolvedTracks.some((a) => a.id === id)),
        ]);
        startPlaybackForTrack(first);
        showToast(`Lecture YouTube intégrale : « ${first.title} »`);
      } else {
        showToast(
          resolvedTracks.length === 1
            ? `« ${resolvedTracks[0].title} » ajouté à vos favoris.`
            : `${resolvedTracks.length} titres YouTube ajoutés.`
        );
      }
    },
    [startPlaybackForTrack, showToast]
  );

  const handleAttachYouTubeToTrack = useCallback(
    (trackId: string, videoId: string, coverUrl?: string) => {
      if (catalogStore.hasCatalogId(trackId)) {
        const current = catalogStore.getTrackById(trackId, overlayRef.current);
        const mergedVids = [
          videoId,
          ...(current?.youtubeVideoIds || []).filter((id) => id !== videoId),
        ];
        setTrackOverrides((prev) => ({
          ...prev,
          [trackId]: {
            ...prev[trackId],
            coverUrl: coverUrl || current?.coverUrl,
            youtubeVideoIds: mergedVids,
          },
        }));
        if (current && currentTrackId === trackId) {
          startPlaybackForTrack({
            ...current,
            coverUrl: coverUrl || current.coverUrl,
            youtubeVideoIds: mergedVids,
          });
        }
      } else {
        setCustomTracks((prev) =>
          prev.map((t) =>
            t.id === trackId
              ? {
                  ...t,
                  coverUrl: coverUrl || t.coverUrl,
                  youtubeVideoIds: [
                    videoId,
                    ...(t.youtubeVideoIds || []).filter((id) => id !== videoId),
                  ],
                  sourceKind: 'youtube',
                }
              : t
          )
        );
      }
      showToast('Lien YouTube mis à jour avec succès !');
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

  // Browser MP3 Import via IndexedDB
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

        const matched = matchLocalFilenameToTrack(file.name, SEED_TRACKS);
        if (matched) {
          matchedExistingCount++;
          setTrackOverrides((prev) => ({
            ...prev,
            [matched.id]: {
              ...prev[matched.id],
              localFileKey: fileKey,
              sourceKind: 'local-idb',
              durationSec: durSec,
              durationLabel: formatTime(durSec),
            },
          }));
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
        }
      }

      if (importedTracks.length > 0) {
        setCustomTracks((prev) => [...importedTracks, ...prev]);
        setLikedIds((prev) => {
          const next = new Set(prev);
          for (const t of importedTracks) next.add(t.id);
          return next;
        });
        startPlaybackForTrack(importedTracks[0]);
      }

      showToast(
        `${audioFiles.length} fichier(s) MP3 importés (${matchedExistingCount} associés).`
      );
    },
    [startPlaybackForTrack, showToast]
  );

  // JSON Backup Export & Restore
  const handleExportBackupJson = useCallback(() => {
    const backup: SpotLocalBackupData = {
      version: 3,
      exportedAt: new Date().toISOString(),
      customTracks: customTracks.map((t) => ({
        ...t,
        localFileKey: undefined,
        localServerUrl: undefined,
      })),
      likedIds: Array.from(likedIds),
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
  }, [customTracks, likedIds, trackOverrides, playlists, recentTrackIds, showToast]);

  const handleImportBackupJson = useCallback(
    async (file: File) => {
      try {
        const text = await file.text();
        const parsed = JSON.parse(text) as Partial<SpotLocalBackupData>;
        if (!parsed || typeof parsed !== 'object') {
          throw new Error('Invalid JSON');
        }
        if (Array.isArray(parsed.customTracks)) {
          setCustomTracks(parsed.customTracks);
        }
        if (Array.isArray(parsed.likedIds)) {
          setLikedIds(new Set(parsed.likedIds));
        }
        if (parsed.trackOverrides) {
          setTrackOverrides(parsed.trackOverrides);
        }
        if (Array.isArray(parsed.playlists)) {
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
    setLikedIds(new Set());
    setTrackOverrides({});
    setCustomTracks([]);
    setPlaylists([]);
    setRecentTrackIds([]);
    setCurrentTrackId(null);
    setQueueIds([]);
    setIsPlaying(false);
    setActiveAudioSource('none');
    setActiveYtVideoId(null);
    setActiveView('home');
    setSelectedPlaylistId(null);
    setSelectedArtist(null);
    setShowImportModal(false);
    showToast('Site remis à zéro comme lors d’une première visite.');
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

  // Navigation Callbacks
  const goHome = useCallback(() => setActiveView('home'), []);
  const goLiked = useCallback(() => setActiveView('liked'), []);
  const goMoods = useCallback(() => setActiveView('moods'), []);
  const goAllTracks = useCallback((genre?: string, moodBit?: number) => {
    setAllTracksGenre(typeof genre === 'string' ? genre : 'all');
    setAllTracksMoodBit(typeof moodBit === 'number' ? moodBit : 0);
    setActiveView('all-tracks');
  }, []);
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

  // Media Session API
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
      // Ignore
    }
  }, [currentTrack, handleTogglePlay, handlePrev, handleNext]);

  // Global Keyboard Shortcuts
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

  const localTrackCount = useMemo(() => {
    const customLocal = customTracks.filter((t) =>
      Boolean(t.localFileKey || t.localServerUrl)
    ).length;
    const overrideLocal = Object.values(trackOverrides).filter((ov) =>
      Boolean(ov?.localFileKey || ov?.localServerUrl)
    ).length;
    return customLocal + overrideLocal;
  }, [customTracks, trackOverrides]);

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="h-screen w-screen overflow-hidden bg-[#07080c] text-[#f5f7fa] flex flex-col select-none relative"
    >
      {/* Hidden HTML5 Audio Engine for Local MP3s */}
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
          if (activeAudioSource !== 'youtube') handleTrackEnded();
        }}
        onPause={() => {
          if (activeAudioSource !== 'youtube') setIsPlaying(false);
        }}
        onPlay={() => {
          if (activeAudioSource !== 'youtube') setIsPlaying(true);
        }}
      />

      {/* Persistent Visible YouTube IFrame Host */}
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
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md border-4 border-dashed border-[#1ED760] m-3 rounded-3xl flex flex-col items-center justify-center gap-3 pointer-events-none">
          <Upload className="w-14 h-14 text-[#1ED760]" />
          <p className="font-display font-bold text-2xl text-white">
            Déposez vos fichiers MP3 / Audio ici
          </p>
          <p className="text-sm text-[#9ca3b0]">
            Stockage persistant dans le navigateur (IndexedDB) — aucun envoi réseau
          </p>
        </div>
      )}

      {/* Top Studio Command Bar */}
      <TopBar
        activeView={activeView}
        searchQuery={searchQuery}
        catalogCount={catalogCount}
        isCatalogSyncing={isCatalogSyncing}
        searchInputRef={searchInputRef}
        onSearchChange={setSearchQuery}
        onGoHome={goHome}
        onOpenSearch={goSearch}
        onPlaySmartMix={() => handlePlaySmartMix()}
        onOpenYouTubeModal={openYouTubeAddModal}
        onOpenImportModal={openImportModal}
        onOpenShortcutsModal={openShortcutsModal}
        onOpenLegalModal={openLegalModal}
        onOpenMobileMenu={openMobileDrawer}
      />

      {/* Main 3-Pane Studio Workspace */}
      <div className="flex-1 min-h-0 flex gap-2.5 px-2.5 py-2">
        <Sidebar
          activeView={activeView}
          selectedPlaylistId={selectedPlaylistId}
          selectedArtist={selectedArtist}
          likedCount={likedIds.size}
          catalogCount={catalogCount}
          artistCount={artistCount}
          catalogVersion={catalogVersion}
          playlists={playlists}
          onGoHome={goHome}
          onSelectLiked={goLiked}
          onSelectAllTracks={() => goAllTracks('all', 0)}
          onSelectMoods={goMoods}
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
            <div className="flex-1 rounded-2xl studio-panel animate-pulse" />
          }
        >
          {activeView === 'home' && (
            <HomeView
              likedCount={likedIds.size}
              catalogCount={catalogCount}
              artistCount={artistCount}
              totalHours={totalHours}
              catalogVersion={catalogVersion}
              overlay={overlay}
              playlists={playlists}
              recentTracks={recentTracks}
              currentTrackId={currentTrackId}
              isPlaying={isPlaying}
              onOpenLiked={goLiked}
              onOpenAllTracks={goAllTracks}
              onOpenMoods={goMoods}
              onOpenPlaylist={openPlaylistView}
              onCreatePlaylist={openCreatePlaylist}
              onPlayTrack={handlePlayTrack}
              onPlaySmartMix={handlePlaySmartMix}
              onToggleLike={handleToggleLike}
              onQuickPasteYouTubeUrl={handleQuickPasteYouTubeUrl}
              onOpenImportModal={openImportModal}
            />
          )}

          {activeView === 'moods' && (
            <MoodsView
              catalogVersion={catalogVersion}
              onPlayMoodRadio={(bit, name) =>
                handlePlaySmartMix('all', bit, name)
              }
              onBrowseMood={(bit) => goAllTracks('all', bit)}
            />
          )}

          {activeView === 'search' && (
            <SearchView
              query={searchQuery}
              onQueryChange={setSearchQuery}
              catalogCount={catalogCount}
              catalogVersion={catalogVersion}
              overlay={overlay}
              playlists={playlists}
              currentTrackId={currentTrackId}
              isPlaying={isPlaying}
              onPlayLibraryTrack={handlePlayTrack}
              onSelectArtist={openArtistView}
              onToggleLike={handleToggleLike}
              onAddTrackToPlaylist={handleAddTrackToPlaylist}
              onAddYouTubeDrafts={handleAddYouTubeDrafts}
              onOpenYouTubeModal={openYouTubeAddModal}
            />
          )}
        </Suspense>

        {activeView === 'liked' && (
          <TrackListView
            headerType="liked"
            title="Titres likés"
            subtitle="Vos morceaux favoris enregistrés localement dans votre navigateur"
            ownerName="Vous"
            overlay={overlay}
            tracks={likedTracks}
            allPlaylists={playlists}
            currentTrackId={currentTrackId}
            isPlaying={isPlaying}
            isShuffle={isShuffle}
            onPlayAll={(sample) => {
              const list = sample && sample.length > 0 ? sample : likedTracks;
              if (isPlaying && list.some((t) => t.id === currentTrackId)) {
                handleTogglePlay();
              } else if (list[0]) {
                handlePlayTrack(list[0], list);
              }
            }}
            onToggleShuffle={toggleShuffle}
            onPlayTrackInContext={handlePlayTrack}
            onToggleLike={handleToggleLike}
            onAddTrackToPlaylist={handleAddTrackToPlaylist}
            onAttachYouTubeLink={openYouTubeAttachModal}
            onSelectArtist={openArtistView}
            onOpenImportModal={openImportModal}
            onExploreCatalog={() => goAllTracks('all', 0)}
          />
        )}

        {activeView === 'all-tracks' && (
          <TrackListView
            headerType="all"
            title="Catalogue Intégral"
            subtitle="Explorez, filtrez par genre ou ambiance et lancez n'importe quel titre en entier"
            ownerName="SpotLocal"
            initialGenre={allTracksGenre}
            initialMoodBit={allTracksMoodBit}
            useCatalogEngine
            catalogVersion={catalogVersion}
            overlay={overlay}
            allPlaylists={playlists}
            currentTrackId={currentTrackId}
            isPlaying={isPlaying}
            isShuffle={isShuffle}
            onPlayAll={(sample) => {
              if (
                sample &&
                sample.length > 0 &&
                isPlaying &&
                sample.some((t) => t.id === currentTrackId)
              ) {
                handleTogglePlay();
              } else if (sample && sample[0]) {
                handlePlayTrack(sample[0], sample);
              } else {
                handlePlaySmartMix(allTracksGenre, allTracksMoodBit);
              }
            }}
            onPlayRandomMix={(g, m) => handlePlaySmartMix(g, m)}
            onToggleShuffle={toggleShuffle}
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
            subtitle={`Tous les morceaux intégraux de ${selectedArtist}`}
            ownerName="SpotLocal"
            artistFilter={selectedArtist}
            useCatalogEngine
            catalogVersion={catalogVersion}
            overlay={overlay}
            allPlaylists={playlists}
            currentTrackId={currentTrackId}
            isPlaying={isPlaying}
            isShuffle={isShuffle}
            onPlayAll={(sample) => {
              if (
                sample &&
                sample.length > 0 &&
                isPlaying &&
                sample.some((t) => t.id === currentTrackId)
              ) {
                handleTogglePlay();
              } else if (sample && sample[0]) {
                handlePlayTrack(sample[0], sample);
              }
            }}
            onToggleShuffle={toggleShuffle}
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
            ownerName="Vous"
            coverUrl={selectedPlaylist.coverUrl}
            overlay={overlay}
            tracks={selectedPlaylistTracks}
            allPlaylists={playlists}
            currentPlaylistId={selectedPlaylist.id}
            currentTrackId={currentTrackId}
            isPlaying={isPlaying}
            isShuffle={isShuffle}
            onPlayAll={(sample) => {
              const list =
                sample && sample.length > 0 ? sample : selectedPlaylistTracks;
              if (isPlaying && list.some((t) => t.id === currentTrackId)) {
                handleTogglePlay();
              } else if (list[0]) {
                handlePlayTrack(list[0], list);
              }
            }}
            onToggleShuffle={toggleShuffle}
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
            onExploreCatalog={() => goAllTracks('all', 0)}
          />
        )}

        {/* Right Studio Queue Panel */}
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

      {/* Bottom Studio Player Dock */}
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
        onPlaySmartMix={() => handlePlaySmartMix()}
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

      {/* Mobile Bottom Navigation Dock (< lg) */}
      <nav
        aria-label="Navigation mobile"
        className="lg:hidden h-14 bg-[#07080c]/98 backdrop-blur-xl border-t border-white/[0.08] grid grid-cols-5 items-center shrink-0 z-20"
      >
        <button
          type="button"
          onClick={goHome}
          className={`flex flex-col items-center justify-center gap-0.5 py-1.5 text-[10px] font-semibold cursor-pointer ${
            activeView === 'home' ? 'text-[#1ED760]' : 'text-[#8b93a4]'
          }`}
        >
          <Home className="w-4 h-4" />
          <span>Accueil</span>
        </button>
        <button
          type="button"
          onClick={goSearch}
          className={`flex flex-col items-center justify-center gap-0.5 py-1.5 text-[10px] font-semibold cursor-pointer ${
            activeView === 'search' ? 'text-[#1ED760]' : 'text-[#8b93a4]'
          }`}
        >
          <Search className="w-4 h-4" />
          <span>Recherche</span>
        </button>
        <button
          type="button"
          onClick={goMoods}
          className={`flex flex-col items-center justify-center gap-0.5 py-1.5 text-[10px] font-semibold cursor-pointer ${
            activeView === 'moods' ? 'text-[#1ED760]' : 'text-[#8b93a4]'
          }`}
        >
          <Radio className="w-4 h-4" />
          <span>Ambiances</span>
        </button>
        <button
          type="button"
          onClick={() => goAllTracks('all', 0)}
          className={`flex flex-col items-center justify-center gap-0.5 py-1.5 text-[10px] font-semibold cursor-pointer ${
            activeView === 'all-tracks' ? 'text-[#1ED760]' : 'text-[#8b93a4]'
          }`}
        >
          <Disc3 className="w-4 h-4" />
          <span>112k</span>
        </button>
        <button
          type="button"
          onClick={goLiked}
          className={`flex flex-col items-center justify-center gap-0.5 py-1.5 text-[10px] font-semibold cursor-pointer ${
            activeView === 'liked' ? 'text-[#1ED760]' : 'text-[#8b93a4]'
          }`}
        >
          <Heart className="w-4 h-4" />
          <span>Likés</span>
        </button>
      </nav>

      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          className="fixed bottom-26 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-[#161c2e]/95 backdrop-blur-xl text-white text-xs sm:text-sm font-semibold shadow-2xl border border-[#1ED760]/40"
        >
          {toastMessage}
        </div>
      )}

      {/* Lazy-Loaded Modals */}
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
            customTrackCount={customTracks.length}
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
