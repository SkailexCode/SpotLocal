import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type UIEvent,
} from 'react';
import {
  Clock3,
  Disc3,
  HardDrive,
  Heart,
  Link2,
  Mic2,
  MoreHorizontal,
  Pause,
  Play,
  Plus,
  Search,
  Shuffle,
  Sparkles,
  Trash2,
  Upload,
  Youtube,
} from 'lucide-react';
import type { Playlist, SortKey, Track } from '../types/music';
import {
  CATALOG_GENRES,
  CATALOG_MOODS,
  catalogStore,
  type UserLibraryOverlay,
} from '../utils/catalogEngine';
import { filterTracks, sortTracks } from '../utils/musicLogic';
import { AlbumCover } from './AlbumCover';

interface TrackListViewProps {
  headerType: 'liked' | 'playlist' | 'all' | 'artist';
  title: string;
  subtitle?: string;
  ownerName: string;
  coverUrl?: string;
  initialGenre?: string;
  initialMoodBit?: number;
  artistFilter?: string;
  useCatalogEngine?: boolean;
  catalogVersion?: number;
  overlay: UserLibraryOverlay;
  tracks?: Track[];
  allPlaylists: Playlist[];
  currentPlaylistId?: string;
  currentTrackId: string | null;
  isPlaying: boolean;
  isShuffle: boolean;
  onPlayAll: (visibleSample?: Track[]) => void;
  onPlayRandomMix?: (genre?: string, moodBit?: number) => void;
  onToggleShuffle: () => void;
  onPlayTrackInContext: (track: Track, contextQueue: Track[]) => void;
  onToggleLike: (trackId: string) => void;
  onAddTrackToPlaylist: (trackId: string, playlistId: string) => void;
  onRemoveTrackFromPlaylist?: (trackId: string) => void;
  onDeletePlaylist?: () => void;
  onAttachYouTubeLink: (track: Track) => void;
  onSelectArtist?: (artistName: string) => void;
  onOpenImportModal: () => void;
  onExploreCatalog?: () => void;
}

interface TrackRowProps {
  track: Track;
  index: number;
  isActive: boolean;
  isRowPlaying: boolean;
  isMenuOpen: boolean;
  headerType: 'liked' | 'playlist' | 'all' | 'artist';
  currentPlaylistId?: string;
  allPlaylists: Playlist[];
  onPlay: (track: Track) => void;
  onToggleLike: (trackId: string) => void;
  onToggleMenu: (trackId: string | null) => void;
  onAttachYouTubeLink: (track: Track) => void;
  onAddTrackToPlaylist: (trackId: string, playlistId: string) => void;
  onRemoveTrackFromPlaylist?: (trackId: string) => void;
  onSelectArtist?: (artistName: string) => void;
}

function formatTotalSecondsLabel(totalSec: number): string {
  const hours = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  if (hours > 0) {
    return `${hours.toLocaleString('fr-FR')} h ${mins} min`;
  }
  return `${mins} min`;
}

