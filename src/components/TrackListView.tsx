import { useMemo, useRef, useState } from 'react';
import {
  Check,
  Clock,
  Heart,
  ListPlus,
  MoreHorizontal,
  Pause,
  Play,
  Plus,
  Search,
  Shuffle,
  Trash2,
  Upload,
  Video,
  Youtube,
  ExternalLink,
} from 'lucide-react';
import type { Playlist, SortKey, Track } from '../types/music';
import {
  filterTracks,
  getTrackYouTubeWatchUrl,
  sortTracks,
  totalDurationLabel,
} from '../utils/musicLogic';
import { AlbumCover } from './AlbumCover';

interface TrackListViewProps {
  title: string;
  subtitle?: string;
  isLikedView?: boolean;
  playlist?: Playlist | null;
  tracks: Track[];
  allPlaylists: Playlist[];
  currentTrackId: string | null;
  isPlaying: boolean;
  shuffle: boolean;
  onPlayTrack: (track: Track, queue: Track[]) => void;
  onTogglePlayPause: () => void;
  onToggleShuffle: () => void;
  onToggleLike: (trackId: string) => void;
  onAddTrackToPlaylist: (trackId: string, playlistId: string) => void;
  onRemoveTrackFromPlaylist?: (trackId: string, playlistId: string) => void;
  onAttachLocalFile: (trackId: string, file: File) => void;
  onQueueNext: (track: Track) => void;
  onOpenSearch: () => void;
  onDeletePlaylist?: (playlistId: string) => void;
}

