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
  Check,
  Clock3,
  HardDrive,
  MoreHorizontal,
  Pause,
  Play,
  Plus,
  Search,
  Shuffle,
  Trash2,
  Upload,
} from 'lucide-react';
import type { Playlist, SortKey, Track } from '../types/music';
import {
  CATALOG_GENRES,
  CATALOG_MOODS,
  catalogStore,
  type UserLibraryOverlay,
} from '../utils/catalogEngine';
import { filterTracks, sortTracks } from '../utils/musicLogic';
import { AlbumCover, MosaicCover } from './AlbumCover';
import { LikedTracksPoster, VideoClipBadge, YouTubeLogo } from './Logos';

interface TrackListViewProps {
  headerType: 'liked' | 'playlist' | 'all' | 'artist';
  title: string;
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

  return (
    <div
      onDoubleClick={() => onPlay(track)}
      className={`group grid grid-cols-[34px_minmax(0,1fr)_auto] md:grid-cols-[38px_minmax(0,1.7fr)_minmax(0,1fr)_116px_114px] items-center gap-3 px-3 sm:px-4 h-13.5 rounded-lg transition-colors track-row-contain ${
        isActive ? 'bg-[var(--bg-row-active)]' : 'hover:bg-[var(--bg-row-hover)]'
      }`}
    >
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
              <span className="w-0.75 h-3.5 bg-[var(--accent)] rounded-full animate-eq-1" />
              <span className="w-0.75 h-3.5 bg-[var(--accent)] rounded-full animate-eq-2" />
              <span className="w-0.75 h-3.5 bg-[var(--accent)] rounded-full animate-eq-3" />
            </span>
          ) : (
            <>
              <span
                className={`text-sm font-mono-tabular group-hover:hidden ${
                  isActive
                    ? 'text-[var(--accent)] font-semibold'
                    : 'text-[var(--text-sub)]'
                }`}
              >
                {index + 1}
              </span>
              <Play className="w-4 h-4 text-[var(--text-main)] fill-current hidden group-hover:block" />
            </>
          )}
        </button>
      </div>

      <div className="flex items-center gap-3 min-w-0">
        <AlbumCover
          src={track.coverUrl}
          videoIds={track.youtubeVideoIds}
          alt={track.title}
          size="sm"
          className="w-10 h-10 rounded-[5px]"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => onPlay(track)}
              className={`text-sm font-medium truncate text-left hover:underline cursor-pointer ${
                isActive
                  ? 'text-[var(--accent)] font-semibold'
                  : 'text-[var(--text-main)]'
              }`}
            >
              {track.title}
            </button>

            {hasLocal && (
              <span className="shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-[var(--accent-soft)] text-[var(--accent)] text-[10px] font-semibold">
                <HardDrive className="w-2.5 h-2.5" />
                MP3
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 min-w-0 mt-0.5">
            {Boolean(track.youtubeVideoIds?.length) && <VideoClipBadge />}
            {onSelectArtist ? (
              <button
                type="button"
                onClick={() => onSelectArtist(track.artist)}
                className="text-xs text-[var(--text-sub)] hover:text-[var(--text-main)] hover:underline truncate text-left cursor-pointer"
              >
                {track.artist}
              </button>
            ) : (
              <p className="text-xs text-[var(--text-sub)] truncate">
                {track.artist}
              </p>
            )}
          </div>
        </div>
      </div>

      <p className="hidden md:block text-xs text-[var(--text-sub)] truncate">
        {track.album || track.genre}
      </p>

      <p className="hidden md:block text-xs text-[var(--text-sub)] truncate">
        {track.addedAt || '—'}
      </p>

      <div className="flex items-center justify-end gap-2.5 pr-1 relative">
        <button
          type="button"
          onClick={() => onToggleLike(track.id)}
          aria-label={
            track.liked ? 'Retirer des titres likés' : 'Ajouter aux titres likés'
          }
          className={`w-5 h-5 rounded-full flex items-center justify-center transition-all cursor-pointer ${
            track.liked
              ? 'bg-[var(--accent)] text-white opacity-100'
              : 'border border-[var(--text-sub)] text-[var(--text-sub)] hover:border-[var(--text-main)] hover:text-[var(--text-main)] opacity-0 group-hover:opacity-100'
          }`}
        >
          {track.liked ? (
            <Check className="w-3 h-3 stroke-[3]" />
          ) : (
            <Plus className="w-3 h-3 stroke-[2.5]" />
          )}
        </button>

        <span className="text-xs text-[var(--text-sub)] font-mono-tabular w-10 text-right">
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
            className="w-7 h-7 rounded-full hover:bg-[var(--bg-elevated)] flex items-center justify-center text-[var(--text-sub)] hover:text-[var(--text-main)] opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity cursor-pointer"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {isMenuOpen && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute right-0 top-8 z-30 w-56 py-1.5 rounded-xl bg-[var(--bg-panel-solid)] shadow-xl border border-[var(--border-strong)] text-xs text-[var(--text-main)] anim-modal"
            >
              <button
                type="button"
                onClick={() => {
                  onAttachYouTubeLink(track);
                  onToggleMenu(null);
                }}
                className="w-full px-3.5 py-2 text-left hover:bg-[var(--bg-row-hover)] flex items-center gap-2 font-medium text-[var(--text-main)] cursor-pointer"
              >
                <YouTubeLogo className="w-4 h-3 shrink-0" />
                <span>Modifier le lien YouTube</span>
              </button>

              {allPlaylists.length > 0 && (
                <>
                  <div className="my-1 border-t border-[var(--border-subtle)]" />
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
                        className="w-full px-3.5 py-2 text-left hover:bg-[var(--bg-row-hover)] flex items-center gap-2 truncate cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 text-[var(--text-sub)] shrink-0" />
                        <span className="truncate">{pl.name}</span>
                      </button>
                    ))}
                </>
              )}

              {headerType === 'playlist' && onRemoveTrackFromPlaylist && (
                <>
                  <div className="my-1 border-t border-[var(--border-subtle)]" />
                  <button
                    type="button"
                    onClick={() => {
                      onRemoveTrackFromPlaylist(track.id);
                      onToggleMenu(null);
                    }}
                    className="w-full px-3.5 py-2 text-left hover:bg-[var(--bg-row-hover)] text-rose-500 flex items-center gap-2 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Retirer de la playlist</span>
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
  const [inlineQuery, setInlineQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('default');
  const [selectedGenre, setSelectedGenre] = useState<string>(
    initialGenre || 'all'
  );
  const [selectedMoodBit, setSelectedMoodBit] = useState<number>(
    initialMoodBit || 0
  );
  const [openMenuTrackId, setOpenMenuTrackId] = useState<string | null>(null);
  const [visibleLimit, setVisibleLimit] = useState(PAGE_SIZE);

  useEffect(() => {
    if (initialGenre !== undefined) setSelectedGenre(initialGenre);
  }, [initialGenre]);

  useEffect(() => {
    if (initialMoodBit !== undefined) setSelectedMoodBit(initialMoodBit);
  }, [initialMoodBit]);

  const queryOutcome = useMemo(() => {
    void catalogVersion;
    if (useCatalogEngine) {
      return catalogStore.queryCatalog(
        {
          query: inlineQuery,
          genre: headerType === 'artist' ? 'all' : selectedGenre,
          moodBit: headerType === 'artist' ? 0 : selectedMoodBit,
          artist: artistFilter,
          sortField: sortBy,
          limit: visibleLimit,
        },
        overlay
      );
    }

    const byGenre =
      selectedGenre === 'all'
        ? tracks
        : tracks.filter((t) => t.genre === selectedGenre);
    const filtered = filterTracks(byGenre, inlineQuery);
    const sorted = sortTracks(filtered, sortBy);
    return {
      totalMatches: sorted.length,
      tracks: sorted.slice(0, visibleLimit),
    };
  }, [
    useCatalogEngine,
    catalogVersion,
    inlineQuery,
    selectedGenre,
    selectedMoodBit,
    artistFilter,
    sortBy,
    visibleLimit,
    overlay,
    tracks,
    headerType,
  ]);

  const visibleTracks = queryOutcome.tracks;
  const visibleTracksRef = useRef(visibleTracks);
  useEffect(() => {
    visibleTracksRef.current = visibleTracks;
  }, [visibleTracks]);

  const handleRowPlay = useCallback(
    (track: Track) => {
      onPlayTrackInContext(track, visibleTracksRef.current);
    },
    [onPlayTrackInContext]
  );

  const handleScroll = useCallback(
    (e: UIEvent<HTMLDivElement>) => {
      if (visibleTracks.length >= queryOutcome.totalMatches) return;
      const el = e.currentTarget;
      if (el.scrollHeight - el.scrollTop - el.clientHeight < 420) {
        setVisibleLimit((prev) =>
          Math.min(queryOutcome.totalMatches, prev + PAGE_SIZE)
        );
      }
    },
    [visibleTracks.length, queryOutcome.totalMatches]
  );

  const isCollectionPlaying =
    isPlaying &&
    Boolean(currentTrackId) &&
    visibleTracks.some((t) => t.id === currentTrackId);

  return (
    <div
      onClick={() => openMenuTrackId && setOpenMenuTrackId(null)}
      onScroll={handleScroll}
      className="flex-1 flex flex-col min-h-0 studio-panel rounded-xl overflow-y-auto relative anim-view"
    >
      {/* Clean Flat Header */}
      <div className="px-5 sm:px-7 pt-6 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-end gap-5">
          {headerType === 'liked' ? (
            <LikedTracksPoster
              className="w-32 h-32 sm:w-40 sm:h-40 rounded-lg shadow-sm"
              iconClassName="w-14 h-14 sm:w-18 sm:h-18"
            />
          ) : headerType === 'all' ? (
            <MosaicCover
              urls={
                visibleTracks.length > 0
                  ? visibleTracks.slice(0, 8).map((t) => t.coverUrl)
                  : catalogStore.getCatalogSampleCovers(4)
              }
              alt={title}
              size="lg"
              className="w-32 h-32 sm:w-40 sm:h-40 rounded-lg shadow-sm"
            />
          ) : headerType === 'artist' ? (
            <AlbumCover
              src={
                catalogStore.getArtistCoverUrl(title) ||
                visibleTracks[0]?.coverUrl
              }
              videoIds={visibleTracks[0]?.youtubeVideoIds}
              alt={title}
              size="lg"
              className="w-32 h-32 sm:w-40 sm:h-40 rounded-full shadow-sm"
            />
          ) : (
            <MosaicCover
              urls={
                visibleTracks.length >= 4
                  ? visibleTracks.slice(0, 8).map((t) => t.coverUrl)
                  : [coverUrl || visibleTracks[0]?.coverUrl || '']
              }
              alt={title}
              size="lg"
              className="w-32 h-32 sm:w-40 sm:h-40 rounded-lg shadow-sm"
            />
          )}

          <div className="min-w-0 flex-1 space-y-1 pb-1">
            <p className="text-xs font-medium text-[var(--text-sub)]">
              {headerType === 'artist'
                ? 'Artiste'
                : headerType === 'all'
                  ? 'Catalogue'
                  : 'Playlist'}
            </p>
            <h1 className="font-display font-extrabold text-3xl sm:text-5xl text-[var(--text-main)] tracking-tight leading-none truncate">
              {title}
            </h1>
          </div>
        </div>
      </div>

      {/* Action & Filter Bar */}
      <div className="px-5 sm:px-7 py-3 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={queryOutcome.totalMatches === 0}
              onClick={() => onPlayAll(visibleTracks)}
              aria-label={
                isCollectionPlaying ? 'Mettre en pause' : 'Lire la sélection'
              }
              className="w-12.5 h-12.5 rounded-full btn-accent disabled:opacity-40 flex items-center justify-center cursor-pointer"
            >
              {isCollectionPlaying ? (
                <Pause className="w-5.5 h-5.5 fill-current" />
              ) : (
                <Play className="w-5.5 h-5.5 fill-current ml-0.5" />
              )}
            </button>

            <button
              type="button"
              onClick={onToggleShuffle}
              aria-label="Lecture aléatoire"
              title="Lecture aléatoire"
              className={`w-9.5 h-9.5 rounded-full flex items-center justify-center transition-colors anim-press cursor-pointer ${
                isShuffle
                  ? 'text-[var(--accent)] bg-[var(--accent-soft)]'
                  : 'text-[var(--text-sub)] hover:text-[var(--text-main)] hover:bg-[var(--bg-elevated)]'
              }`}
            >
              <Shuffle className="w-4.5 h-4.5" />
            </button>

            {onPlayRandomMix && queryOutcome.totalMatches > 10 && (
              <button
                type="button"
                onClick={() => onPlayRandomMix(selectedGenre, selectedMoodBit)}
                className="hidden sm:inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated-hover)] border border-[var(--border-subtle)] text-xs font-medium text-[var(--text-main)] anim-press cursor-pointer"
              >
                <span>Aléatoire</span>
              </button>
            )}

            {headerType === 'playlist' && onDeletePlaylist && (
              <button
                type="button"
                onClick={onDeletePlaylist}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 text-xs font-medium transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Supprimer</span>
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 flex-1 sm:flex-initial justify-end">
            <div className="relative flex-1 sm:w-52">
              <Search className="w-4 h-4 text-[var(--text-sub)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={inlineQuery}
                onChange={(e) => {
                  setInlineQuery(e.target.value);
                  setVisibleLimit(PAGE_SIZE);
                }}
                placeholder="Filtrer dans la liste..."
                className="w-full h-9 pl-9 pr-3 rounded-md bg-[var(--bg-input)] focus:bg-[var(--bg-input-focus)] text-xs text-[var(--text-main)] placeholder-[var(--text-sub)] border border-[var(--border-subtle)] focus:border-[var(--accent)] outline-none transition-colors"
              />
            </div>

            <select
              aria-label="Trier les titres"
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value as SortKey);
                setVisibleLimit(PAGE_SIZE);
              }}
              className="h-9 px-3 rounded-md bg-[var(--bg-input)] text-xs font-medium text-[var(--text-main)] border border-[var(--border-subtle)] outline-none cursor-pointer"
            >
              <option value="default">Ordre personnalisé</option>
              <option value="title">Titre (A–Z)</option>
              <option value="artist">Artiste (A–Z)</option>
              <option value="duration">Durée</option>
            </select>
          </div>
        </div>

        {headerType === 'all' && (
          <div className="space-y-2 pt-1">
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
              <button
                type="button"
                onClick={() => {
                  setSelectedGenre('all');
                  setVisibleLimit(PAGE_SIZE);
                }}
                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  selectedGenre === 'all'
                    ? 'bg-[var(--pill-active-bg)] text-[var(--pill-active-fg)]'
                    : 'bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated-hover)] text-[var(--text-main)]'
                }`}
              >
                Tous
              </button>
              {CATALOG_GENRES.map((g) => (
                <button
                  key={g.name}
                  type="button"
                  onClick={() => {
                    setSelectedGenre(g.name);
                    setVisibleLimit(PAGE_SIZE);
                  }}
                  className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                    selectedGenre === g.name
                      ? 'bg-[var(--accent)] text-white font-semibold'
                      : 'bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated-hover)] text-[var(--text-main)]'
                  }`}
                >
                  {g.name}
                </button>
              ))}
            </div>

            {selectedMoodBit !== 0 && (
              <div className="flex items-center gap-2 text-xs text-[var(--accent)] font-medium">
                <span>
                  {CATALOG_MOODS.find((m) => m.bit === selectedMoodBit)?.name}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedMoodBit(0)}
                  className="underline hover:opacity-80 cursor-pointer"
                >
                  Effacer
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="px-3 sm:px-5 pb-8 flex-1">
        {visibleTracks.length === 0 ? (
          <div className="py-14 px-4 text-center space-y-3 max-w-sm mx-auto">
            <p className="font-display font-semibold text-sm text-[var(--text-main)]">
              {inlineQuery
                ? `Aucun résultat pour « ${inlineQuery} ».`
                : headerType === 'liked'
                  ? 'Aucun titre liké pour le moment.'
                  : 'Cette playlist est vide.'}
            </p>
            {!inlineQuery && (
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                {onExploreCatalog && (
                  <button
                    type="button"
                    onClick={onExploreCatalog}
                    className="inline-flex items-center gap-2 h-9 px-4 rounded-full btn-accent text-xs font-semibold cursor-pointer"
                  >
                    <span>Parcourir le catalogue</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={onOpenImportModal}
                  className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated-hover)] border border-[var(--border-subtle)] text-[var(--text-main)] text-xs font-medium anim-press cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-[var(--accent)]" />
                  <span>Importer des MP3</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-[34px_minmax(0,1fr)_auto] md:grid-cols-[38px_minmax(0,1.7fr)_minmax(0,1fr)_116px_114px] items-center gap-3 px-3 sm:px-4 pb-2 mb-1 border-b border-[var(--border-subtle)] text-xs font-medium text-[var(--text-sub)]">
              <span className="text-center">#</span>
              <span>Titre</span>
              <span className="hidden md:block">Album</span>
              <span className="hidden md:block">Date d&apos;ajout</span>
              <span className="flex justify-end pr-8">
                <Clock3 className="w-3.5 h-3.5" />
              </span>
            </div>

            <div className="space-y-0.5">
              {visibleTracks.map((track, index) => {
                const isActive = currentTrackId === track.id;
                return (
                  <TrackRow
                    key={track.id}
                    track={track}
                    index={index}
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
                <div className="pt-4 pb-2 flex justify-center">
                  <button
                    type="button"
                    onClick={() =>
                      setVisibleLimit((prev) =>
                        Math.min(queryOutcome.totalMatches, prev + PAGE_SIZE * 2)
                      )
                    }
                    className="px-5 py-2 rounded-full bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated-hover)] border border-[var(--border-subtle)] text-xs font-medium text-[var(--text-main)] anim-press cursor-pointer"
                  >
                    Afficher plus
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
});
