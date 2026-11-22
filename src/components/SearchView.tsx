import { memo, useEffect, useMemo, useState } from 'react';
import {
  Check,
  ExternalLink,
  Heart,
  Link2,
  Loader2,
  Mic2,
  Pause,
  Play,
  Plus,
  Search,
  Sparkles,
  Youtube,
} from 'lucide-react';
import type { Playlist, ResolvedYouTubeMeta, Track } from '../types/music';
import {
  CATALOG_GENRES,
  catalogStore,
  type UserLibraryOverlay,
} from '../utils/catalogEngine';
import {
  extractYouTubeVideoId,
  getYouTubeSearchUrl,
} from '../utils/musicLogic';
import { resolveYouTubeMetadataClient } from '../utils/webCatalogSearch';
import { AlbumCover } from './AlbumCover';
import type { YouTubeTrackDraft } from './YouTubeLinkModal';

interface SearchViewProps {
  query: string;
  onQueryChange: (q: string) => void;
  catalogCount: number;
  catalogVersion: number;
  overlay: UserLibraryOverlay;
  playlists: Playlist[];
  currentTrackId: string | null;
  isPlaying: boolean;
  onPlayLibraryTrack: (track: Track, queue: Track[]) => void;
  onSelectArtist: (artistName: string) => void;
  onToggleLike: (trackId: string) => void;
  onAddTrackToPlaylist: (trackId: string, playlistId: string) => void;
  onAddYouTubeDrafts: (
    drafts: YouTubeTrackDraft[],
    playlistId?: string,
    playImmediately?: boolean
  ) => void;
  onOpenYouTubeModal: () => void;
}

const QUICK_SEARCH_IDEAS = [
  { label: 'Stromae', query: 'Stromae', accent: 'from-emerald-600/30 to-[#121521]' },
  { label: 'Daft Punk', query: 'Daft Punk', accent: 'from-cyan-600/30 to-[#121521]' },
  { label: 'Ninho', query: 'Ninho', accent: 'from-amber-600/30 to-[#121521]' },
  { label: 'The Weeknd', query: 'The Weeknd', accent: 'from-rose-600/30 to-[#121521]' },
  { label: 'Queen', query: 'Queen', accent: 'from-purple-600/30 to-[#121521]' },
  { label: 'Hans Zimmer', query: 'Hans Zimmer', accent: 'from-indigo-600/30 to-[#121521]' },
  { label: 'Burna Boy', query: 'Burna Boy', accent: 'from-lime-600/30 to-[#121521]' },
  { label: 'YOASOBI', query: 'YOASOBI', accent: 'from-pink-600/30 to-[#121521]' },
];

