import { memo, useEffect, useMemo, useState } from 'react';
import {
  Check,
  Disc3,
  Link2,
  Loader2,
  Pause,
  Play,
  Plus,
  Search,
  Sparkles,
  Youtube,
} from 'lucide-react';
import type {
  CatalogProviderFilter,
  Playlist,
  ResolvedYouTubeMeta,
  SearchResultTrack,
  Track,
} from '../types/music';
import { extractYouTubeVideoId, filterTracks } from '../utils/musicLogic';
import {
  resolveYouTubeMetadataClient,
  searchCatalogDetailed,
  type CatalogSearchBundle,
} from '../utils/webCatalogSearch';
import { AlbumCover } from './AlbumCover';
import type { YouTubeTrackDraft } from './YouTubeLinkModal';

interface SearchViewProps {
  query: string;
  onQueryChange: (q: string) => void;
  libraryTracks: Track[];
  playlists: Playlist[];
  currentTrackId: string | null;
  isPlaying: boolean;
  onPlayLibraryTrack: (track: Track, queue: Track[]) => void;
  onPlaySearchResult: (result: SearchResultTrack) => void;
  onAddSearchResultToLibrary: (
    result: SearchResultTrack,
    playlistId?: string
  ) => void;
  onAddYouTubeDrafts: (
    drafts: YouTubeTrackDraft[],
    playlistId?: string,
    playImmediately?: boolean
  ) => void;
  onOpenYouTubeModal: () => void;
}

const DISCOVER_TOPICS = [
  {
    label: 'Variété & Pop Française',
    query: 'Stromae Angèle Orelsan Clara Luciani',
    tone: 'from-emerald-800 to-zinc-900',
  },
  {
    label: 'Cinéma & Bandes Originales',
    query: 'Hans Zimmer Ludovico Einaudi Yann Tiersen',
    tone: 'from-indigo-800 to-zinc-900',
  },
  {
    label: 'Rock & Classiques',
    query: 'Queen Pink Floyd Nirvana Beatles',
    tone: 'from-rose-800 to-zinc-900',
  },
  {
    label: 'Électro & Club',
    query: 'Daft Punk Avicii David Guetta Kygo',
    tone: 'from-cyan-800 to-zinc-900',
  },
  {
    label: 'Rap & Hip-Hop',
    query: 'Eminem Kendrick Lamar Nekfeu Damso',
    tone: 'from-amber-800 to-zinc-900',
  },
  {
    label: 'Hits Pop Internationaux',
    query: 'The Weeknd Billie Eilish Dua Lipa Bruno Mars',
    tone: 'from-purple-800 to-zinc-900',
  },
];

