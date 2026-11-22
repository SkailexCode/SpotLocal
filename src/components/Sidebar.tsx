import { memo, useMemo, useState } from 'react';
import {
  Compass,
  Disc3,
  FolderPlus,
  Heart,
  Library,
  Link2,
  ListMusic,
  Mic2,
  Plus,
  Radio,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import type { ActiveView, Playlist } from '../types/music';
import { catalogStore } from '../utils/catalogEngine';
import { AlbumCover } from './AlbumCover';

interface SidebarProps {
  activeView: ActiveView;
  selectedPlaylistId: string | null;
  selectedArtist: string | null;
  likedCount: number;
  catalogCount: number;
  artistCount: number;
  catalogVersion: number;
  playlists: Playlist[];
  onGoHome: () => void;
  onSelectLiked: () => void;
  onSelectAllTracks: () => void;
  onSelectMoods: () => void;
  onSelectArtist: (artistName: string) => void;
  onSelectPlaylist: (id: string) => void;
  onCreatePlaylist: () => void;
  onOpenImportModal: () => void;
  onOpenYouTubeModal: () => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

const ARTISTS_PAGE_SIZE = 70;

export const Sidebar = memo(function Sidebar({
  activeView,
  selectedPlaylistId,
  selectedArtist,
  likedCount,
  catalogCount,
  artistCount,
  catalogVersion,
  playlists,
  onGoHome,
  onSelectLiked,
  onSelectAllTracks,
  onSelectMoods,
  onSelectArtist,
  onSelectPlaylist,
  onCreatePlaylist,
  onOpenImportModal,
  onOpenYouTubeModal,
  mobileOpen = false,
  onCloseMobile,
}: SidebarProps) {
  const [tab, setTab] = useState<'playlists' | 'artists'>('playlists');
  const [artistQuery, setArtistQuery] = useState('');
  const [artistLimit, setArtistLimit] = useState(ARTISTS_PAGE_SIZE);

  const artistResult = useMemo(() => {
    void catalogVersion;
    if (tab !== 'artists') return { totalArtists: artistCount, items: [] };
    return catalogStore.queryArtists(artistQuery, artistLimit);
  }, [tab, artistQuery, artistLimit, artistCount, catalogVersion]);

  const navContent = (
    <aside className="w-[292px] xl:w-[310px] studio-panel rounded-2xl flex flex-col shrink-0 select-none overflow-hidden h-full">
      {/* Section 1: Studio Navigation */}
      <div className="p-3 space-y-1 border-b border-white/[0.06]">
        <div className="flex items-center justify-between px-2 pb-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#6e7787]">
            Exploration
          </span>
          {onCloseMobile && (
            <button
              type="button"
              onClick={onCloseMobile}
              aria-label="Fermer le panneau"
              className="lg:hidden w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-[#9ca3b0] hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => {
            onGoHome();
            onCloseMobile?.();
          }}
          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-[13.5px] font-semibold transition-all cursor-pointer ${
            activeView === 'home'
              ? 'bg-white/[0.1] text-white shadow-xs'
              : 'text-[#9ca3b0] hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <span className="flex items-center gap-3">
            <Compass
              className={`w-4.5 h-4.5 ${
                activeView === 'home' ? 'text-[#1ED760]' : ''
              }`}
            />
            <span>Accueil Studio</span>
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            onSelectAllTracks();
            onCloseMobile?.();
          }}
          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-[13.5px] font-semibold transition-all cursor-pointer ${
            activeView === 'all-tracks'
              ? 'bg-white/[0.1] text-white shadow-xs'
              : 'text-[#9ca3b0] hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <span className="flex items-center gap-3">
            <Disc3
              className={`w-4.5 h-4.5 ${
                activeView === 'all-tracks' ? 'text-[#1ED760]' : ''
              }`}
            />
            <span>Catalogue Intégral</span>
          </span>
          <span className="px-2 py-0.5 rounded-full bg-[#1ED760]/12 border border-[#1ED760]/25 text-[#1ED760] text-[10.5px] font-mono-tabular font-bold">
            {catalogCount.toLocaleString('fr-FR')}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            onSelectMoods();
            onCloseMobile?.();
          }}
          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-[13.5px] font-semibold transition-all cursor-pointer ${
            activeView === 'moods'
              ? 'bg-white/[0.1] text-white shadow-xs'
              : 'text-[#9ca3b0] hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <span className="flex items-center gap-3">
            <Radio
              className={`w-4.5 h-4.5 ${
                activeView === 'moods' ? 'text-[#1ED760]' : ''
              }`}
            />
            <span>Ambiances &amp; Radios</span>
          </span>
          <span className="text-[10.5px] font-mono-tabular text-[#7d8596]">
            10 radios
          </span>
        </button>
      </div>

      {/* Section 2: Personal Library Header + Tabs */}
      <div className="px-3.5 pt-3.5 pb-2 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[#c8cdd6]">
            <Library className="w-4 h-4 text-[#1ED760]" />
            <span className="font-display font-bold text-[13.5px]">
              Ma Bibliothèque
            </span>
          </div>

          <button
            type="button"
            onClick={onCreatePlaylist}
            title="Créer une nouvelle playlist"
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] text-xs font-semibold text-white transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-[#1ED760]" />
            <span>Créer</span>
          </button>
        </div>

        {/* Segmented Control: Playlists vs 47k Artists */}
        <div className="grid grid-cols-2 p-1 rounded-xl bg-[#090b10] border border-white/[0.06]">
          <button
            type="button"
            onClick={() => setTab('playlists')}
            className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              tab === 'playlists'
                ? 'bg-[#1a1f2e] text-white shadow-xs'
                : 'text-[#8b93a4] hover:text-white'
            }`}
          >
            Bibliothèque
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('artists');
              setArtistLimit(ARTISTS_PAGE_SIZE);
            }}
            className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              tab === 'artists'
                ? 'bg-[#1a1f2e] text-white shadow-xs'
                : 'text-[#8b93a4] hover:text-white'
            }`}
          >
            Artistes ({Math.round(artistCount / 1000)}k)
          </button>
        </div>
      </div>

      {/* Section 3: Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-2.5 pb-3 space-y-1">
        {tab === 'playlists' ? (
          <>
            {/* Liked Songs Card */}
            <button
              type="button"
              onClick={() => {
                onSelectLiked();
                onCloseMobile?.();
              }}
              className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-all cursor-pointer ${
                activeView === 'liked'
                  ? 'bg-white/[0.1] border border-white/[0.1]'
                  : 'hover:bg-white/[0.05] border border-transparent'
              }`}
            >
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-emerald-300 flex items-center justify-center shrink-0 shadow-md">
                <Heart className="w-5 h-5 text-white fill-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className={`text-[13.5px] font-semibold truncate ${
                    activeView === 'liked' ? 'text-[#1ED760]' : 'text-white'
                  }`}
                >
                  Titres likés
                </p>
                <p className="text-xs text-[#8b93a4] truncate font-mono-tabular">
                  {likedCount === 0
                    ? 'Aucun favori enregistré'
                    : `${likedCount} ${likedCount > 1 ? 'titres' : 'titre'}`}
                </p>
              </div>
            </button>

            {/* Clean First-Visit Empty State or User Playlists */}
            {playlists.length === 0 ? (
              <div className="mx-1 mt-3 p-4 rounded-2xl studio-card space-y-3">
                <div className="w-9 h-9 rounded-xl bg-[#1ED760]/15 border border-[#1ED760]/25 flex items-center justify-center text-[#1ED760]">
                  <ListMusic className="w-4.5 h-4.5" />
                </div>
                <div className="space-y-1">
                  <p className="text-[13.5px] font-bold text-white">
                    Créez votre première playlist
                  </p>
                  <p className="text-xs text-[#8b93a4] leading-relaxed">
                    Votre espace est vierge. Piochez parmi{' '}
                    {catalogCount.toLocaleString('fr-FR')} titres intégraux ou vos
                    propres MP3.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onCreatePlaylist}
                  className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-xl bg-white hover:bg-[#e5e7eb] text-black text-xs font-bold transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Nouvelle playlist</span>
                </button>
              </div>
            ) : (
              <div className="pt-1 space-y-1">
                {playlists.map((pl) => {
                  const selected =
                    activeView === 'playlist' && selectedPlaylistId === pl.id;
                  return (
                    <button
                      key={pl.id}
                      type="button"
                      onClick={() => {
                        onSelectPlaylist(pl.id);
                        onCloseMobile?.();
                      }}
                      className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-all cursor-pointer ${
                        selected
                          ? 'bg-white/[0.1] border border-white/[0.1]'
                          : 'hover:bg-white/[0.05] border border-transparent'
                      }`}
                    >
                      <AlbumCover
                        src={pl.coverUrl || ''}
                        alt={pl.name}
                        sizeClass="w-11 h-11"
                        roundedClass="rounded-xl"
                      />
                      <div className="min-w-0 flex-1">
                        <p
                          className={`text-[13.5px] font-semibold truncate ${
                            selected ? 'text-[#1ED760]' : 'text-white'
                          }`}
                        >
                          {pl.name}
                        </p>
                        <p className="text-xs text-[#8b93a4] truncate font-mono-tabular">
                          Playlist · {pl.trackIds.length}{' '}
                          {pl.trackIds.length > 1 ? 'titres' : 'titre'}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <div className="space-y-2 pt-1">
            <div className="relative px-1">
              <Search className="w-3.5 h-3.5 text-[#7d8596] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={artistQuery}
                onChange={(e) => {
                  setArtistQuery(e.target.value);
                  setArtistLimit(ARTISTS_PAGE_SIZE);
                }}
                placeholder={`Filtrer ${artistCount.toLocaleString('fr-FR')} artistes…`}
                className="w-full h-8.5 pl-8.5 pr-3 rounded-xl bg-[#090b10] text-xs text-white placeholder-[#6e7787] border border-white/[0.08] focus:border-[#1ED760]/60 outline-none"
              />
            </div>

            {artistResult.items.map((artist) => {
              const selected =
                activeView === 'artist' && selectedArtist === artist.name;
              return (
                <button
                  key={artist.name}
                  type="button"
                  onClick={() => {
                    onSelectArtist(artist.name);
                    onCloseMobile?.();
                  }}
                  className={`w-full flex items-center gap-3 p-2 rounded-xl text-left transition-colors cursor-pointer ${
                    selected ? 'bg-white/[0.1]' : 'hover:bg-white/[0.05]'
                  }`}
                >
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#1d2334] to-[#11141f] border border-white/[0.08] flex items-center justify-center shrink-0 text-[#9ca3b0]">
                    <Mic2 className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-[13px] font-medium truncate ${
                        selected ? 'text-[#1ED760]' : 'text-white'
                      }`}
                    >
                      {artist.name}
                    </p>
                    <p className="text-[11px] text-[#7d8596] font-mono-tabular">
                      {artist.count} {artist.count > 1 ? 'titres' : 'titre'}
                    </p>
                  </div>
                </button>
              );
            })}

            {artistResult.totalArtists > artistResult.items.length && (
              <button
                type="button"
                onClick={() => setArtistLimit((prev) => prev + ARTISTS_PAGE_SIZE)}
                className="w-full py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.09] text-xs font-semibold text-[#b8beca] hover:text-white transition-colors cursor-pointer"
              >
                Afficher plus (
                {(
                  artistResult.totalArtists - artistResult.items.length
                ).toLocaleString('fr-FR')}{' '}
                restants)
              </button>
            )}
          </div>
        )}
      </div>

      {/* Bottom Studio Import Dock */}
      <div className="p-2.5 border-t border-white/[0.06] bg-[#0a0c12]/80 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => {
            onOpenYouTubeModal();
            onCloseMobile?.();
          }}
          className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/18 border border-rose-500/20 text-xs font-semibold text-rose-200 transition-colors cursor-pointer"
        >
          <Link2 className="w-3.5 h-3.5 text-rose-400 shrink-0" />
          <span className="truncate">Lien YouTube</span>
        </button>

        <button
          type="button"
          onClick={() => {
            onOpenImportModal();
            onCloseMobile?.();
          }}
          className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.07] text-xs font-semibold text-[#d1d5db] hover:text-white transition-colors cursor-pointer"
        >
          <FolderPlus className="w-3.5 h-3.5 text-[#1ED760] shrink-0" />
          <span className="truncate">Fichiers MP3</span>
        </button>
      </div>
    </aside>
  );

  return (
    <>
      <div className="hidden lg:flex h-full">{navContent}</div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-xs"
            onClick={onCloseMobile}
          />
          <div className="relative z-10 h-full p-2 flex">
            {navContent}
            <Sparkles className="hidden" />
          </div>
        </div>
      )}
    </>
  );
});