export function TrackListView({
  title,
  subtitle,
  isLikedView = false,
  playlist = null,
  tracks,
  allPlaylists,
  currentTrackId,
  isPlaying,
  shuffle,
  onPlayTrack,
  onTogglePlayPause,
  onToggleShuffle,
  onToggleLike,
  onAddTrackToPlaylist,
  onRemoveTrackFromPlaylist,
  onAttachLocalFile,
  onQueueNext,
  onOpenSearch,
  onDeletePlaylist,
}: TrackListViewProps) {
  const [filterQuery, setFilterQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('default');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [openMenuTrackId, setOpenMenuTrackId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 100;
  const attachInputRef = useRef<HTMLInputElement | null>(null);
  const attachTargetIdRef = useRef<string | null>(null);

  const filteredAndSorted = useMemo(() => {
    const filtered = filterTracks(tracks, filterQuery);
    return sortTracks(filtered, sortKey, sortDir);
  }, [tracks, filterQuery, sortKey, sortDir]);

  const totalPages = Math.ceil(filteredAndSorted.length / PAGE_SIZE) || 1;

  const visibleTracks = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredAndSorted.slice(start, start + PAGE_SIZE);
  }, [filteredAndSorted, currentPage]);

  const isPlayingCurrentList =
    isPlaying &&
    currentTrackId !== null &&
    visibleTracks.some((t) => t.id === currentTrackId);

  const handleHeaderSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const handlePlayAll = () => {
    if (visibleTracks.length === 0) return;
    if (isPlayingCurrentList) {
      onTogglePlayPause();
      return;
    }
    const activeInList = visibleTracks.find((t) => t.id === currentTrackId);
    onPlayTrack(activeInList || visibleTracks[0], visibleTracks);
  };

  const heroCover =
    playlist?.coverUrl || tracks.find((t) => t.coverUrl)?.coverUrl || '';

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#121212] rounded-lg overflow-y-auto relative">
      {/* Hidden file input for attaching full local MP3 to any track */}
      <input
        ref={attachInputRef}
        type="file"
        accept="audio/*,.mp3,.flac,.wav,.m4a,.ogg"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          const targetId = attachTargetIdRef.current;
          if (file && targetId) {
            onAttachLocalFile(targetId, file);
          }
          e.target.value = '';
        }}
      />

      {/* Playlist Hero Header */}
      <div
        className={`px-6 pt-8 pb-6 flex flex-col sm:flex-row items-start sm:items-end gap-6 ${
          isLikedView
            ? 'bg-gradient-to-b from-[#5038a0]/80 via-[#2a1f52]/60 to-[#121212]'
            : 'bg-gradient-to-b from-[#2c3b36]/80 via-[#1b2421]/60 to-[#121212]'
        }`}
      >
        {isLikedView ? (
          <div className="w-40 h-40 sm:w-48 sm:h-48 rounded-md bg-gradient-to-br from-[#450af5] via-[#6d4aff] to-[#c4efd9] shadow-2xl flex items-center justify-center shrink-0">
            <Heart className="w-16 h-16 text-white fill-white" />
          </div>
        ) : (
          <div className="w-40 h-40 sm:w-48 sm:h-48 rounded-md shadow-2xl overflow-hidden shrink-0 bg-[#282828]">
            <AlbumCover
              src={heroCover}
              alt={title}
              sizeClass="w-full h-full"
              roundedClass="rounded-md"
            />
          </div>
        )}

        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-xs font-medium text-white/90">Playlist</p>
          <h1 className="font-display font-extrabold text-3xl sm:text-5xl lg:text-6xl tracking-tight text-white leading-tight [text-wrap:balance]">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-[#cfcfcf] max-w-2xl">{subtitle}</p>
          )}
          <div className="flex flex-wrap items-center gap-1.5 text-sm text-white/90 pt-1">
            <span className="font-semibold">Bibliothèque locale</span>
            <span aria-hidden="true" className="text-white/50">
              ·
            </span>
            <span className="font-mono-tabular">
              {tracks.length} {tracks.length > 1 ? 'titres' : 'titre'}
            </span>
            <span aria-hidden="true" className="text-white/50">
              ·
            </span>
            <span className="text-[#b3b3b3] font-mono-tabular">
              {totalDurationLabel(tracks)}
            </span>
          </div>
        </div>
      </div>

      {/* Controls Toolbar */}
      <div className="px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={handlePlayAll}
            disabled={visibleTracks.length === 0}
            aria-label={isPlayingCurrentList ? 'Mettre en pause' : 'Lire la playlist'}
            className="w-14 h-14 rounded-full bg-[#1ED760] hover:bg-[#1fdf64] hover:scale-105 active:scale-95 disabled:opacity-40 text-black flex items-center justify-center shadow-lg transition-all cursor-pointer"
          >
            {isPlayingCurrentList ? (
              <Pause className="w-6 h-6 fill-black" />
            ) : (
              <Play className="w-6 h-6 fill-black ml-0.5" />
            )}
          </button>

          <button
            type="button"
            onClick={onToggleShuffle}
            aria-label={shuffle ? 'Désactiver la lecture aléatoire' : 'Activer la lecture aléatoire'}
            title="Lecture aléatoire"
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
              shuffle
                ? 'text-[#1ED760] bg-[#1ED760]/10'
                : 'text-[#b3b3b3] hover:text-white'
            }`}
          >
            <Shuffle className="w-5 h-5" />
          </button>

          {playlist && onDeletePlaylist && (
            <button
              type="button"
              onClick={() => onDeletePlaylist(playlist.id)}
              aria-label={`Supprimer la playlist ${playlist.name}`}
              title="Supprimer la playlist"
              className="w-10 h-10 rounded-full flex items-center justify-center text-[#b3b3b3] hover:text-rose-400 hover:bg-white/5 transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search className="w-4 h-4 text-[#b3b3b3] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              aria-label="Filtrer les titres de la playlist"
              placeholder="Filtrer dans la liste..."
              className="h-9 w-52 sm:w-60 pl-9 pr-3 rounded-md bg-[#1f1f1f] hover:bg-[#2a2a2a] focus:bg-[#2a2a2a] text-xs text-white placeholder-[#9a9a9a] border border-transparent focus:border-white/20 outline-none transition-colors"
            />
          </div>

          <select
            aria-label="Trier les titres"
            value={sortKey}
            onChange={(e) => {
              setSortKey(e.target.value as SortKey);
              setSortDir('asc');
            }}
            className="h-9 px-3 rounded-md bg-[#1f1f1f] hover:bg-[#2a2a2a] text-xs font-medium text-[#e5e5e5] border border-transparent focus:border-white/20 outline-none cursor-pointer"
          >
            <option value="default">Ordre personnalisé</option>
            <option value="title">Titre</option>
            <option value="artist">Artiste</option>
            <option value="album">Album</option>
            <option value="duration">Durée</option>
          </select>
        </div>
      </div>

      {/* Track Table */}
      <div className="px-4 sm:px-6 pb-10 flex-1">
        {visibleTracks.length === 0 ? (
          <div className="py-16 text-center space-y-3 border-t border-white/[0.06]">
            <p className="text-base font-semibold text-white">
              {tracks.length === 0
                ? 'Cette playlist est encore vide'
                : 'Aucun titre ne correspond à votre filtre'}
            </p>
            <p className="text-sm text-[#b3b3b3]">
              {tracks.length === 0
                ? 'Recherchez une musique ou importez vos fichiers MP3 locaux.'
                : 'Essayez un autre mot-clé ou réinitialisez la recherche.'}
            </p>
            {tracks.length === 0 ? (
              <button
                type="button"
                onClick={onOpenSearch}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-black text-sm font-bold hover:bg-[#e5e5e5] transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Rechercher des titres</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setFilterQuery('')}
                className="inline-flex items-center px-4 py-2 rounded-full bg-[#242424] text-white text-xs font-semibold hover:bg-[#303030] transition-colors cursor-pointer"
              >
                Afficher tous les titres
              </button>
            )}
          </div>
        ) : (
          <div className="w-full">
            {/* Table Column Headers */}
            <div className="grid grid-cols-[32px_1fr_auto] md:grid-cols-[32px_minmax(0,4fr)_minmax(0,2.2fr)_104px_104px] items-center gap-3 px-3 py-2 text-xs font-medium text-[#b3b3b3] border-b border-white/[0.08] mb-2 sticky top-0 bg-[#121212] z-10">
              <div className="text-center font-mono-tabular">#</div>
              <button
                type="button"
                onClick={() => handleHeaderSort('title')}
                className="text-left hover:text-white transition-colors cursor-pointer"
              >
                Titre {sortKey === 'title' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
              </button>
              <button
                type="button"
                onClick={() => handleHeaderSort('album')}
                className="hidden md:block text-left hover:text-white transition-colors cursor-pointer"
              >
                Album {sortKey === 'album' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
              </button>
              <div className="hidden md:block text-left">Date d&apos;ajout</div>
              <div className="flex items-center justify-end pr-2">
                <button
                  type="button"
                  onClick={() => handleHeaderSort('duration')}
                  aria-label="Trier par durée"
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  <Clock className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Rows */}
            <div className="space-y-0.5" data-testid="track-list-rows">
              {visibleTracks.map((track, idx) => {
                const isActive = currentTrackId === track.id;
                const isTrackPlaying = isActive && isPlaying;
                const menuOpen = openMenuTrackId === track.id;

                return (
                  <div
                    key={track.id}
                    onDoubleClick={() => onPlayTrack(track, visibleTracks)}
                    className={`group relative grid grid-cols-[32px_1fr_auto] md:grid-cols-[32px_minmax(0,4fr)_minmax(0,2.2fr)_104px_104px] items-center gap-3 px-3 h-14 rounded-md transition-colors ${
                      isActive ? 'bg-white/[0.1]' : 'hover:bg-white/[0.07]'
                    }`}
                  >
                    {/* Index / Play Trigger / Equalizer */}
                    <div className="flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() =>
                          isTrackPlaying
                            ? onTogglePlayPause()
                            : onPlayTrack(track, visibleTracks)
                        }
                        aria-label={
                          isTrackPlaying
                            ? `Mettre en pause ${track.title}`
                            : `Lire ${track.title}`
                        }
                        className="w-8 h-8 flex items-center justify-center cursor-pointer"
                      >
                        {isTrackPlaying ? (
                          <>
                            <span className="flex items-end gap-[2px] h-3.5 group-hover:hidden">
                              <span className="w-[3px] h-full bg-[#1ED760] rounded-xs animate-eq-1" />
                              <span className="w-[3px] h-full bg-[#1ED760] rounded-xs animate-eq-2" />
                              <span className="w-[3px] h-full bg-[#1ED760] rounded-xs animate-eq-3" />
                            </span>
                            <Pause className="w-4 h-4 text-white fill-white hidden group-hover:block" />
                          </>
                        ) : (
                          <>
                            <span
                              className={`text-sm font-mono-tabular group-hover:hidden ${
                                isActive ? 'text-[#1ED760]' : 'text-[#b3b3b3]'
                              }`}
                            >
                              {idx + 1}
                            </span>
                            <Play className="w-4 h-4 text-white fill-white hidden group-hover:block" />
                          </>
                        )}
                      </button>
                    </div>

                    {/* Title + Cover + Badges + Artist */}
                    <div className="flex items-center gap-3 min-w-0">
                      <AlbumCover
                        src={track.coverUrl}
                        alt={`${track.title} — ${track.artist}`}
                        sizeClass="w-10 h-10"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <button
                            type="button"
                            onClick={() => onPlayTrack(track, visibleTracks)}
                            className={`text-[15px] font-medium truncate text-left hover:underline cursor-pointer ${
                              isActive ? 'text-[#1ED760]' : 'text-white'
                            }`}
                          >
                            {track.title}
                          </button>
                          {(track.sourceKind === 'local-idb' ||
                            track.sourceKind === 'local-folder') && (
                            <span className="text-[10px] font-semibold text-[#1ED760] shrink-0">
                              MP3 Local
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 min-w-0 mt-0.5">
                          {track.explicit && (
                            <span
                              title="Contenu explicite"
                              className="inline-flex items-center justify-center w-4 h-4 rounded-[2px] bg-[#b3b3b3]/80 text-[#121212] text-[10px] font-bold leading-none shrink-0"
                            >
                              E
                            </span>
                          )}
                          {track.hasClip && (
                            <Video
                              className="w-3.5 h-3.5 text-[#b3b3b3] shrink-0"
                              aria-label="Clip vidéo disponible"
                            />
                          )}
                          <span className="text-[13px] text-[#b3b3b3] group-hover:text-white/90 truncate">
                            {track.artist}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Album */}
                    <div className="hidden md:block text-[13px] text-[#b3b3b3] group-hover:text-white/90 truncate">
                      {track.album}
                    </div>

                    {/* Date Added */}
                    <div className="hidden md:block text-[13px] text-[#b3b3b3] truncate">
                      {track.addedAt}
                    </div>

                    {/* Actions: Liked Checkmark + Duration + Row Menu */}
                    <div className="flex items-center justify-end gap-2.5">
                      <button
                        type="button"
                        onClick={() => onToggleLike(track.id)}
                        aria-label={
                          track.liked
                            ? `Retirer ${track.title} des titres likés`
                            : `Aimer ${track.title}`
                        }
                        className={`w-6 h-6 rounded-full flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                          track.liked
                            ? 'bg-[#1ED760] text-black hover:scale-105'
                            : 'border border-white/40 text-transparent hover:border-white hover:text-white opacity-0 group-hover:opacity-100 focus:opacity-100'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </button>

                      <span className="w-10 text-right text-[13px] text-[#b3b3b3] font-mono-tabular">
                        {track.durationLabel}
                      </span>

                      <div className="relative">
                        <button
                          type="button"
                          onClick={() =>
                            setOpenMenuTrackId(menuOpen ? null : track.id)
                          }
                          aria-label={`Options pour ${track.title}`}
                          className="w-7 h-7 rounded-full flex items-center justify-center text-[#b3b3b3] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>

                        {menuOpen && (
                          <>
                            <div
                              className="fixed inset-0 z-20"
                              onClick={() => setOpenMenuTrackId(null)}
                            />
                            <div className="absolute right-0 top-8 z-30 w-56 rounded-md bg-[#282828] shadow-2xl border border-white/10 py-1 text-xs text-[#e5e5e5]">
                              <button
                                type="button"
                                onClick={() => {
                                  onQueueNext(track);
                                  setOpenMenuTrackId(null);
                                }}
                                className="w-full px-3 py-2 text-left hover:bg-white/10 flex items-center gap-2.5 cursor-pointer"
                              >
                                <ListPlus className="w-4 h-4 text-[#b3b3b3]" />
                                <span>Lire ensuite</span>
                              </button>

                              <a
                                href={getTrackYouTubeWatchUrl(track)}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() => setOpenMenuTrackId(null)}
                                className="w-full px-3 py-2 text-left hover:bg-white/10 flex items-center justify-between text-white transition-colors cursor-pointer"
                              >
                                <span className="flex items-center gap-2.5">
                                  <Youtube className="w-4 h-4 text-red-500 fill-red-500" />
                                  <span>Regarder sur YouTube</span>
                                </span>
                                <ExternalLink className="w-3.5 h-3.5 text-[#9a9a9a]" />
                              </a>

                              <button
                                type="button"
                                onClick={() => {
                                  attachTargetIdRef.current = track.id;
                                  attachInputRef.current?.click();
                                  setOpenMenuTrackId(null);
                                }}
                                className="w-full px-3 py-2 text-left hover:bg-white/10 flex items-center gap-2.5 cursor-pointer"
                              >
                                <Upload className="w-4 h-4 text-[#1ED760]" />
                                <span>Associer un MP3 local</span>
                              </button>

                              {allPlaylists.length > 0 && (
                                <div className="border-t border-white/10 my-1 pt-1">
                                  <p className="px-3 py-1 text-[11px] text-[#9a9a9a] font-medium">
                                    Ajouter à une playlist
                                  </p>
                                  {allPlaylists.map((pl) => (
                                    <button
                                      key={pl.id}
                                      type="button"
                                      onClick={() => {
                                        onAddTrackToPlaylist(track.id, pl.id);
                                        setOpenMenuTrackId(null);
                                      }}
                                      className="w-full px-3 py-1.5 text-left hover:bg-white/10 truncate cursor-pointer"
                                    >
                                      {pl.name}
                                    </button>
                                  ))}
                                </div>
                              )}

                              {playlist && onRemoveTrackFromPlaylist && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onRemoveTrackFromPlaylist(track.id, playlist.id);
                                    setOpenMenuTrackId(null);
                                  }}
                                  className="w-full px-3 py-2 text-left text-rose-400 hover:bg-white/10 border-t border-white/10 mt-1 flex items-center gap-2 cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  <span>Retirer de cette playlist</span>
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls (100 per page) */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/[0.08] text-xs text-[#b3b3b3]">
                <div>
                  Affichage de {(currentPage - 1) * PAGE_SIZE + 1} à {Math.min(currentPage * PAGE_SIZE, filteredAndSorted.length)} sur {filteredAndSorted.length.toLocaleString()} titres
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => {
                      setCurrentPage((p) => Math.max(1, p - 1));
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="px-3 py-1.5 rounded bg-[#242424] hover:bg-[#303030] text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  >
                    Précédent
                  </button>
                  <span className="font-mono-tabular px-2 text-white">
                    Page {currentPage} / {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => {
                      setCurrentPage((p) => Math.min(totalPages, p + 1));
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="px-3 py-1.5 rounded bg-[#242424] hover:bg-[#303030] text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  >
                    Suivant
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