export const SearchView = memo(function SearchView({
  query,
  onQueryChange,
  libraryTracks,
  playlists,
  currentTrackId,
  isPlaying,
  onPlayLibraryTrack,
  onPlaySearchResult,
  onAddSearchResultToLibrary,
  onAddYouTubeDrafts,
  onOpenYouTubeModal,
}: SearchViewProps) {
  const [bundle, setBundle] = useState<CatalogSearchBundle>({
    merged: [],
    deezer: [],
    itunes: [],
  });
  const [providerFilter, setProviderFilter] =
    useState<CatalogProviderFilter>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [targetPlaylistId, setTargetPlaylistId] = useState<string>('liked');

  // Direct YouTube URL detection right from the search input
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

  // Local library instant matches
  const localMatches = useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed || detectedYtVideoId) return [];
    return filterTracks(libraryTracks, trimmed).slice(0, 12);
  }, [libraryTracks, query, detectedYtVideoId]);

  // Parallel Apple iTunes (CORS) + Deezer (JSONP) + Server catalog search
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed || detectedYtVideoId) {
      setBundle({ merged: [], deezer: [], itunes: [] });
      setError(null);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const resultBundle = await searchCatalogDetailed(
          trimmed,
          controller.signal
        );
        if (!controller.signal.aborted) {
          setBundle(resultBundle);
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setError('Impossible de joindre les catalogues Apple & Deezer.');
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, 240);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, detectedYtVideoId]);

  const displayedOnlineResults = useMemo(() => {
    if (providerFilter === 'deezer') return bundle.deezer;
    if (providerFilter === 'itunes') return bundle.itunes;
    if (providerFilter === 'local') return [];
    return bundle.merged;
  }, [bundle, providerFilter]);

  const libraryLookupSet = useMemo(() => {
    const ids = new Set<string>();
    const titleArtistPairs = new Set<string>();
    for (const t of libraryTracks) {
      ids.add(t.id);
      if (t.deezerId) ids.add(`dz-${t.deezerId}`);
      if (t.itunesId) ids.add(`it-${t.itunesId}`);
      titleArtistPairs.add(
        `${t.title.toLowerCase()}::${t.artist.split(',')[0].trim().toLowerCase()}`
      );
    }
    return { ids, titleArtistPairs };
  }, [libraryTracks]);

  const isInLibrary = (item: SearchResultTrack) => {
    if (libraryLookupSet.ids.has(item.externalId)) return true;
    if (item.deezerId && libraryLookupSet.ids.has(`dz-${item.deezerId}`)) {
      return true;
    }
    if (item.itunesId && libraryLookupSet.ids.has(`it-${item.itunesId}`)) {
      return true;
    }
    const pair = `${item.title.toLowerCase()}::${item.artist.split(',')[0].trim().toLowerCase()}`;
    return libraryLookupSet.titleArtistPairs.has(pair);
  };

  const ytAlreadyAdded = Boolean(
    detectedYtVideoId &&
      libraryTracks.some((t) => t.youtubeVideoIds?.includes(detectedYtVideoId))
  );

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#121212] rounded-lg overflow-y-auto px-4 sm:px-6 py-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display font-bold text-2xl sm:text-3xl text-white">
              Recherche Multi-API
            </h1>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30 text-[11px] font-semibold">
              Deezer
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30 text-[11px] font-semibold">
              Apple Music
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/15 text-red-300 border border-red-500/30 text-[11px] font-semibold">
              Lien YouTube
            </span>
          </div>
          <p className="text-sm text-[#b3b3b3] mt-1">
            Interrogation simultanée gratuite d&apos;Apple iTunes &amp; Deezer, ou collez directement un lien{' '}
            <code className="px-1.5 py-0.5 rounded bg-white/10 text-xs text-white font-mono-tabular">
              youtu.be/...
            </code>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="add-target-select" className="text-xs text-[#b3b3b3]">
            Destination :
          </label>
          <select
            id="add-target-select"
            value={targetPlaylistId}
            onChange={(e) => setTargetPlaylistId(e.target.value)}
            className="h-9 px-3 rounded-md bg-[#1f1f1f] text-xs font-medium text-white border border-white/10 outline-none cursor-pointer"
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

      {/* Direct YouTube Share Link Instant Card */}
      {detectedYtVideoId && (
        <div className="p-5 rounded-xl bg-gradient-to-br from-red-950/45 via-[#1a1a1a] to-[#161616] border border-red-500/35 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-600/20 text-red-400 text-xs font-semibold border border-red-500/30">
              <Youtube className="w-3.5 h-3.5 fill-current" />
              Lien de partage YouTube détecté ({detectedYtVideoId})
            </span>
          </div>

          {ytLoading || !ytMeta ? (
            <div className="flex items-center gap-2.5 text-xs text-[#b3b3b3] py-3">
              <Loader2 className="w-4 h-4 animate-spin text-[#1ED760]" />
              <span>Extraction automatique du titre et de l&apos;artiste…</span>
            </div>
          ) : (
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <AlbumCover
                src={ytMeta.coverUrl}
                alt={ytTitle || ytMeta.title}
                sizeClass="w-24 h-24"
                roundedClass="rounded-lg"
              />

              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[11px] text-[#a0a0a0]">
                    Titre
                  </label>
                  <input
                    type="text"
                    value={ytTitle}
                    onChange={(e) => setYtTitle(e.target.value)}
                    className="w-full h-9 px-3 rounded-md bg-black/50 text-sm text-white border border-white/15 focus:border-[#1ED760] outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[11px] text-[#a0a0a0]">
                    Artiste
                  </label>
                  <input
                    type="text"
                    value={ytArtist}
                    onChange={(e) => setYtArtist(e.target.value)}
                    className="w-full h-9 px-3 rounded-md bg-black/50 text-sm text-white border border-white/15 focus:border-[#1ED760] outline-none"
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
                      targetPlaylistId === 'liked' ? undefined : targetPlaylistId,
                      true
                    )
                  }
                  className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-[#1ED760] hover:bg-[#1fdf64] text-black text-xs font-bold transition-colors cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-black" />
                  <span>Écouter maintenant</span>
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
                      targetPlaylistId === 'liked' ? undefined : targetPlaylistId,
                      false
                    )
                  }
                  className={`inline-flex items-center gap-1.5 h-10 px-4 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                    ytAlreadyAdded
                      ? 'bg-[#1ED760]/15 text-[#1ED760] border border-[#1ED760]/40'
                      : 'bg-white text-black hover:bg-[#e5e5e5]'
                  }`}
                >
                  {ytAlreadyAdded ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Déjà dans la bibliothèque</span>
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
        <div className="space-y-6">
          {/* Quick batch YouTube Link banner */}
          <div className="p-4 rounded-xl bg-[#181818] border border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-600/20 flex items-center justify-center text-red-400 shrink-0">
                <Link2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">
                  Import rapide par liens de partage YouTube
                </p>
                <p className="text-xs text-[#b3b3b3]">
                  Collez un ou plusieurs liens YouTube / YouTube Music en lot sans aucune configuration d&apos;API.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onOpenYouTubeModal}
              className="inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-full bg-white text-black hover:bg-[#e5e5e5] text-xs font-bold transition-colors shrink-0 cursor-pointer"
            >
              <Youtube className="w-4 h-4 text-red-600 fill-red-600" />
              <span>Coller plusieurs liens</span>
            </button>
          </div>

          <div className="space-y-4">
            <h2 className="font-display font-bold text-lg text-white">
              Explorer les catalogues Apple Music &amp; Deezer
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {DISCOVER_TOPICS.map((topic) => (
                <button
                  key={topic.label}
                  type="button"
                  onClick={() => onQueryChange(topic.query)}
                  className={`h-28 p-5 rounded-lg bg-gradient-to-br ${topic.tone} text-left flex flex-col justify-between hover:brightness-110 transition-all cursor-pointer border border-white/[0.06]`}
                >
                  <span className="font-display font-bold text-lg text-white">
                    {topic.label}
                  </span>
                  <span className="text-xs text-white/75 flex items-center gap-1.5">
                    <Search className="w-3.5 h-3.5" />
                    Rechercher sur Apple &amp; Deezer
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : !detectedYtVideoId ? (
        <div className="space-y-5">
          {/* Provider Filter Tabs */}
          <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.08] pb-3">
            <button
              type="button"
              onClick={() => setProviderFilter('all')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                providerFilter === 'all'
                  ? 'bg-white text-black'
                  : 'bg-[#1f1f1f] text-[#d0d0d0] hover:bg-[#2a2a2a]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Fusion Apple + Deezer ({bundle.merged.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setProviderFilter('deezer')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                providerFilter === 'deezer'
                  ? 'bg-purple-500 text-white'
                  : 'bg-[#1f1f1f] text-purple-300 hover:bg-[#2a2a2a]'
              }`}
            >
              <span>Deezer ({bundle.deezer.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setProviderFilter('itunes')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                providerFilter === 'itunes'
                  ? 'bg-rose-500 text-white'
                  : 'bg-[#1f1f1f] text-rose-300 hover:bg-[#2a2a2a]'
              }`}
            >
              <span>Apple Music / iTunes ({bundle.itunes.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setProviderFilter('local')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                providerFilter === 'local'
                  ? 'bg-[#1ED760] text-black'
                  : 'bg-[#1f1f1f] text-[#1ED760] hover:bg-[#2a2a2a]'
              }`}
            >
              <Disc3 className="w-3.5 h-3.5" />
              <span>Ma Bibliothèque ({localMatches.length})</span>
            </button>
          </div>

          {/* Instant Local Library Matches */}
          {(providerFilter === 'all' || providerFilter === 'local') &&
            localMatches.length > 0 && (
              <div className="space-y-2">
                <h2 className="font-display font-bold text-xs text-[#b3b3b3] uppercase tracking-wider px-1">
                  Dans votre bibliothèque ({localMatches.length})
                </h2>
                <div className="space-y-1">
                  {(providerFilter === 'local'
                    ? localMatches
                    : localMatches.slice(0, 4)
                  ).map((track) => {
                    const active = currentTrackId === track.id && isPlaying;
                    return (
                      <div
                        key={track.id}
                        className="group flex items-center justify-between gap-4 px-3 py-2 rounded-md bg-white/[0.03] hover:bg-white/[0.08] transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <button
                            type="button"
                            onClick={() =>
                              onPlayLibraryTrack(track, localMatches)
                            }
                            aria-label={
                              active
                                ? `Mettre en pause ${track.title}`
                                : `Écouter ${track.title}`
                            }
                            className="relative w-11 h-11 rounded-[4px] overflow-hidden shrink-0 cursor-pointer"
                          >
                            <AlbumCover
                              src={track.coverUrl}
                              alt={track.title}
                              sizeClass="w-11 h-11"
                            />
                            <span className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              {active ? (
                                <Pause className="w-5 h-5 text-white fill-white" />
                              ) : (
                                <Play className="w-5 h-5 text-white fill-white" />
                              )}
                            </span>
                          </button>
                          <div className="min-w-0 flex-1">
                            <p
                              className={`text-[15px] font-medium truncate ${
                                currentTrackId === track.id
                                  ? 'text-[#1ED760]'
                                  : 'text-white'
                              }`}
                            >
                              {track.title}
                            </p>
                            <p className="text-[13px] text-[#b3b3b3] truncate">
                              {track.artist} · {track.album}
                            </p>
                          </div>
                        </div>
                        <span className="text-[11px] text-[#1ED760] font-semibold px-2.5 py-1 rounded-full bg-[#1ED760]/10">
                          Bibliothèque
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          {/* Online Catalog Results (Apple + Deezer) */}
          {providerFilter !== 'local' && (
            <div className="space-y-2">
              <h2 className="font-display font-bold text-xs text-[#b3b3b3] uppercase tracking-wider px-1">
                {providerFilter === 'deezer'
                  ? 'Catalogue Deezer Public API'
                  : providerFilter === 'itunes'
                    ? 'Catalogue Apple iTunes Search API'
                    : 'Résultats fusionnés & dédupliqués (Apple + Deezer)'}
              </h2>

              {loading ? (
                <div className="space-y-2.5">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-16 rounded-md bg-[#1b1b1b] animate-pulse"
                    />
                  ))}
                </div>
              ) : error ? (
                <div className="py-10 text-center space-y-2">
                  <p className="text-sm text-rose-400">{error}</p>
                </div>
              ) : displayedOnlineResults.length === 0 ? (
                <div className="py-10 text-center space-y-2">
                  <p className="text-base font-semibold text-white">
                    Aucun résultat sur cette source pour « {query} »
                  </p>
                  <p className="text-sm text-[#b3b3b3]">
                    Essayez un autre filtre ci-dessus ou collez directement un lien de partage YouTube !
                  </p>
                </div>
              ) : (
                <div className="space-y-1" data-testid="search-results-list">
                  {displayedOnlineResults.map((item) => {
                    const added = isInLibrary(item);
                    const active =
                      currentTrackId === item.externalId && isPlaying;
                    const providers = item.providerSources || [item.source];
                    const hasDeezer = providers.includes('deezer');
                    const hasApple = providers.includes('itunes');

                    return (
                      <div
                        key={item.externalId}
                        className="group flex items-center justify-between gap-4 px-3 py-2 rounded-md hover:bg-white/[0.07] transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <button
                            type="button"
                            onClick={() => onPlaySearchResult(item)}
                            aria-label={
                              active
                                ? `Mettre en pause ${item.title}`
                                : `Écouter ${item.title}`
                            }
                            className="relative w-11 h-11 rounded-[4px] overflow-hidden shrink-0 cursor-pointer"
                          >
                            <AlbumCover
                              src={item.coverUrl}
                              alt={item.title}
                              sizeClass="w-11 h-11"
                            />
                            <span className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              {active ? (
                                <Pause className="w-5 h-5 text-white fill-white" />
                              ) : (
                                <Play className="w-5 h-5 text-white fill-white" />
                              )}
                            </span>
                          </button>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <button
                                type="button"
                                onClick={() => onPlaySearchResult(item)}
                                className={`text-[15px] font-medium truncate text-left hover:underline cursor-pointer ${
                                  active ? 'text-[#1ED760]' : 'text-white'
                                }`}
                              >
                                {item.title}
                              </button>
                              {item.explicit && (
                                <span className="inline-flex items-center justify-center w-4 h-4 rounded-[2px] bg-[#b3b3b3]/80 text-[#121212] text-[10px] font-bold leading-none shrink-0">
                                  E
                                </span>
                              )}
                              {hasDeezer && (
                                <span
                                  title="Disponible via Deezer Public API"
                                  className="hidden sm:inline-flex px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-300 text-[10px] font-bold shrink-0"
                                >
                                  Deezer
                                </span>
                              )}
                              {hasApple && (
                                <span
                                  title="Disponible via Apple iTunes API"
                                  className="hidden sm:inline-flex px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-300 text-[10px] font-bold shrink-0"
                                >
                                  Apple
                                </span>
                              )}
                            </div>
                            <p className="text-[13px] text-[#b3b3b3] truncate">
                              {item.artist} · {item.album}
                              {item.releaseYear ? ` (${item.releaseYear})` : ''}
                              {item.genre ? ` · ${item.genre}` : ''}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span className="hidden sm:inline text-xs text-[#b3b3b3] font-mono-tabular">
                            {item.durationLabel}
                          </span>

                          <button
                            type="button"
                            onClick={() =>
                              onAddSearchResultToLibrary(
                                item,
                                targetPlaylistId === 'liked'
                                  ? undefined
                                  : targetPlaylistId
                              )
                            }
                            className={`inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                              added
                                ? 'bg-[#1ED760]/15 text-[#1ED760] border border-[#1ED760]/40'
                                : 'bg-white text-black hover:bg-[#e5e5e5]'
                            }`}
                          >
                            {added ? (
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
          )}
        </div>
      ) : null}
    </div>
  );
});