const TrackRow = memo(function TrackRow({
  track,
  index,
  isActive,
  isRowPlaying,
  isMenuOpen,
  headerType,
  currentPlaylistId,
  allPlaylists,
  onPlay,
  onToggleLike,
  onToggleMenu,
  onAttachYouTubeLink,
  onAddTrackToPlaylist,
  onRemoveTrackFromPlaylist,
  onSelectArtist,
}: TrackRowProps) {
  const hasLocal = Boolean(track.localFileKey || track.localServerUrl);
  const hasYt = Boolean(track.youtubeVideoIds && track.youtubeVideoIds.length > 0);

  return (
    <div
      onDoubleClick={() => onPlay(track)}
      className={`group grid grid-cols-[36px_minmax(0,1fr)_auto] md:grid-cols-[40px_minmax(0,1.7fr)_minmax(0,1fr)_136px] items-center gap-3 px-3 sm:px-4 h-14.5 rounded-xl transition-colors track-row-contain ${
        isActive
          ? 'bg-[#1ED760]/[0.09] border border-[#1ED760]/25'
          : 'hover:bg-white/[0.05] border border-transparent'
      }`}
    >
      {/* Index / Equalizer / Play Trigger */}
      <div className="flex items-center justify-center">
        <button
          type="button"
          onClick={() => onPlay(track)}
          aria-label={
            isRowPlaying
              ? `Mettre en pause ${track.title}`
              : `Lire ${track.title}`
          }
          className="w-7 h-7 flex items-center justify-center cursor-pointer"
        >
          {isRowPlaying ? (
            <span className="flex items-end gap-0.5 h-3.5">
              <span className="w-0.75 h-3.5 bg-[#1ED760] rounded-full animate-eq-1" />
              <span className="w-0.75 h-3.5 bg-[#1ED760] rounded-full animate-eq-2" />
              <span className="w-0.75 h-3.5 bg-[#1ED760] rounded-full animate-eq-3" />
            </span>
          ) : (
            <>
              <span
                className={`text-xs font-mono-tabular group-hover:hidden ${
                  isActive ? 'text-[#1ED760] font-bold' : 'text-[#7d8596]'
                }`}
              >
                {index + 1}
              </span>
              <Play className="w-4 h-4 text-white fill-white hidden group-hover:block" />
            </>
          )}
        </button>
      </div>

      {/* Title + Artist + Source Badge */}
      <div className="flex items-center gap-3 min-w-0">
        <AlbumCover
          src={track.coverUrl}
          alt={track.title}
          sizeClass="w-10.5 h-10.5"
          roundedClass="rounded-lg"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => onPlay(track)}
              className={`text-[14.5px] font-semibold truncate text-left hover:underline cursor-pointer ${
                isActive ? 'text-[#1ED760]' : 'text-white'
              }`}
            >
              {track.title}
            </button>

            {hasLocal ? (
              <span className="shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-[#1ED760]/18 text-[#1ED760] text-[10px] font-bold">
                <HardDrive className="w-2.5 h-2.5" />
                MP3
              </span>
            ) : hasYt ? (
              <span className="hidden sm:inline-flex shrink-0 items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-rose-500/14 text-rose-300 text-[10px] font-semibold">
                <Youtube className="w-2.5 h-2.5 fill-current" />
                YT
              </span>
            ) : null}
          </div>

          <div className="flex items-center gap-1.5 min-w-0 mt-0.5">
            {onSelectArtist ? (
              <button
                type="button"
                onClick={() => onSelectArtist(track.artist)}
                className="text-xs text-[#8b93a4] hover:text-white hover:underline truncate text-left cursor-pointer"
              >
                {track.artist}
              </button>
            ) : (
              <p className="text-xs text-[#8b93a4] truncate">{track.artist}</p>
            )}
          </div>
        </div>
      </div>

      {/* Genre / Album */}
      <p className="hidden md:block text-xs text-[#8b93a4] truncate">
        {track.genre || track.album}
      </p>

      {/* Like + Duration + Context Menu */}
      <div className="flex items-center justify-end gap-2.5 pr-1 relative">
        <button
          type="button"
          onClick={() => onToggleLike(track.id)}
          aria-label={
            track.liked ? 'Retirer des titres likés' : 'Ajouter aux titres likés'
          }
          className={`transition-opacity cursor-pointer ${
            track.liked
              ? 'opacity-100 text-[#1ED760]'
              : 'opacity-0 group-hover:opacity-100 text-[#8b93a4] hover:text-white'
          }`}
        >
          <Heart
            className={`w-4 h-4 ${track.liked ? 'fill-[#1ED760]' : ''}`}
          />
        </button>

        <span className="text-xs text-[#8b93a4] font-mono-tabular w-10 text-right">
          {track.durationLabel}
        </span>

        <div className="relative">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleMenu(isMenuOpen ? null : track.id);
            }}
            aria-label="Plus d'actions"
            className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-[#8b93a4] hover:text-white opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity cursor-pointer"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {isMenuOpen && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute right-0 top-8 z-30 w-60 py-1.5 rounded-xl bg-[#181c28] shadow-2xl border border-white/12 text-xs text-white"
            >
              <button
                type="button"
                onClick={() => {
                  onAttachYouTubeLink(track);
                  onToggleMenu(null);
                }}
                className="w-full px-3.5 py-2 text-left hover:bg-white/10 flex items-center gap-2 font-semibold text-[#1ED760] cursor-pointer"
              >
                <Link2 className="w-3.5 h-3.5" />
                <span>Changer le lien YouTube…</span>
              </button>

              {allPlaylists.length > 0 && (
                <>
                  <div className="my-1 border-t border-white/10" />
                  <p className="px-3.5 py-1 text-[10.5px] uppercase tracking-wider text-[#7d8596] font-bold">
                    Ajouter à une playlist
                  </p>
                  {allPlaylists
                    .filter((pl) => pl.id !== currentPlaylistId)
                    .map((pl) => (
                      <button
                        key={pl.id}
                        type="button"
                        onClick={() => {
                          onAddTrackToPlaylist(track.id, pl.id);
                          onToggleMenu(null);
                        }}
                        className="w-full px-3.5 py-2 text-left hover:bg-white/10 flex items-center gap-2 truncate cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 text-[#9ca3b0] shrink-0" />
                        <span className="truncate">{pl.name}</span>
                      </button>
                    ))}
                </>
              )}

              {headerType === 'playlist' && onRemoveTrackFromPlaylist && (
                <>
                  <div className="my-1 border-t border-white/10" />
                  <button
                    type="button"
                    onClick={() => {
                      onRemoveTrackFromPlaylist(track.id);
                      onToggleMenu(null);
                    }}
                    className="w-full px-3.5 py-2 text-left hover:bg-white/10 text-rose-400 flex items-center gap-2 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Retirer de cette playlist</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

const PAGE_SIZE = 100;

export const TrackListView = memo(function TrackListView({
  headerType,
  title,
  subtitle,
  ownerName,
  coverUrl,
  initialGenre,
  initialMoodBit,
  artistFilter,
  useCatalogEngine = false,
  catalogVersion = 0,
  overlay,
  tracks = [],
  allPlaylists,
  currentPlaylistId,
  currentTrackId,
  isPlaying,
  isShuffle,
  onPlayAll,
  onPlayRandomMix,
  onToggleShuffle,
  onPlayTrackInContext,
  onToggleLike,
  onAddTrackToPlaylist,
  onRemoveTrackFromPlaylist,
  onDeletePlaylist,
  onAttachYouTubeLink,
  onSelectArtist,
  onOpenImportModal,
  onExploreCatalog,
}: TrackListViewProps) {
  const [tableFilter, setTableFilter] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string>(
    initialGenre || 'all'
  );
  const [selectedMoodBit, setSelectedMoodBit] = useState<number>(
    initialMoodBit || 0
  );
  const [sourceFilter, setSourceFilter] = useState<'all' | 'local' | 'youtube'>(
    'all'
  );
  const [sortField, setSortField] = useState<SortKey>('default');
  const [sortAsc, setSortAsc] = useState(true);
  const [openMenuTrackId, setOpenMenuTrackId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setSelectedGenre(initialGenre || 'all');
    setVisibleCount(PAGE_SIZE);
  }, [initialGenre]);

  useEffect(() => {
    setSelectedMoodBit(initialMoodBit || 0);
    setVisibleCount(PAGE_SIZE);
  }, [initialMoodBit]);

  const queryOutcome = useMemo(() => {
    void catalogVersion;
    if (useCatalogEngine) {
      return catalogStore.queryCatalog(
        {
          query: tableFilter,
          genre: selectedGenre,
          moodBit: selectedMoodBit,
          artist: artistFilter,
          sourceFilter,
          sortField,
          sortAsc,
          limit: visibleCount,
        },
        overlay
      );
    }

    let filtered = filterTracks(tracks, tableFilter, selectedGenre);
    if (selectedMoodBit !== 0) {
      filtered = filtered.filter(
        (t) => ((t.moodMask || 0) & selectedMoodBit) !== 0
      );
    }
    if (sourceFilter === 'local') {
      filtered = filtered.filter((t) =>
        Boolean(t.localFileKey || t.localServerUrl)
      );
    } else if (sourceFilter === 'youtube') {
      filtered = filtered.filter((t) =>
        Boolean(t.youtubeVideoIds && t.youtubeVideoIds.length > 0)
      );
    }
    const sorted = sortTracks(filtered, sortField, sortAsc ? 'asc' : 'desc');
    const totalDur = sorted.reduce((acc, t) => acc + t.durationSec, 0);
    return {
      totalMatches: sorted.length,
      totalDurationSec: totalDur,
      tracks: sorted.slice(0, visibleCount),
    };
  }, [
    useCatalogEngine,
    catalogVersion,
    overlay,
    tracks,
    tableFilter,
    selectedGenre,
    selectedMoodBit,
    artistFilter,
    sourceFilter,
    sortField,
    sortAsc,
    visibleCount,
  ]);

  const visibleTracks = queryOutcome.tracks;
  const visibleTracksRef = useRef<Track[]>(visibleTracks);
  visibleTracksRef.current = visibleTracks;

  const handleRowPlay = useCallback(
    (track: Track) => {
      onPlayTrackInContext(track, visibleTracksRef.current);
    },
    [onPlayTrackInContext]
  );

  const handleContainerScroll = useCallback(
    (e: UIEvent<HTMLDivElement>) => {
      if (visibleTracks.length >= queryOutcome.totalMatches) return;
      const el = e.currentTarget;
      if (el.scrollHeight - el.scrollTop - el.clientHeight < 420) {
        setVisibleCount((prev) => prev + PAGE_SIZE);
      }
    },
    [visibleTracks.length, queryOutcome.totalMatches]
  );

  const handleSortClick = (field: SortKey) => {
    setVisibleCount(PAGE_SIZE);
    if (sortField === field) {
      setSortAsc((prev) => !prev);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const bannerGradient =
    headerType === 'liked'
      ? 'from-indigo-600/30 via-[#121626] to-transparent'
      : headerType === 'all'
        ? 'from-emerald-600/25 via-[#101822] to-transparent'
        : headerType === 'artist'
          ? 'from-cyan-600/25 via-[#111824] to-transparent'
          : 'from-purple-600/25 via-[#141424] to-transparent';

  return (
    <div
      ref={scrollContainerRef}
      onScroll={handleContainerScroll}
      onClick={() => openMenuTrackId && setOpenMenuTrackId(null)}
      className="flex-1 flex flex-col min-h-0 studio-panel rounded-2xl overflow-y-auto select-none relative"
    >
      {/* Hero Banner */}
      <div
        className={`bg-gradient-to-b ${bannerGradient} px-5 sm:px-7 pt-6 pb-6 flex flex-col sm:flex-row sm:items-end gap-5`}
      >
        {headerType === 'liked' ? (
          <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl shadow-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-emerald-300 flex items-center justify-center shrink-0">
            <Heart className="w-14 h-14 text-white fill-white drop-shadow-md" />
          </div>
        ) : headerType === 'all' ? (
          <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl shadow-2xl bg-gradient-to-br from-[#1ED760] via-[#129642] to-[#0a2916] flex items-center justify-center shrink-0">
            <Disc3 className="w-14 h-14 text-black drop-shadow-md" />
          </div>
        ) : headerType === 'artist' ? (
          <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full shadow-2xl bg-gradient-to-br from-cyan-500/40 to-[#151a28] border border-white/15 flex items-center justify-center shrink-0 overflow-hidden">
            {coverUrl ? (
              <AlbumCover
                src={coverUrl}
                alt={title}
                sizeClass="w-full h-full"
                roundedClass="rounded-full"
              />
            ) : (
              <Mic2 className="w-14 h-14 text-white" />
            )}
          </div>
        ) : (
          <AlbumCover
            src={coverUrl || ''}
            alt={title}
            sizeClass="w-28 h-28 sm:w-36 sm:h-36"
            roundedClass="rounded-2xl shadow-2xl"
          />
        )}

        <div className="min-w-0 flex-1 space-y-2">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-white/[0.07] border border-white/[0.09] text-[11px] font-semibold text-[#c8cdd6]">
            {headerType === 'all'
              ? 'Catalogue Intégral YouTube'
              : headerType === 'artist'
                ? 'Discographie Artiste'
                : headerType === 'liked'
                  ? 'Favoris Personnels'
                  : 'Playlist Personnelle'}
          </span>

          <h1 className="font-display font-extrabold text-2xl sm:text-4xl lg:text-5xl tracking-tight text-white truncate pb-0.5">
            {title}
          </h1>

          {subtitle && (
            <p className="text-xs sm:text-sm text-[#9ca3b0] line-clamp-2">
              {subtitle}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-1.5 text-xs sm:text-sm text-[#c8cdd6] pt-0.5">
            <span className="font-bold text-white">{ownerName}</span>
            <span className="text-[#6e7787]">•</span>
            <span className="text-[#1ED760] font-mono-tabular font-bold">
              {queryOutcome.totalMatches.toLocaleString('fr-FR')}{' '}
              {queryOutcome.totalMatches > 1 ? 'titres' : 'titre'}
            </span>
            {queryOutcome.totalMatches > 0 && (
              <>
                <span className="text-[#6e7787]">•</span>
                <span className="text-[#8b93a4] font-mono-tabular">
                  {formatTotalSecondsLabel(queryOutcome.totalDurationSec)}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Action Bar + Genre/Mood Filter Strip */}
      <div className="px-4 sm:px-7 pb-6 flex-1 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              disabled={visibleTracks.length === 0}
              onClick={() => onPlayAll(visibleTracks)}
              aria-label="Lire la sélection"
              className="w-12 h-12 rounded-full bg-[#1ED760] hover:bg-[#22e668] disabled:opacity-40 hover:scale-105 active:scale-95 transition-all flex items-center justify-center shadow-[0_6px_22px_rgba(30,215,96,0.35)] text-black cursor-pointer"
            >
              {isPlaying &&
              visibleTracks.some((t) => t.id === currentTrackId) ? (
                <Pause className="w-5 h-5 fill-black" />
              ) : (
                <Play className="w-5 h-5 fill-black ml-0.5" />
              )}
            </button>

            {onPlayRandomMix && headerType === 'all' && (
              <button
                type="button"
                onClick={() =>
                  onPlayRandomMix(selectedGenre, selectedMoodBit || undefined)
                }
                className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-[#1ED760]/12 hover:bg-[#1ED760]/22 border border-[#1ED760]/30 text-[#1ED760] text-xs font-bold transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Mix aléatoire du filtre</span>
              </button>
            )}

            <button
              type="button"
              onClick={onToggleShuffle}
              aria-label="Mode aléatoire"
              title="Lecture aléatoire (S)"
              className={`w-10 h-10 rounded-full border flex items-center justify-center transition-colors cursor-pointer ${
                isShuffle
                  ? 'bg-[#1ED760]/15 border-[#1ED760]/35 text-[#1ED760]'
                  : 'bg-white/[0.04] border-white/[0.08] text-[#9ca3b0] hover:text-white'
              }`}
            >
              <Shuffle className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onOpenImportModal}
              className="hidden sm:inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.11] border border-white/[0.08] text-xs font-semibold text-white transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-[#1ED760]" />
              <span>Importer MP3</span>
            </button>

            {headerType === 'playlist' && onDeletePlaylist && (
              <button
                type="button"
                onClick={onDeletePlaylist}
                className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-rose-500/12 hover:bg-rose-500/22 border border-rose-500/25 text-xs font-semibold text-rose-300 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Supprimer</span>
              </button>
            )}
          </div>

          {/* Search inside View + Source Toggle */}
          <div className="flex flex-wrap items-center gap-2">
            {headerType !== 'all' && (
              <div className="inline-flex items-center rounded-xl bg-[#0a0c12] p-0.5 border border-white/[0.07] text-xs">
                {(['all', 'local', 'youtube'] as const).map((src) => (
                  <button
                    key={src}
                    type="button"
                    onClick={() => {
                      setSourceFilter(src);
                      setVisibleCount(PAGE_SIZE);
                    }}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                      sourceFilter === src
                        ? 'bg-[#1c2130] text-white'
                        : 'text-[#8b93a4] hover:text-white'
                    }`}
                  >
                    {src === 'all' ? 'Tout' : src === 'local' ? 'MP3' : 'YouTube'}
                  </button>
                ))}
              </div>
            )}

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#7d8596] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={tableFilter}
                onChange={(e) => {
                  setTableFilter(e.target.value);
                  setVisibleCount(PAGE_SIZE);
                }}
                placeholder="Filtrer par titre ou artiste…"
                className="h-9 pl-8.5 pr-3 rounded-xl bg-[#0d1018] hover:bg-[#131723] focus:bg-[#151a28] text-xs text-white placeholder-[#7d8596] outline-none w-52 sm:w-64 border border-white/[0.08] focus:border-[#1ED760]/60 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Genre & Mood Pills when browsing the 112k Catalog */}
        {headerType === 'all' && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
              <button
                type="button"
                onClick={() => {
                  setSelectedGenre('all');
                  setVisibleCount(PAGE_SIZE);
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  selectedGenre === 'all'
                    ? 'bg-white text-black'
                    : 'bg-white/[0.05] text-[#9ca3b0] hover:text-white border border-white/[0.07]'
                }`}
              >
                Tous les genres
              </button>
              {CATALOG_GENRES.map((g) => (
                <button
                  key={g.name}
                  type="button"
                  onClick={() => {
                    setSelectedGenre(g.name);
                    setVisibleCount(PAGE_SIZE);
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                    selectedGenre === g.name
                      ? 'bg-[#1ED760] text-black font-bold'
                      : 'bg-white/[0.05] text-[#9ca3b0] hover:text-white border border-white/[0.07]'
                  }`}
                >
                  {g.name}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
              <button
                type="button"
                onClick={() => {
                  setSelectedMoodBit(0);
                  setVisibleCount(PAGE_SIZE);
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  selectedMoodBit === 0
                    ? 'bg-purple-500/25 text-purple-200 border border-purple-400/35'
                    : 'bg-white/[0.03] text-[#7d8596] hover:text-white border border-white/[0.05]'
                }`}
              >
                Toutes ambiances
              </button>
              {CATALOG_MOODS.map((m) => (
                <button
                  key={m.bit}
                  type="button"
                  onClick={() => {
                    setSelectedMoodBit(selectedMoodBit === m.bit ? 0 : m.bit);
                    setVisibleCount(PAGE_SIZE);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                    selectedMoodBit === m.bit
                      ? 'bg-purple-500 text-white font-bold'
                      : 'bg-white/[0.03] text-[#8b93a4] hover:text-white border border-white/[0.05]'
                  }`}
                >
                  {m.shortLabel}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Sticky Column Header */}
        <div className="grid grid-cols-[36px_minmax(0,1fr)_auto] md:grid-cols-[40px_minmax(0,1.7fr)_minmax(0,1fr)_136px] items-center gap-3 px-3 sm:px-4 h-9 border-b border-white/[0.07] text-[11.5px] font-semibold uppercase tracking-wider text-[#7d8596] sticky top-0 bg-[#0d1017]/95 backdrop-blur-md z-10">
          <span className="text-center">#</span>
          <button
            type="button"
            onClick={() => handleSortClick('title')}
            className="text-left hover:text-white transition-colors cursor-pointer"
          >
            Titre {sortField === 'title' ? (sortAsc ? '↑' : '↓') : ''}
          </button>
          <button
            type="button"
            onClick={() => handleSortClick('artist')}
            className="hidden md:block text-left hover:text-white transition-colors cursor-pointer"
          >
            Genre / Artiste{' '}
            {sortField === 'artist' ? (sortAsc ? '↑' : '↓') : ''}
          </button>
          <button
            type="button"
            onClick={() => handleSortClick('duration')}
            aria-label="Trier par durée"
            className="flex items-center justify-end pr-2 hover:text-white transition-colors cursor-pointer"
          >
            <Clock3 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Empty State or Track Rows */}
        {visibleTracks.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <p className="text-base font-bold text-white">
              {headerType === 'liked' && tracks.length === 0
                ? 'Vous n’avez encore aucun titre liké'
                : headerType === 'playlist' && tracks.length === 0
                  ? 'Cette playlist est vide pour le moment'
                  : 'Aucun titre ne correspond à ces filtres'}
            </p>
            <p className="text-sm text-[#8b93a4] max-w-md mx-auto">
              {headerType === 'liked' && tracks.length === 0
                ? 'Explorez le catalogue intégral et cliquez sur le cœur (♥) pour retrouver tous vos favoris ici.'
                : 'Modifiez la recherche, changez d’ambiance ou collez directement un lien YouTube.'}
            </p>
            {onExploreCatalog && tracks.length === 0 && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={onExploreCatalog}
                  className="inline-flex items-center gap-2 h-10 px-5 rounded-full bg-[#1ED760] hover:bg-[#22e668] text-black text-xs font-bold transition-colors cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-black" />
                  <span>Explorer le catalogue intégral</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-0.5" data-testid="track-table-body">
            {visibleTracks.map((track, idx) => {
              const isActive = currentTrackId === track.id;
              return (
                <TrackRow
                  key={track.id}
                  track={track}
                  index={idx}
                  isActive={isActive}
                  isRowPlaying={isActive && isPlaying}
                  isMenuOpen={openMenuTrackId === track.id}
                  headerType={headerType}
                  currentPlaylistId={currentPlaylistId}
                  allPlaylists={allPlaylists}
                  onPlay={handleRowPlay}
                  onToggleLike={onToggleLike}
                  onToggleMenu={setOpenMenuTrackId}
                  onAttachYouTubeLink={onAttachYouTubeLink}
                  onAddTrackToPlaylist={onAddTrackToPlaylist}
                  onRemoveTrackFromPlaylist={onRemoveTrackFromPlaylist}
                  onSelectArtist={onSelectArtist}
                />
              );
            })}

            {visibleTracks.length < queryOutcome.totalMatches && (
              <div className="py-5 flex justify-center">
                <button
                  type="button"
                  onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
                  className="px-5 py-2.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.09] text-xs font-semibold text-white transition-colors cursor-pointer"
                >
                  Afficher {PAGE_SIZE} titres supplémentaires (
                  {(
                    queryOutcome.totalMatches - visibleTracks.length
                  ).toLocaleString('fr-FR')}{' '}
                  restants)
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});
