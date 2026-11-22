import { memo, useMemo, useState } from 'react';
import {
  Disc3,
  Headphones,
  Heart,
  Library,
  Mic2,
  Plus,
  Radio,
  Search,
  X,
} from 'lucide-react';
import type { ActiveView, Playlist } from '../types/music';
import { catalogStore } from '../utils/catalogEngine';
import { AlbumCover } from './AlbumCover';

interface SidebarProps {
  activeView: ActiveView;
  selectedPlaylistId: string | null;
  selectedArtist: string | null;
  catalogVersion: number;
  playlists: Playlist[];
  onSelectLiked: () => void;
  onSelectAllTracks: () => void;
  onSelectMoods: () => void;
  onSelectArtist: (artistName: string) => void;
  onSelectPlaylist: (id: string) => void;
  onCreatePlaylist: () => void;
  onOpenImportModal: () => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

const ARTISTS_PAGE_SIZE = 70;

export const Sidebar = memo(function Sidebar({
  activeView,
  selectedPlaylistId,
  selectedArtist,
  catalogVersion,
  playlists,
  onSelectLiked,
  onSelectAllTracks,
  onSelectMoods,
  onSelectArtist,
  onSelectPlaylist,
  onCreatePlaylist,
  onOpenImportModal,
  mobileOpen = false,
  onCloseMobile,
}: SidebarProps) {
  const [tab, setTab] = useState<'playlists' | 'artists'>('playlists');
  const [artistQuery, setArtistQuery] = useState('');
  const [artistLimit, setArtistLimit] = useState(ARTISTS_PAGE_SIZE);

  const artistResult = useMemo(() => {
    void catalogVersion;
    if (tab !== 'artists') return { totalArtists: 0, items: [] };
    return catalogStore.queryArtists(artistQuery, artistLimit);
  }, [tab, artistQuery, artistLimit, catalogVersion]);

  const navContent = (
    <aside className="w-[264px] xl:w-[280px] studio-panel rounded-xl flex flex-col shrink-0 select-none overflow-hidden h-full">
      <div className="px-4 pt-4 pb-3 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[var(--text-main)]">
            <Library className="w-4.5 h-4.5 text-[var(--text-sub)]" />
            <span className="font-display font-bold text-[15px]">
              Bibliothèque
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onCreatePlaylist}
              aria-label="Créer une playlist"
              title="Nouvelle playlist"
              className="w-7.5 h-7.5 rounded-full hover:bg-[var(--bg-elevated)] flex items-center justify-center text-[var(--text-sub)] hover:text-[var(--text-main)] anim-press cursor-pointer"
            >
              <Plus className="w-4.5 h-4.5" />
            </button>

            {onCloseMobile && (
              <button
                type="button"
                onClick={onCloseMobile}
                aria-label="Fermer le panneau"
                className="lg:hidden w-7.5 h-7.5 rounded-full hover:bg-[var(--bg-elevated)] flex items-center justify-center text-[var(--text-sub)] hover:text-[var(--text-main)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setTab('playlists')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
              tab === 'playlists'
                ? 'bg-[var(--pill-active-bg)] text-[var(--pill-active-fg)]'
                : 'bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated-hover)] text-[var(--text-main)]'
            }`}
          >
            Playlists
          </button>

          <button
            type="button"
            onClick={() => setTab('artists')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
              tab === 'artists'
                ? 'bg-[var(--pill-active-bg)] text-[var(--pill-active-fg)]'
                : 'bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated-hover)] text-[var(--text-main)]'
            }`}
          >
            Artistes
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2.5 pb-2 space-y-0.5">
        {tab === 'playlists' ? (
          <>
            <button
              type="button"
              onClick={() => {
                onSelectLiked();
                onCloseMobile?.();
              }}
              className={`w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors cursor-pointer ${
                activeView === 'liked'
                  ? 'bg-[var(--bg-row-active)]'
                  : 'hover:bg-[var(--bg-row-hover)]'
              }`}
            >
              <div className="w-11 h-11 rounded-md bg-[#d96b34] flex items-center justify-center shrink-0">
                <Heart className="w-5 h-5 text-white fill-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className={`text-sm font-semibold truncate ${
                    activeView === 'liked'
                      ? 'text-[var(--accent)]'
                      : 'text-[var(--text-main)]'
                  }`}
                >
                  Titres likés
                </p>
                <p className="text-xs text-[var(--text-sub)] truncate">
                  Playlist
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                onSelectAllTracks();
                onCloseMobile?.();
              }}
              className={`w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors cursor-pointer ${
                activeView === 'all-tracks'
                  ? 'bg-[var(--bg-row-active)]'
                  : 'hover:bg-[var(--bg-row-hover)]'
              }`}
            >
              <div className="w-11 h-11 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex items-center justify-center shrink-0">
                <Disc3 className="w-5 h-5 text-[var(--accent)]" />
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className={`text-sm font-semibold truncate ${
                    activeView === 'all-tracks'
                      ? 'text-[var(--accent)]'
                      : 'text-[var(--text-main)]'
                  }`}
                >
                  Catalogue
                </p>
                <p className="text-xs text-[var(--text-sub)] truncate">
                  Parcourir
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                onSelectMoods();
                onCloseMobile?.();
              }}
              className={`w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors cursor-pointer ${
                activeView === 'moods'
                  ? 'bg-[var(--bg-row-active)]'
                  : 'hover:bg-[var(--bg-row-hover)]'
              }`}
            >
              <div className="w-11 h-11 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex items-center justify-center shrink-0">
                <Radio className="w-5 h-5 text-[var(--accent)]" />
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className={`text-sm font-semibold truncate ${
                    activeView === 'moods'
                      ? 'text-[var(--accent)]'
                      : 'text-[var(--text-main)]'
                  }`}
                >
                  Ambiances
                </p>
                <p className="text-xs text-[var(--text-sub)] truncate">
                  Radios
                </p>
              </div>
            </button>

            {playlists.map((pl) => {
              const active =
                activeView === 'playlist' && selectedPlaylistId === pl.id;
              return (
                <button
                  key={pl.id}
                  type="button"
                  onClick={() => {
                    onSelectPlaylist(pl.id);
                    onCloseMobile?.();
                  }}
                  className={`w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors cursor-pointer ${
                    active
                      ? 'bg-[var(--bg-row-active)]'
                      : 'hover:bg-[var(--bg-row-hover)]'
                  }`}
                >
                  <AlbumCover
                    src={pl.coverUrl}
                    alt={pl.name}
                    sizeClass="w-11 h-11"
                    roundedClass="rounded-md"
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-sm font-semibold truncate ${
                        active
                          ? 'text-[var(--accent)]'
                          : 'text-[var(--text-main)]'
                      }`}
                    >
                      {pl.name}
                    </p>
                    <p className="text-xs text-[var(--text-sub)] truncate">
                      Playlist
                    </p>
                  </div>
                </button>
              );
            })}
          </>
        ) : (
          <div className="space-y-2 pt-1">
            <div className="relative px-1">
              <Search className="w-3.5 h-3.5 text-[var(--text-sub)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={artistQuery}
                onChange={(e) => {
                  setArtistQuery(e.target.value);
                  setArtistLimit(ARTISTS_PAGE_SIZE);
                }}
                placeholder="Rechercher un artiste…"
                className="w-full h-8.5 pl-8.5 pr-3 rounded-lg bg-[var(--bg-input)] focus:bg-[var(--bg-input-focus)] text-xs text-[var(--text-main)] placeholder-[var(--text-sub)] border border-[var(--border-subtle)] focus:border-[var(--accent)] outline-none transition-colors"
              />
            </div>

            <div className="space-y-0.5">
              {artistResult.items.map((item) => {
                const active =
                  activeView === 'artist' && selectedArtist === item.name;
                return (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => {
                      onSelectArtist(item.name);
                      onCloseMobile?.();
                    }}
                    className={`w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors cursor-pointer ${
                      active
                        ? 'bg-[var(--bg-row-active)]'
                        : 'hover:bg-[var(--bg-row-hover)]'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex items-center justify-center shrink-0">
                      <Mic2 className="w-4 h-4 text-[var(--text-sub)]" />
                    </div>
                    <p
                      className={`text-sm font-medium truncate flex-1 ${
                        active
                          ? 'text-[var(--accent)] font-semibold'
                          : 'text-[var(--text-main)]'
                      }`}
                    >
                      {item.name}
                    </p>
                  </button>
                );
              })}

              {artistResult.items.length < artistResult.totalArtists && (
                <button
                  type="button"
                  onClick={() => setArtistLimit((n) => n + ARTISTS_PAGE_SIZE)}
                  className="w-full py-2 text-xs font-semibold text-[var(--accent)] hover:underline cursor-pointer"
                >
                  Voir plus
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="p-3 border-t border-[var(--border-subtle)]">
        <button
          type="button"
          onClick={() => {
            onOpenImportModal();
            onCloseMobile?.();
          }}
          className="w-full h-10 px-4 rounded-lg bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated-hover)] border border-[var(--border-subtle)] flex items-center justify-center gap-2 text-xs font-semibold text-[var(--text-main)] anim-press cursor-pointer"
        >
          <Headphones className="w-4 h-4 text-[var(--accent)]" />
          <span>Ajouter des MP3 locaux</span>
        </button>
      </div>
    </aside>
  );

  return (
    <>
      <div className="hidden lg:flex h-full">{navContent}</div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <button
            type="button"
            aria-label="Fermer le menu"
            onClick={onCloseMobile}
            className="fixed inset-0 bg-black/50"
          />
          <div className="relative z-10 h-full max-w-[86vw] anim-view">
            {navContent}
          </div>
        </div>
      )}
    </>
  );
});
