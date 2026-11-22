import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Clock3,
  Download,
  HardDrive,
  Heart,
  Link2,
  ListPlus,
  MoreHorizontal,
  Pause,
  Play,
  Plus,
  Search,
  Shuffle,
  Trash2,
  Youtube,
} from 'lucide-react';
import type { Playlist, SortKey, Track } from '../types/music';
import {
  filterTracks,
  sortTracks,
  totalDurationLabel,
} from '../utils/musicLogic';
import { AlbumCover } from './AlbumCover';

interface TrackListViewProps {
  headerType: 'liked' | 'playlist' | 'all' | 'artist';
  title: string;
  subtitle?: string;
  ownerName: string;
  coverUrl?: string;
  initialGenre?: string;
  tracks: Track[];
  allPlaylists: Playlist[];
  currentPlaylistId?: string;
  currentTrackId: string | null;
  isPlaying: boolean;
  isShuffle: boolean;
  onPlayAll: () => void;
  onToggleShuffle: () => void;
  onPlayTrack: (track: Track) => void;
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
  const isLocalAudio = Boolean(track.localFileKey || track.localServerUrl);
  const hasYtLink = Boolean(
    track.youtubeVideoIds && track.youtubeVideoIds.length > 0
  );

  return (
    <div
      onDoubleClick={() => onPlay(track)}
      data-testid={`track-row-${index + 1}`}
      className={`group relative grid grid-cols-[36px_minmax(0,1fr)_56px] md:grid-cols-[40px_minmax(0,2fr)_minmax(0,1.3fr)_125px_72px] items-center gap-3 px-3 h-14 rounded-md transition-colors ${
        !isMenuOpen ? 'track-row-contain' : ''
      } ${isActive ? 'bg-white/[0.08]' : 'hover:bg-white/[0.07]'}`}
    >
      {/* Index, Animated Equalizer, or Play Button */}
      <div className="flex items-center justify-center">
        {isRowPlaying ? (
          <span
            aria-hidden="true"
            className="flex items-end gap-[2px] h-3.5 group-hover:hidden"
          >
            <span className="w-[3px] h-full bg-[#1ED760] rounded-xs animate-eq-1" />
            <span className="w-[3px] h-full bg-[#1ED760] rounded-xs animate-eq-2" />
            <span className="w-[3px] h-full bg-[#1ED760] rounded-xs animate-eq-3" />
          </span>
        ) : (
          <span
            className={`font-mono-tabular text-sm group-hover:hidden ${
              isActive ? 'text-[#1ED760] font-semibold' : 'text-[#b3b3b3]'
            }`}
          >
            {index + 1}
          </span>
        )}
        <button
          type="button"
          onClick={() => onPlay(track)}
          aria-label={
            isRowPlaying
              ? `Mettre en pause ${track.title}`
              : `Lire ${track.title}`
          }
          className="hidden group-hover:flex items-center justify-center text-white cursor-pointer"
        >
          {isRowPlaying ? (
            <Pause className="w-4 h-4 fill-white" />
          ) : (
            <Play className="w-4 h-4 fill-white" />
          )}
        </button>
      </div>

      {/* Cover + Title + Artist + Badges */}
      <div className="flex items-center gap-3 min-w-0">
        <AlbumCover
          src={track.coverUrl}
          alt={track.album}
          sizeClass="w-10 h-10"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <button
              type="button"
              onClick={() => onPlay(track)}
              className={`text-[15px] font-medium truncate text-left hover:underline cursor-pointer ${
                isActive ? 'text-[#1ED760]' : 'text-white'
              }`}
            >
              {track.title}
            </button>
            {isLocalAudio && (
              <span
                title="Fichier MP3 local (lecture intégrale directe)"
                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-[#1ED760]/15 text-[#1ED760] text-[10px] font-bold shrink-0"
              >
                <HardDrive className="w-2.5 h-2.5" />
                MP3
              </span>
            )}
            {!isLocalAudio && hasYtLink && (
              <span
                title="Lien YouTube associé (lecture intégrale)"
                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 text-[10px] font-bold shrink-0"
              >
                <Youtube className="w-2.5 h-2.5 fill-current" />
                YT
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 min-w-0">
            {track.explicit && (
              <span
                title="Contenu explicite"
                className="inline-flex items-center justify-center w-4 h-4 rounded-[2px] bg-[#b3b3b3]/80 text-[#121212] text-[10px] font-bold leading-none shrink-0"
              >
                E
              </span>
            )}
            {onSelectArtist ? (
              <button
                type="button"
                onClick={() => onSelectArtist(track.artist)}
                className="text-[13px] text-[#b3b3b3] hover:text-white hover:underline truncate text-left cursor-pointer"
              >
                {track.artist}
              </button>
            ) : (
              <p className="text-[13px] text-[#b3b3b3] truncate">
                {track.artist}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Album */}
      <p className="hidden md:block text-sm text-[#b3b3b3] truncate">
        {track.album}
      </p>

      {/* Date Added */}
      <p className="hidden md:block text-sm text-[#b3b3b3] truncate">
        {track.addedAt}
      </p>

      {/* Right Actions + Duration */}
      <div className="flex items-center justify-end gap-2 pr-1">
        <button
          type="button"
          onClick={() => onToggleLike(track.id)}
          aria-label={
            track.liked
              ? `Retirer ${track.title} des titres likés`
              : `Ajouter ${track.title} aux titres likés`
          }
          className={`transition-opacity cursor-pointer ${
            track.liked
              ? 'text-[#1ED760] opacity-100'
              : 'text-[#b3b3b3] opacity-0 group-hover:opacity-100 hover:text-white'
          }`}
        >
          {track.liked ? (
            <Check className="w-4 h-4 stroke-[2.75] bg-[#1ED760] text-black rounded-full p-0.5" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
        </button>

        <span className="font-mono-tabular text-xs sm:text-sm text-[#b3b3b3] w-10 text-right">
          {track.durationLabel}
        </span>

        <div className="relative">
          <button
            type="button"
            onClick={() => onToggleMenu(isMenuOpen ? null : track.id)}
            aria-label={`Plus d'options pour ${track.title}`}
            className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-[#b3b3b3] hover:text-white p-1 cursor-pointer"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {isMenuOpen && (
            <div
              onMouseLeave={() => onToggleMenu(null)}
              className="absolute right-0 top-7 z-30 w-60 rounded-md bg-[#282828] shadow-2xl border border-white/10 py-1.5 text-xs text-white"
            >
              <button
                type="button"
                onClick={() => {
                  onAttachYouTubeLink(track);
                  onToggleMenu(null);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/10 text-left text-white cursor-pointer"
              >
                <Link2 className="w-3.5 h-3.5 text-[#1ED760]" />
                <span>
                  {hasYtLink
                    ? 'Modifier le lien YouTube…'
                    : 'Associer un lien YouTube…'}
                </span>
              </button>

              <div className="my-1 border-t border-white/10" />

              <p className="px-3 py-1 text-[11px] font-semibold text-[#a0a0a0] flex items-center gap-1.5">
                <ListPlus className="w-3.5 h-3.5" />
                Ajouter à une playlist
              </p>
              {allPlaylists.map((pl) => {
                const alreadyIn = pl.trackIds.includes(track.id);
                return (
                  <button
                    key={pl.id}
                    type="button"
                    onClick={() => {
                      onAddTrackToPlaylist(track.id, pl.id);
                      onToggleMenu(null);
                    }}
                    className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-white/10 text-left cursor-pointer"
                  >
                    <span className="truncate">{pl.name}</span>
                    {alreadyIn && (
                      <Check className="w-3.5 h-3.5 text-[#1ED760] shrink-0" />
                    )}
                  </button>
                );
              })}

              {headerType === 'playlist' &&
                currentPlaylistId &&
                onRemoveTrackFromPlaylist && (
                  <>
                    <div className="my-1 border-t border-white/10" />
                    <button
                      type="button"
                      onClick={() => {
                        onRemoveTrackFromPlaylist(track.id);
                        onToggleMenu(null);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-white/10 text-rose-400 text-left cursor-pointer"
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
  tracks,
  allPlaylists,
  currentPlaylistId,
  currentTrackId,
  isPlaying,
  isShuffle,
  onPlayAll,
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
  const [sourceFilter, setSourceFilter] = useState<'all' | 'local' | 'youtube'>(
    'all'
  );

  useEffect(() => {
    if (initialGenre) {
      setSelectedGenre(initialGenre);
    }
  }, [initialGenre]);
  const [sortField, setSortField] = useState<SortKey>('default');
  const [sortAsc, setSortAsc] = useState(true);
  const [openMenuTrackId, setOpenMenuTrackId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const availableGenres = useMemo(() => {
    const set = new Set<string>();
    for (const t of tracks) {
      if (t.genre) set.add(t.genre);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'fr'));
  }, [tracks]);

  const displayedTracks = useMemo(() => {
    let filtered = filterTracks(tracks, tableFilter, selectedGenre);
    if (sourceFilter === 'local') {
      filtered = filtered.filter((t) =>
        Boolean(t.localFileKey || t.localServerUrl)
      );
    } else if (sourceFilter === 'youtube') {
      filtered = filtered.filter(
        (t) => Boolean(t.youtubeVideoIds && t.youtubeVideoIds.length > 0)
      );
    }
    return sortTracks(filtered, sortField, sortAsc ? 'asc' : 'desc');
  }, [tracks, tableFilter, selectedGenre, sourceFilter, sortField, sortAsc]);

  const displayedTracksRef = useRef<Track[]>(displayedTracks);
  displayedTracksRef.current = displayedTracks;

  const handleRowPlay = useCallback(
    (track: Track) => {
      onPlayTrackInContext(track, displayedTracksRef.current);
    },
    [onPlayTrackInContext]
  );

  const totalDuration = useMemo(() => totalDurationLabel(tracks), [tracks]);

  // Reset pagination & menu when view, filter, or sort changes
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
    setOpenMenuTrackId(null);
  }, [
    headerType,
    title,
    currentPlaylistId,
    tableFilter,
    selectedGenre,
    sourceFilter,
    sortField,
    sortAsc,
  ]);

  useEffect(() => {
    if (selectedGenre !== 'all' && !availableGenres.includes(selectedGenre)) {
      setSelectedGenre('all');
    }
  }, [availableGenres, selectedGenre]);

  const visibleTracks = useMemo(
    () => displayedTracks.slice(0, visibleCount),
    [displayedTracks, visibleCount]
  );

  const handleContainerScroll = () => {
    const el = scrollContainerRef.current;
    if (!el || visibleCount >= displayedTracks.length) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 400) {
      setVisibleCount((prev) =>
        Math.min(prev + PAGE_SIZE, displayedTracks.length)
      );
    }
  };

  const handleSortClick = (field: SortKey) => {
    if (sortField === field) {
      setSortAsc((prev) => !prev);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const isCurrentContextPlaying =
    isPlaying && displayedTracks.some((t) => t.id === currentTrackId);

  const headerGradient =
    headerType === 'liked'
      ? 'from-[#5038a0] via-[#2b1e58] to-[#121212]'
      : headerType === 'artist'
        ? 'from-[#1e4635] via-[#162720] to-[#121212]'
        : 'from-[#2a3b4c] via-[#1a222b] to-[#121212]';

  const headerBadge =
    headerType === 'liked'
      ? 'Playlist'
      : headerType === 'artist'
        ? 'Artiste'
        : headerType === 'all'
          ? 'Catalogue complet'
          : 'Playlist';

  return (
    <div
      ref={scrollContainerRef}
      onScroll={handleContainerScroll}
      className="flex-1 flex flex-col min-h-0 bg-[#121212] rounded-lg overflow-y-auto select-none"
    >
      {/* Hero Banner */}
      <div
        className={`bg-gradient-to-b ${headerGradient} px-4 sm:px-6 pt-6 pb-6`}
      >
        <div className="flex flex-col sm:flex-row sm:items-end gap-5 sm:gap-6">
          {headerType === 'liked' ? (
            <div className="w-36 h-36 sm:w-48 sm:h-48 rounded-md bg-gradient-to-br from-[#450af5] via-[#7c5cff] to-[#c4efd9] shadow-[0_12px_36px_rgba(0,0,0,0.55)] flex items-center justify-center shrink-0">
              <Heart className="w-16 h-16 sm:w-20 sm:h-20 text-white fill-white drop-shadow" />
            </div>
          ) : (
            <div className="w-36 h-36 sm:w-48 sm:h-48 rounded-md shadow-[0_12px_36px_rgba(0,0,0,0.55)] overflow-hidden shrink-0">
              <AlbumCover
                src={coverUrl || tracks[0]?.coverUrl || ''}
                alt={title}
                sizeClass="w-full h-full"
                roundedClass={
                  headerType === 'artist' ? 'rounded-full' : 'rounded-md'
                }
              />
            </div>
          )}

          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-xs sm:text-sm font-medium text-white/90">
              {headerBadge}
            </p>
            <h1 className="font-display font-extrabold text-3xl sm:text-5xl lg:text-[64px] leading-[1.04] tracking-tight text-white truncate">
              {title}
            </h1>
            {subtitle && (
              <p className="text-sm text-[#d0d0d0] line-clamp-2">{subtitle}</p>
            )}
            <div className="flex flex-wrap items-center gap-1.5 text-xs sm:text-sm text-white/90 pt-1">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#1ED760] text-black text-xs font-bold">
                {ownerName.slice(0, 1).toUpperCase()}
              </span>
              <span className="font-bold">{ownerName}</span>
              <span className="text-white/60">•</span>
              <span className="text-white/85 font-mono-tabular">
                {displayedTracks.length.toLocaleString('fr-FR')}{' '}
                {displayedTracks.length > 1 ? 'titres' : 'titre'}
              </span>
              {tracks.length > 0 && (
                <>
                  <span className="text-white/60">•</span>
                  <span className="text-white/70 font-mono-tabular">
                    {totalDuration}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Action Controls Row */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4 sm:gap-5">
            <button
              type="button"
              onClick={onPlayAll}
              disabled={displayedTracks.length === 0}
              aria-label={
                isCurrentContextPlaying ? 'Mettre en pause' : 'Lire la liste'
              }
              data-testid="hero-play-btn"
              className="w-14 h-14 rounded-full bg-[#1ED760] hover:bg-[#1fdf64] hover:scale-105 active:scale-100 disabled:opacity-40 text-black flex items-center justify-center shadow-lg transition-transform cursor-pointer"
            >
              {isCurrentContextPlaying ? (
                <Pause className="w-6 h-6 fill-black" />
              ) : (
                <Play className="w-6 h-6 fill-black ml-0.5" />
              )}
            </button>

            <button
              type="button"
              onClick={onToggleShuffle}
              aria-label="Lecture aléatoire"
              title="Lecture aléatoire (S)"
              className={`p-2 rounded-full transition-colors cursor-pointer ${
                isShuffle
                  ? 'text-[#1ED760]'
                  : 'text-[#b3b3b3] hover:text-white'
              }`}
            >
              <Shuffle className="w-6 h-6" />
            </button>

            <button
              type="button"
              onClick={onOpenImportModal}
              aria-label="Importer des MP3 ou sauvegarder"
              title="Importer des MP3 locaux ou exporter la bibliothèque"
              className="p-2 rounded-full text-[#b3b3b3] hover:text-white transition-colors cursor-pointer"
            >
              <Download className="w-6 h-6" />
            </button>

            {headerType === 'playlist' && onDeletePlaylist && (
              <button
                type="button"
                onClick={onDeletePlaylist}
                aria-label="Supprimer la playlist"
                title="Supprimer cette playlist"
                className="p-2 rounded-full text-[#b3b3b3] hover:text-rose-400 transition-colors cursor-pointer"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Inline Filter & Sort */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-[#b3b3b3] absolute left-2.5 pointer-events-none" />
              <input
                type="search"
                value={tableFilter}
                onChange={(e) => setTableFilter(e.target.value)}
                placeholder="Filtrer les titres…"
                aria-label="Filtrer les titres de la liste"
                className="h-8 pl-8 pr-3 w-44 sm:w-52 rounded-md bg-white/10 hover:bg-white/15 focus:bg-white/15 text-xs text-white placeholder-[#c2c2c2] outline-none transition-colors"
              />
            </div>

            <select
              aria-label="Filtrer par source audio"
              value={sourceFilter}
              onChange={(e) =>
                setSourceFilter(e.target.value as 'all' | 'local' | 'youtube')
              }
              className="h-8 px-2.5 rounded-md bg-white/10 text-xs text-white border border-white/10 outline-none cursor-pointer"
            >
              <option value="all" className="bg-[#282828]">
                Toutes sources
              </option>
              <option value="youtube" className="bg-[#282828]">
                Avec lien YouTube
              </option>
              <option value="local" className="bg-[#282828]">
                MP3 Local
              </option>
            </select>
          </div>
        </div>

        {/* Genre Quick Filter Pills */}
        {availableGenres.length > 1 && (
          <div className="mt-4 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              type="button"
              onClick={() => setSelectedGenre('all')}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                selectedGenre === 'all'
                  ? 'bg-white text-black font-semibold'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              Tous les genres
            </button>
            {availableGenres.map((genre) => (
              <button
                key={genre}
                type="button"
                onClick={() =>
                  setSelectedGenre(selectedGenre === genre ? 'all' : genre)
                }
                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  selectedGenre === genre
                    ? 'bg-white text-black font-semibold'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                {genre}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Track Table */}
      <div className="px-2 sm:px-6 pb-10 flex-1">
        {/* Sticky Column Header */}
        <div className="sticky top-0 z-10 bg-[#121212]/95 backdrop-blur-sm border-b border-white/10 grid grid-cols-[36px_minmax(0,1fr)_56px] md:grid-cols-[40px_minmax(0,2fr)_minmax(0,1.3fr)_125px_72px] items-center gap-3 px-3 h-9 text-xs font-medium text-[#b3b3b3]">
          <span className="text-center font-mono-tabular">#</span>
          <button
            type="button"
            onClick={() => handleSortClick('title')}
            className="text-left hover:text-white transition-colors cursor-pointer"
          >
            Titre {sortField === 'title' ? (sortAsc ? '↑' : '↓') : ''}
          </button>
          <button
            type="button"
            onClick={() => handleSortClick('album')}
            className="hidden md:block text-left hover:text-white transition-colors cursor-pointer"
          >
            Album {sortField === 'album' ? (sortAsc ? '↑' : '↓') : ''}
          </button>
          <button
            type="button"
            onClick={() => handleSortClick('default')}
            className="hidden md:block text-left hover:text-white transition-colors cursor-pointer"
          >
            Date d&apos;ajout{' '}
            {sortField === 'default' ? (sortAsc ? '↑' : '↓') : ''}
          </button>
          <button
            type="button"
            onClick={() => handleSortClick('duration')}
            aria-label="Trier par durée"
            className="flex items-center justify-end pr-2 hover:text-white transition-colors cursor-pointer"
          >
            <Clock3 className="w-4 h-4" />
          </button>
        </div>

        {/* Empty State */}
        {displayedTracks.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <p className="text-base font-semibold text-white">
              {headerType === 'liked' && tracks.length === 0
                ? 'Vous n’avez encore aucun titre liké'
                : headerType === 'playlist' && tracks.length === 0
                  ? 'Cette playlist est vide pour le moment'
                  : 'Aucun titre à afficher'}
            </p>
            <p className="text-sm text-[#b3b3b3] max-w-md mx-auto">
              {headerType === 'liked' && tracks.length === 0
                ? 'Parcourez le catalogue YouTube intégral et cliquez sur le cœur (♥) ou le bouton (+) pour enregistrer vos sons favoris ici.'
                : 'Ajustez le filtre, parcourez le catalogue, collez un lien YouTube ou glissez vos MP3 locaux.'}
            </p>
            {onExploreCatalog && tracks.length === 0 && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={onExploreCatalog}
                  className="inline-flex items-center gap-2 h-10 px-5 rounded-full bg-[#1ED760] hover:bg-[#1fdf64] text-black text-xs font-bold transition-colors cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-black" />
                  <span>Explorer le catalogue intégral</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-2 space-y-0.5" data-testid="track-table-body">
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

            {visibleCount < displayedTracks.length && (
              <div className="pt-4 text-center">
                <button
                  type="button"
                  onClick={() =>
                    setVisibleCount((prev) =>
                      Math.min(prev + PAGE_SIZE, displayedTracks.length)
                    )
                  }
                  className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/15 text-xs font-semibold text-white transition-colors cursor-pointer"
                >
                  Afficher plus ({displayedTracks.length - visibleCount}{' '}
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