export const SearchView = memo(function SearchView({
  query,
  onQueryChange,
  catalogCount,
  catalogVersion,
  overlay,
  playlists,
  currentTrackId,
  isPlaying,
  onPlayLibraryTrack,
  onSelectArtist,
  onToggleLike,
  onAddTrackToPlaylist,
  onAddYouTubeDrafts,
  onOpenYouTubeModal,
}: SearchViewProps) {
  const [targetPlaylistId, setTargetPlaylistId] = useState<string>('liked');
  const [genreFilter, setGenreFilter] = useState<string>('all');

  const detectedYtVideoId = useMemo(
    () => extractYouTubeVideoId(query),
    [query]
  );
  const [ytMeta, setYtMeta] = useState<ResolvedYouTubeMeta | null>(null);
  const [ytLoading, setYtLoading] = useState(false);
  const [ytTitle, setYtTitle] = useState('');
  const [ytArtist, setYtArtist] = useState('');

  useEffect(() => {
    if (!detectedYtVideoId) {
      setYtMeta(null);
      setYtLoading(false);
      return;
    }
    let cancelled = false;
    setYtLoading(true);
    resolveYouTubeMetadataClient(detectedYtVideoId)
      .then((meta) => {
        if (cancelled) return;
        setYtMeta(meta);
        setYtTitle(meta.title);
        setYtArtist(meta.artist);
      })
      .finally(() => {
        if (!cancelled) setYtLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [detectedYtVideoId]);

  const searchOutcome = useMemo(() => {
    void catalogVersion;
    const trimmed = query.trim();
    if (!trimmed || detectedYtVideoId) {
      return { totalMatches: 0, tracks: [] as Track[], artists: [] as Array<{ name: string; count: number }> };
    }
    const res = catalogStore.queryCatalog(
      {
        query: trimmed,
        genre: genreFilter,
        limit: 150,
      },
      overlay
    );
    const matchingArtists = catalogStore.queryArtists(trimmed, 6).items;
    return {
      totalMatches: res.totalMatches,
      tracks: res.tracks,
      artists: matchingArtists,
    };
  }, [query, genreFilter, detectedYtVideoId, catalogVersion, overlay]);

  const ytAlreadyAdded = useMemo(() => {
    if (!detectedYtVideoId) return false;
    return Boolean(catalogStore.findTrackByVideoId(detectedYtVideoId, overlay));
  }, [detectedYtVideoId, overlay]);

  return (
    <div className="flex-1 flex flex-col min-h-0 studio-panel rounded-2xl overflow-y-auto relative">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(ellipse_75%_55%_at_25%_0%,rgba(30,215,96,0.12),transparent_65%)]" />

      <div className="relative px-4 sm:px-7 py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-white">
                Recherche Instantanée
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#1ED760]/12 border border-[#1ED760]/25 text-[#1ED760] text-[11px] font-mono-tabular font-bold">
                <Youtube className="w-3 h-3 fill-current" />
                {catalogCount.toLocaleString('fr-FR')} titres
              </span>
            </div>
            <p className="text-sm text-[#8b93a4] mt-1">
              Tapez un titre, un artiste ou collez directement un lien{' '}
              <code className="px-1.5 py-0.5 rounded-md bg-white/[0.08] text-xs text-white font-mono-tabular">
                youtu.be/...
              </code>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="add-target-select" className="text-xs text-[#8b93a4]">
              Destination (+) :
            </label>
            <select
              id="add-target-select"
              value={targetPlaylistId}
              onChange={(e) => setTargetPlaylistId(e.target.value)}
              className="h-9 px-3 rounded-xl bg-[#131722] text-xs font-semibold text-white border border-white/[0.09] outline-none cursor-pointer"
            >
              <option value="liked">Titres likés</option>
              {playlists.map((pl) => (
                <option key={pl.id} value={pl.id}>
                  {pl.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Direct YouTube Share Link Card */}
        {detectedYtVideoId && (
          <div className="p-5 rounded-2xl bg-gradient-to-br from-rose-950/50 via-[#161822] to-[#11131b] border border-rose-500/35 space-y-4 shadow-xl">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/18 text-rose-300 text-xs font-semibold border border-rose-500/30">
              <Youtube className="w-3.5 h-3.5 fill-current" />
              Lien YouTube détecté ({detectedYtVideoId})
            </span>

            {ytLoading || !ytMeta ? (
              <div className="flex items-center gap-2.5 text-xs text-[#9ca3b0] py-3">
                <Loader2 className="w-4 h-4 animate-spin text-[#1ED760]" />
                <span>Extraction automatique du titre et de l&apos;artiste…</span>
              </div>
            ) : (
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <AlbumCover
                  src={ytMeta.coverUrl}
                  alt={ytTitle || ytMeta.title}
                  sizeClass="w-24 h-24"
                  roundedClass="rounded-xl"
                />

                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[11px] text-[#8b93a4]">
                      Titre
                    </label>
                    <input
                      type="text"
                      value={ytTitle}
                      onChange={(e) => setYtTitle(e.target.value)}
                      className="w-full h-9 px-3 rounded-xl bg-black/45 text-sm text-white border border-white/15 focus:border-[#1ED760] outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[11px] text-[#8b93a4]">
                      Artiste
                    </label>
                    <input
                      type="text"
                      value={ytArtist}
                      onChange={(e) => setYtArtist(e.target.value)}
                      className="w-full h-9 px-3 rounded-xl bg-black/45 text-sm text-white border border-white/15 focus:border-[#1ED760] outline-none"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      onAddYouTubeDrafts(
                        [
                          {
                            videoId: ytMeta.videoId,
                            title: ytTitle.trim() || ytMeta.title,
                            artist: ytArtist.trim() || ytMeta.artist,
                            coverUrl: ytMeta.coverUrl,
                          },
                        ],
                        targetPlaylistId === 'liked'
                          ? undefined
                          : targetPlaylistId,
                        true
                      )
                    }
                    className="inline-flex items-center gap-2 h-10 px-4.5 rounded-full bg-[#1ED760] hover:bg-[#22e668] text-black text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-black" />
                    <span>Écouter en entier</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      onAddYouTubeDrafts(
                        [
                          {
                            videoId: ytMeta.videoId,
                            title: ytTitle.trim() || ytMeta.title,
                            artist: ytArtist.trim() || ytMeta.artist,
                            coverUrl: ytMeta.coverUrl,
                          },
                        ],
                        targetPlaylistId === 'liked'
                          ? undefined
                          : targetPlaylistId,
                        false
                      )
                    }
                    className={`inline-flex items-center gap-1.5 h-10 px-4 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                      ytAlreadyAdded
                        ? 'bg-[#1ED760]/15 text-[#1ED760] border border-[#1ED760]/40'
                        : 'bg-white text-black hover:bg-[#e5e7eb]'
                    }`}
                  >
                    {ytAlreadyAdded ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Déjà présent</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        <span>Ajouter</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {!query.trim() ? (
          <div className="space-y-7">
            <div className="p-4 sm:p-5 rounded-2xl studio-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-rose-500/15 border border-rose-500/25 flex items-center justify-center text-rose-400 shrink-0">
                  <Link2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">
                    Importez plusieurs liens YouTube d&apos;un seul coup
                  </p>
                  <p className="text-xs text-[#8b93a4] mt-0.5">
                    Collez une liste de liens YouTube / YouTube Music pour les
                    ajouter à une playlist personnelle.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onOpenYouTubeModal}
                className="inline-flex items-center justify-center gap-1.5 h-9.5 px-4 rounded-xl bg-white hover:bg-[#e5e7eb] text-black text-xs font-bold transition-colors shrink-0 cursor-pointer"
              >
                <Youtube className="w-4 h-4 text-rose-600 fill-rose-600" />
                <span>Multi-liens YouTube</span>
              </button>
            </div>

            <div className="space-y-3.5">
              <h2 className="font-display font-bold text-lg text-white">
                Recherches populaires
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {QUICK_SEARCH_IDEAS.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => onQueryChange(item.query)}
                    className={`p-4 rounded-2xl bg-gradient-to-br ${item.accent} border border-white/[0.08] hover:border-white/20 text-left flex flex-col justify-between min-h-[88px] transition-all cursor-pointer`}
                  >
                    <span className="font-display font-bold text-base text-white">
                      {item.label}
                    </span>
                    <span className="text-[11px] text-[#9ca3b0] flex items-center gap-1 mt-2">
                      <Search className="w-3 h-3" />
                      Rechercher
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : !detectedYtVideoId ? (
          <div className="space-y-5">
            {/* Genre Filter Pills inside Search */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
              <button
                type="button"
                onClick={() => setGenreFilter('all')}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  genreFilter === 'all'
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
                  onClick={() => setGenreFilter(g.name)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                    genreFilter === g.name
                      ? 'bg-[#1ED760] text-black font-bold'
                      : 'bg-white/[0.05] text-[#9ca3b0] hover:text-white border border-white/[0.07]'
                  }`}
                >
                  {g.name}
                </button>
              ))}
            </div>

            {/* Matching Artist Chips */}
            {searchOutcome.artists.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-[#7d8596] mr-1">Artistes :</span>
                {searchOutcome.artists.map((a) => (
                  <button
                    key={a.name}
                    type="button"
                    onClick={() => onSelectArtist(a.name)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] text-xs font-semibold text-white transition-colors cursor-pointer"
                  >
                    <Mic2 className="w-3 h-3 text-[#1ED760]" />
                    <span>{a.name}</span>
                    <span className="text-[10.5px] font-mono-tabular text-[#8b93a4]">
                      ({a.count})
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Results Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.07] pb-3">
              <div className="flex items-center gap-3">
                <p className="text-xs text-[#9ca3b0]">
                  <strong className="text-white font-mono-tabular">
                    {searchOutcome.totalMatches.toLocaleString('fr-FR')}
                  </strong>{' '}
                  {searchOutcome.totalMatches > 1
                    ? 'titres trouvés'
                    : 'titre trouvé'}{' '}
                  pour « {query} »
                </p>
                {searchOutcome.tracks.length > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      onPlayLibraryTrack(
                        searchOutcome.tracks[0],
                        searchOutcome.tracks
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1ED760]/15 hover:bg-[#1ED760]/25 text-[#1ED760] text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Tout lire</span>
                  </button>
                )}
              </div>

              <a
                href={getYouTubeSearchUrl(query)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-500/12 hover:bg-rose-500/22 border border-rose-500/25 text-rose-300 text-xs font-semibold transition-colors"
              >
                <Youtube className="w-3.5 h-3.5 fill-current" />
                <span>Chercher sur YouTube</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {searchOutcome.tracks.length === 0 ? (
              <div className="py-14 text-center space-y-4">
                <p className="text-base font-bold text-white">
                  Aucun titre trouvé parmi les{' '}
                  {catalogCount.toLocaleString('fr-FR')} musiques embarquées
                </p>
                <p className="text-sm text-[#8b93a4] max-w-md mx-auto">
                  Ouvrez la recherche YouTube ci-dessous, copiez le lien de la
                  vidéo et collez-le ici pour l&apos;écouter immédiatement en
                  entier.
                </p>
                <a
                  href={getYouTubeSearchUrl(query)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 h-10 px-5 rounded-full bg-[#1ED760] hover:bg-[#22e668] text-black text-xs font-bold transition-colors"
                >
                  <Youtube className="w-4 h-4 fill-black" />
                  <span>Trouver « {query} » sur YouTube</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            ) : (
              <div className="space-y-1" data-testid="search-results-list">
                {searchOutcome.tracks.map((track) => {
                  const isCurrent = currentTrackId === track.id;
                  const active = isCurrent && isPlaying;
                  const inTargetPlaylist =
                    targetPlaylistId === 'liked'
                      ? track.liked
                      : Boolean(
                          playlists
                            .find((p) => p.id === targetPlaylistId)
                            ?.trackIds.includes(track.id)
                        );

                  return (
                    <div
                      key={track.id}
                      className={`group flex items-center justify-between gap-4 px-3 py-2 rounded-xl transition-colors track-row-contain ${
                        isCurrent
                          ? 'bg-[#1ED760]/[0.08] border border-[#1ED760]/25'
                          : 'hover:bg-white/[0.05] border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={() =>
                            onPlayLibraryTrack(track, searchOutcome.tracks)
                          }
                          aria-label={
                            active
                              ? `Mettre en pause ${track.title}`
                              : `Écouter ${track.title}`
                          }
                          className="relative w-11 h-11 rounded-lg overflow-hidden shrink-0 cursor-pointer"
                        >
                          <AlbumCover
                            src={track.coverUrl}
                            alt={track.title}
                            sizeClass="w-11 h-11"
                            roundedClass="rounded-lg"
                          />
                          <span
                            className={`absolute inset-0 bg-black/55 flex items-center justify-center transition-opacity ${
                              active
                                ? 'opacity-100'
                                : 'opacity-0 group-hover:opacity-100'
                            }`}
                          >
                            {active ? (
                              <Pause className="w-5 h-5 text-[#1ED760] fill-[#1ED760]" />
                            ) : (
                              <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                            )}
                          </span>
                        </button>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <button
                              type="button"
                              onClick={() =>
                                onPlayLibraryTrack(track, searchOutcome.tracks)
                              }
                              className={`text-[14.5px] font-semibold truncate text-left hover:underline cursor-pointer ${
                                isCurrent ? 'text-[#1ED760]' : 'text-white'
                              }`}
                            >
                              {track.title}
                            </button>
                            {active && (
                              <span className="inline-flex items-end gap-0.5 h-3.5 shrink-0">
                                <span className="w-0.5 h-3 bg-[#1ED760] animate-eq-1" />
                                <span className="w-0.5 h-3 bg-[#1ED760] animate-eq-2" />
                                <span className="w-0.5 h-3 bg-[#1ED760] animate-eq-3" />
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-[#8b93a4] truncate mt-0.5">
                            <button
                              type="button"
                              onClick={() => onSelectArtist(track.artist)}
                              className="hover:text-white hover:underline truncate cursor-pointer"
                            >
                              {track.artist}
                            </button>
                            {track.genre && (
                              <>
                                <span>·</span>
                                <span className="text-[#6e7787] truncate">
                                  {track.genre}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="hidden sm:inline text-xs text-[#8b93a4] font-mono-tabular">
                          {track.durationLabel}
                        </span>

                        <button
                          type="button"
                          onClick={() => {
                            if (targetPlaylistId === 'liked') {
                              onToggleLike(track.id);
                            } else {
                              onAddTrackToPlaylist(track.id, targetPlaylistId);
                            }
                          }}
                          className={`inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                            inTargetPlaylist
                              ? 'bg-[#1ED760]/15 text-[#1ED760] border border-[#1ED760]/35'
                              : 'bg-white/[0.07] text-white hover:bg-white/[0.14] border border-white/[0.08]'
                          }`}
                        >
                          {targetPlaylistId === 'liked' ? (
                            <>
                              <Heart
                                className={`w-3.5 h-3.5 ${
                                  track.liked ? 'fill-[#1ED760]' : ''
                                }`}
                              />
                              <span>{track.liked ? 'Liké' : 'Liker'}</span>
                            </>
                          ) : inTargetPlaylist ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Ajouté</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5" />
                              <span>Ajouter</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
});
