import { memo, useMemo, useState } from 'react';
import {
  Disc3,
  FileAudio,
  Heart,
  Library,
  Plus,
  Search,
  X,
  Youtube,
} from 'lucide-react';
import type { ActiveView, Playlist, Track } from '../types/music';
import { normalizeText } from '../utils/musicLogic';
import { AlbumCover } from './AlbumCover';

interface SidebarProps {
  activeView: ActiveView;
  selectedPlaylistId: string | null;
  selectedArtist: string | null;
  likedCount: number;
  playlists: Playlist[];
  tracks: Track[];
  onSelectLiked: () => void;
  onSelectAllTracks: () => void;
  onSelectArtist: (artistName: string) => void;
  onSelectPlaylist: (playlistId: string) => void;
  onCreatePlaylist: () => void;
  onOpenImportModal: () => void;
  onOpenYouTubeModal: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const ARTISTS_PAGE_SIZE = 80;

export const Sidebar = memo(function Sidebar({
  activeView,
  selectedPlaylistId,
  selectedArtist,
  likedCount,
  playlists,
  tracks,
  onSelectLiked,
  onSelectAllTracks,
  onSelectArtist,
  onSelectPlaylist,
  onCreatePlaylist,
  onOpenImportModal,
  onOpenYouTubeModal,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const [filterMode, setFilterMode] = useState<'playlists' | 'artists'>(
    'playlists'
  );
  const [artistQuery, setArtistQuery] = useState('');
  const [visibleArtistCount, setVisibleArtistCount] =
    useState(ARTISTS_PAGE_SIZE);

  const artists = useMemo(() => {
    const artistMap = new Map<
      string,
      { name: string; count: number; coverUrl: string }
    >();
    for (const t of tracks) {
      const mainArtist = t.artist.split(',')[0].trim();
      if (!mainArtist) continue;
      const existing = artistMap.get(mainArtist);
      if (existing) {
        existing.count += 1;
        if (!existing.coverUrl && t.coverUrl) {
          existing.coverUrl = t.coverUrl;
        }
      } else {
        artistMap.set(mainArtist, {
          name: mainArtist,
          count: 1,
          coverUrl: t.coverUrl,
        });
      }
    }
    return Array.from(artistMap.values()).sort((a, b) => b.count - a.count);
  }, [tracks]);

  const filteredArtists = useMemo(() => {
    const q = normalizeText(artistQuery);
    if (!q) return artists;
    return artists.filter((a) => normalizeText(a.name).includes(q));
  }, [artists, artistQuery]);

  const trackById = useMemo(
    () => new Map(tracks.map((t) => [t.id, t])),
    [tracks]
  );

  const sidebarContent = (
    <aside
      aria-label="Bibliothèque musicale"
      className="flex flex-col h-full bg-[#121212] rounded-lg overflow-hidden select-none"
    >
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <div className="flex items-center gap-2.5 text-[#b3b3b3]">
          <Library className="w-5 h-5 shrink-0" />
          <span className="font-display font-bold text-[15px] text-[#e5e5e5] whitespace-nowrap">
            Bibliothèque
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onCreatePlaylist}
            aria-label="Créer une playlist"
            title="Créer une playlist"
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#b3b3b3] hover:text-white hover:bg-[#1f1f1f] transition-colors cursor-pointer"
          >
            <Plus className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Fermer la bibliothèque"
            className="lg:hidden w-8 h-8 rounded-full flex items-center justify-center text-[#b3b3b3] hover:text-white hover:bg-[#1f1f1f] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="px-4 pb-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setFilterMode('playlists')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            filterMode === 'playlists'
              ? 'bg-white text-black'
              : 'bg-[#232323] text-white hover:bg-[#2a2a2a]'
          }`}
        >
          Playlists {playlists.length > 0 ? `(${playlists.length})` : ''}
        </button>
        <button
          type="button"
          onClick={() => {
            setFilterMode('artists');
            setVisibleArtistCount(ARTISTS_PAGE_SIZE);
          }}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            filterMode === 'artists'
              ? 'bg-white text-black'
              : 'bg-[#232323] text-white hover:bg-[#2a2a2a]'
          }`}
        >
          Artistes ({artists.length.toLocaleString('fr-FR')})
        </button>
      </div>

      {filterMode === 'artists' && (
        <div className="px-3 pb-2">
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-[#9a9a9a] absolute left-2.5 pointer-events-none" />
            <input
              type="search"
              value={artistQuery}
              onChange={(e) => {
                setArtistQuery(e.target.value);
                setVisibleArtistCount(ARTISTS_PAGE_SIZE);
              }}
              placeholder="Filtrer un artiste…"
              className="w-full h-8 pl-8 pr-2.5 rounded-md bg-[#1e1e1e] text-xs text-white placeholder-[#8e8e8e] outline-none border border-white/[0.06] focus:border-white/20"
            />
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-0.5">
        {filterMode === 'playlists' ? (
          <>
            {/* Liked Tracks */}
            <button
              type="button"
              onClick={() => {
                onSelectLiked();
                onCloseMobile();
              }}
              className={`w-full flex items-center gap-3 p-2 rounded-md text-left transition-colors cursor-pointer ${
                activeView === 'liked' ? 'bg-[#282828]' : 'hover:bg-[#1f1f1f]'
              }`}
            >
              <div className="w-12 h-12 rounded-[4px] bg-gradient-to-br from-[#450af5] via-[#7c5ff5] to-[#c4efd9] flex items-center justify-center shrink-0 shadow-sm">
                <Heart className="w-5 h-5 text-white fill-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className={`text-[15px] font-medium truncate ${
                    activeView === 'liked' ? 'text-[#1ED760]' : 'text-white'
                  }`}
                >
                  Titres likés
                </p>
                <p className="text-[13px] text-[#b3b3b3] truncate">
                  Favoris ·{' '}
                  <span className="font-mono-tabular">{likedCount}</span>{' '}
                  {likedCount > 1 ? 'titres' : 'titre'}
                </p>
              </div>
            </button>

            {/* Full YouTube Catalog */}
            <button
              type="button"
              onClick={() => {
                onSelectAllTracks();
                onCloseMobile();
              }}
              className={`w-full flex items-center gap-3 p-2 rounded-md text-left transition-colors cursor-pointer ${
                activeView === 'all-tracks'
                  ? 'bg-[#282828]'
                  : 'hover:bg-[#1f1f1f]'
              }`}
            >
              <div className="w-12 h-12 rounded-[4px] bg-gradient-to-br from-[#1ED760] via-[#14833b] to-[#121212] flex items-center justify-center shrink-0 shadow-sm">
                <Disc3 className="w-6 h-6 text-black" />
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className={`text-[15px] font-medium truncate ${
                    activeView === 'all-tracks' ? 'text-[#1ED760]' : 'text-white'
                  }`}
                >
                  Catalogue intégral
                </p>
                <p className="text-[13px] text-[#b3b3b3] truncate">
                  YouTube ·{' '}
                  <span className="font-mono-tabular">
                    {tracks.length.toLocaleString('fr-FR')}
                  </span>{' '}
                  titres
                </p>
              </div>
            </button>

            {/* User-created Playlists or First-Visit Empty State */}
            {playlists.length === 0 ? (
              <div className="mx-1 mt-3 p-4 rounded-lg bg-[#1a1a1a] border border-white/[0.06] space-y-2.5">
                <p className="text-sm font-bold text-white leading-snug">
                  Créez votre première playlist
                </p>
                <p className="text-xs text-[#b3b3b3] leading-relaxed">
                  C&apos;est simple : enregistrez vos sons préférés parmi les{' '}
                  {tracks.length.toLocaleString('fr-FR')} clips intégraux.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    onCreatePlaylist();
                    onCloseMobile();
                  }}
                  className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full bg-white hover:bg-[#e5e5e5] text-black text-xs font-bold transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Créer une playlist</span>
                </button>
              </div>
            ) : (
              playlists.map((pl) => {
                const isActive =
                  activeView === 'playlist' && selectedPlaylistId === pl.id;
                const firstTrackCover =
                  pl.coverUrl ||
                  (pl.trackIds[0]
                    ? trackById.get(pl.trackIds[0])?.coverUrl
                    : '') ||
                  '';

                return (
                  <button
                    key={pl.id}
                    type="button"
                    onClick={() => {
                      onSelectPlaylist(pl.id);
                      onCloseMobile();
                    }}
                    className={`w-full flex items-center gap-3 p-2 rounded-md text-left transition-colors cursor-pointer ${
                      isActive ? 'bg-[#282828]' : 'hover:bg-[#1f1f1f]'
                    }`}
                  >
                    {firstTrackCover ? (
                      <AlbumCover
                        src={firstTrackCover}
                        alt={pl.name}
                        sizeClass="w-12 h-12"
                        roundedClass="rounded-[4px]"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-[4px] bg-[#282828] flex items-center justify-center shrink-0">
                        <Disc3 className="w-5 h-5 text-[#b3b3b3]" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-[15px] font-medium truncate ${
                          isActive ? 'text-[#1ED760]' : 'text-white'
                        }`}
                      >
                        {pl.name}
                      </p>
                      <p className="text-[13px] text-[#b3b3b3] truncate">
                        Playlist ·{' '}
                        <span className="font-mono-tabular">
                          {pl.trackIds.length}
                        </span>{' '}
                        {pl.trackIds.length > 1 ? 'titres' : 'titre'}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </>
        ) : (
          <>
            {filteredArtists.slice(0, visibleArtistCount).map((artist) => {
              const isActive =
                activeView === 'artist' && selectedArtist === artist.name;
              return (
                <button
                  key={artist.name}
                  type="button"
                  onClick={() => {
                    onSelectArtist(artist.name);
                    onCloseMobile();
                  }}
                  className={`w-full flex items-center gap-3 p-2 rounded-md text-left transition-colors cursor-pointer ${
                    isActive ? 'bg-[#282828]' : 'hover:bg-[#1f1f1f]'
                  }`}
                >
                  <AlbumCover
                    src={artist.coverUrl}
                    alt={artist.name}
                    sizeClass="w-11 h-11"
                    roundedClass="rounded-full"
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-sm font-medium truncate ${
                        isActive ? 'text-[#1ED760]' : 'text-white'
                      }`}
                    >
                      {artist.name}
                    </p>
                    <p className="text-xs text-[#b3b3b3] truncate">
                      Artiste ·{' '}
                      <span className="font-mono-tabular">{artist.count}</span>{' '}
                      {artist.count > 1 ? 'titres' : 'titre'}
                    </p>
                  </div>
                </button>
              );
            })}
            {visibleArtistCount < filteredArtists.length && (
              <div className="pt-2 pb-1 text-center">
                <button
                  type="button"
                  onClick={() =>
                    setVisibleArtistCount((c) => c + ARTISTS_PAGE_SIZE)
                  }
                  className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/15 text-xs font-semibold text-white cursor-pointer"
                >
                  Afficher plus ({filteredArtists.length - visibleArtistCount})
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <div className="p-3 border-t border-white/[0.06] grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => {
            onOpenYouTubeModal();
            onCloseMobile();
          }}
          className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-md bg-[#1f1f1f] hover:bg-[#2a2a2a] text-xs font-semibold text-white transition-colors cursor-pointer whitespace-nowrap"
        >
          <Youtube className="w-3.5 h-3.5 text-red-500 fill-red-500 shrink-0" />
          <span>Lien YT</span>
        </button>
        <button
          type="button"
          onClick={() => {
            onOpenImportModal();
            onCloseMobile();
          }}
          className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-md bg-[#1f1f1f] hover:bg-[#2a2a2a] text-xs font-semibold text-white transition-colors cursor-pointer whitespace-nowrap"
        >
          <FileAudio className="w-3.5 h-3.5 text-[#1ED760] shrink-0" />
          <span>MP3 local</span>
        </button>
      </div>
    </aside>
  );

  return (
    <>
      <div className="hidden lg:block w-[272px] shrink-0 h-full">
        {sidebarContent}
      </div>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/75"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative z-10 w-[290px] max-w-[85vw] h-full p-2">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
});
