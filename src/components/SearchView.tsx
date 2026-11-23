import { memo, useEffect, useMemo, useState } from 'react';
import {
  Check,
  ExternalLink,
  Loader2,
  Pause,
  Play,
  Plus,
} from 'lucide-react';
import type { Playlist, ResolvedYouTubeMeta, Track } from '../types/music';
import {
  CATALOG_GENRES,
  catalogStore,
  type UserLibraryOverlay,
} from '../utils/catalogEngine';
import { searchLiveYouTubeGlobal } from '../utils/liveYouTubeSearch';
import {
  extractYouTubeVideoId,
  getYouTubeSearchUrl,
} from '../utils/musicLogic';
import { resolveYouTubeMetadataClient } from '../utils/webCatalogSearch';
import { AlbumCover } from './AlbumCover';
import { VideoClipBadge, YouTubeLogo } from './Logos';
import type { YouTubeTrackDraft } from './YouTubeLinkModal';

interface SearchViewProps {
  query: string;
  onQueryChange: (q: string) => void;
  catalogVersion: number;
  overlay: UserLibraryOverlay;
  playlists: Playlist[];
  currentTrackId: string | null;
  isPlaying: boolean;
  onPlayLibraryTrack: (track: Track, queue: Track[]) => void;
  onSelectArtist: (artistName: string) => void;
  onToggleLike: (trackId: string, liveTrack?: Track) => void;
  onAddTrackToPlaylist: (
    trackId: string,
    playlistId: string,
    liveTrack?: Track
  ) => void;
  onAddYouTubeDrafts: (
    drafts: YouTubeTrackDraft[],
    playlistId?: string,
    playImmediately?: boolean
  ) => void;
  onOpenYouTubeModal: () => void;
}

const SUGGESTED_ARTISTS = [
  'Stromae',
  'Daft Punk',
  'Ninho',
  'The Weeknd',
  'Queen',
  'Hans Zimmer',
  'Angèle',
  'Indochine',
];

export const SearchView = memo(function SearchView({
  query,
  onQueryChange,
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

  const [liveTracksRaw, setLiveTracksRaw] = useState<Track[]>([]);
  const [liveSearching, setLiveSearching] = useState(false);

  const suggestedArtistCards = useMemo(() => {
    void catalogVersion;
    return SUGGESTED_ARTISTS.map((name) => ({
      name,
      coverUrl: catalogStore.getArtistCoverUrl(name),
    }));
  }, [catalogVersion]);

  const browseGenres = useMemo(() => {
    void catalogVersion;
    return CATALOG_GENRES.map((g) => ({
      ...g,
      coverUrl: catalogStore.getGenreSampleCovers(g.name, 1)[0],
    }));
  }, [catalogVersion]);

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

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2 || detectedYtVideoId) {
      setLiveTracksRaw([]);
      setLiveSearching(false);
      return;
    }

    const controller = new AbortController();
    setLiveSearching(true);
    const timer = window.setTimeout(() => {
      searchLiveYouTubeGlobal(trimmed, controller.signal)
        .then((items) => {
          if (!controller.signal.aborted) {
            setLiveTracksRaw(items);
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setLiveSearching(false);
          }
        });
    }, 300);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, detectedYtVideoId]);

  const searchOutcome = useMemo(() => {
    void catalogVersion;
    const trimmed = query.trim();
    if (!trimmed || detectedYtVideoId) {
      return {
        tracks: [] as Track[],
        artists: [] as Array<{
          name: string;
          count: number;
          coverUrl?: string;
        }>,
      };
    }
    const res = catalogStore.queryCatalog(
      {
        query: trimmed,
        genre: genreFilter,
        limit: 80,
      },
      overlay
    );
    const matchingArtists = catalogStore.queryArtists(trimmed, 8).items;
    return {
      tracks: res.tracks,
      artists: matchingArtists,
    };
  }, [query, genreFilter, detectedYtVideoId, catalogVersion, overlay]);

  const liveTracks = useMemo(() => {
    if (liveTracksRaw.length === 0) return [];
    const localVideoIds = new Set<string>();
    for (const t of searchOutcome.tracks) {
      for (const vid of t.youtubeVideoIds || []) localVideoIds.add(vid);
    }
    return liveTracksRaw
      .filter((lt) => {
        const vid = lt.youtubeVideoIds?.[0];
        return vid && !localVideoIds.has(vid);
      })
      .map((lt) => ({
        ...lt,
        liked: overlay.likedIds.has(lt.id),
      }));
  }, [liveTracksRaw, searchOutcome.tracks, overlay.likedIds]);

  const ytAlreadyAdded = useMemo(() => {
    if (!detectedYtVideoId) return false;
    return Boolean(catalogStore.findTrackByVideoId(detectedYtVideoId, overlay));
  }, [detectedYtVideoId, overlay]);

  const renderResultRow = (
    track: Track,
    queueContext: Track[],
    isLiveGlobal = false
  ) => {
    const isCurrent = currentTrackId === track.id;
    const active = isCurrent && isPlaying;
    const isYouTube = Boolean(track.youtubeVideoIds?.length);
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
        key={`${isLiveGlobal ? 'live' : 'local'}-${track.id}`}
        className={`group flex items-center justify-between gap-4 px-3 py-2 rounded-lg transition-colors track-row-contain ${
          isCurrent ? 'bg-[var(--bg-row-active)]' : 'hover:bg-[var(--bg-row-hover)]'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <button
            type="button"
            onClick={() => onPlayLibraryTrack(track, queueContext)}
            aria-label={
              active
                ? `Mettre en pause ${track.title}`
                : `Écouter ${track.title}`
            }
            className={`relative overflow-hidden shrink-0 cursor-pointer rounded-[5px] ${
              isYouTube ? 'w-16 h-9' : 'w-10 h-10'
            }`}
          >
            <AlbumCover
              src={track.coverUrl}
              videoIds={track.youtubeVideoIds}
              alt={track.title}
              size="sm"
              className="w-full h-full rounded-[5px]"
            />
            <span
              className={`absolute inset-0 bg-black/50 flex items-center justify-center transition-opacity ${
                active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
              }`}
            >
              {active ? (
                <Pause className="w-4 h-4 text-white fill-white" />
              ) : (
                <Play className="w-4 h-4 text-white fill-white ml-0.5" />
              )}
            </span>
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                onClick={() => onPlayLibraryTrack(track, queueContext)}
                className={`text-sm font-medium truncate text-left hover:underline cursor-pointer ${
                  isCurrent
                    ? 'text-[var(--accent)] font-semibold'
                    : 'text-[var(--text-main)]'
                }`}
              >
                {track.title}
              </button>

              {active && (
                <span className="inline-flex items-end gap-0.5 h-3 shrink-0">
                  <span className="w-0.5 h-3 bg-[var(--accent)] animate-eq-1" />
                  <span className="w-0.5 h-3 bg-[var(--accent)] animate-eq-2" />
                  <span className="w-0.5 h-3 bg-[var(--accent)] animate-eq-3" />
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-xs text-[var(--text-sub)] truncate mt-0.5">
              {isYouTube && <VideoClipBadge />}
              <button
                type="button"
                onClick={() => onSelectArtist(track.artist)}
                className="hover:text-[var(--text-main)] hover:underline truncate cursor-pointer"
              >
                {track.artist}
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className="hidden sm:inline text-xs text-[var(--text-sub)] font-mono-tabular">
            {track.durationLabel}
          </span>

          <button
            type="button"
            onClick={() => {
              if (targetPlaylistId === 'liked') {
                onToggleLike(track.id, isLiveGlobal ? track : undefined);
              } else {
                onAddTrackToPlaylist(
                  track.id,
                  targetPlaylistId,
                  isLiveGlobal ? track : undefined
                );
              }
            }}
            aria-label="Ajouter"
            className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
              inTargetPlaylist
                ? 'bg-[var(--accent)] text-white'
                : 'border border-[var(--border-strong)] text-[var(--text-sub)] hover:border-[var(--text-main)] hover:text-[var(--text-main)]'
            }`}
          >
            {inTargetPlaylist ? (
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
            ) : (
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            )}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 studio-panel rounded-xl overflow-y-auto anim-view">
      <div className="px-5 sm:px-7 py-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-[var(--text-main)]">
            Recherche
          </h1>

          {playlists.length > 0 && (
            <div className="flex items-center gap-2">
              <label
                htmlFor="add-target-select"
                className="text-xs text-[var(--text-sub)]"
              >
                Ajouter vers :
              </label>
              <select
                id="add-target-select"
                value={targetPlaylistId}
                onChange={(e) => setTargetPlaylistId(e.target.value)}
                className="h-8.5 px-3 rounded-lg bg-[var(--bg-input)] text-xs font-medium text-[var(--text-main)] border border-[var(--border-subtle)] outline-none cursor-pointer"
              >
                <option value="liked">Titres likés</option>
                {playlists.map((pl) => (
                  <option key={pl.id} value={pl.id}>
                    {pl.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Direct YouTube Link Card */}
        {detectedYtVideoId && (
          <div className="p-4 rounded-xl studio-card space-y-4">
            {ytLoading || !ytMeta ? (
              <div className="flex items-center gap-2 text-xs text-[var(--text-sub)] py-2">
                <Loader2 className="w-4 h-4 animate-spin text-[var(--accent)]" />
                <span>Chargement de la vidéo…</span>
              </div>
            ) : (
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <AlbumCover
                  src={ytMeta.coverUrl}
                  videoIds={[ytMeta.videoId]}
                  alt={ytTitle || ytMeta.title}
                  size="lg"
                  className="w-32 aspect-video rounded-lg shadow-sm"
                />

                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={ytTitle}
                    onChange={(e) => setYtTitle(e.target.value)}
                    placeholder="Titre"
                    className="w-full h-9 px-3 rounded-lg bg-[var(--bg-input-focus)] text-sm text-[var(--text-main)] border border-[var(--border-strong)] focus:border-[var(--accent)] outline-none"
                  />
                  <input
                    type="text"
                    value={ytArtist}
                    onChange={(e) => setYtArtist(e.target.value)}
                    placeholder="Artiste"
                    className="w-full h-9 px-3 rounded-lg bg-[var(--bg-input-focus)] text-sm text-[var(--text-main)] border border-[var(--border-strong)] focus:border-[var(--accent)] outline-none"
                  />
                </div>

                <div className="flex items-center gap-2 shrink-0">
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
                    className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full btn-accent text-xs font-semibold cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Écouter</span>
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
                    className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-[var(--pill-active-bg)] text-[var(--pill-active-fg)] text-xs font-medium anim-press cursor-pointer"
                  >
                    {ytAlreadyAdded ? (
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
            )}
          </div>
        )}

        {!query.trim() ? (
          <div className="space-y-7">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-display font-bold text-base text-[var(--text-main)]">
                  Artistes populaires
                </h2>
                <button
                  type="button"
                  onClick={onOpenYouTubeModal}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-sub)] hover:text-[var(--text-main)] cursor-pointer"
                >
                  <YouTubeLogo className="w-4 h-3" />
                  <span>Importer via lien YouTube</span>
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                {suggestedArtistCards.map((artist) => (
                  <button
                    key={artist.name}
                    type="button"
                    onClick={() => onSelectArtist(artist.name)}
                    className="group p-3 rounded-xl studio-card flex flex-col items-center text-center gap-2.5 cursor-pointer"
                  >
                    <AlbumCover
                      src={artist.coverUrl}
                      alt={artist.name}
                      size="md"
                      className="w-18 h-18 rounded-full shadow-sm transition-transform duration-200 group-hover:scale-105"
                    />
                    <span className="text-xs font-semibold text-[var(--text-main)] truncate w-full">
                      {artist.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <h2 className="font-display font-bold text-base text-[var(--text-main)]">
                Parcourir tout
              </h2>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-2.5">
                {browseGenres.map((g) => (
                  <button
                    key={g.name}
                    type="button"
                    onClick={() => onQueryChange(g.name)}
                    className="group relative h-[80px] p-3.5 rounded-xl studio-card overflow-hidden text-left cursor-pointer"
                  >
                    <span className="relative z-10 block max-w-[68%] font-display font-bold text-sm text-[var(--text-main)] leading-snug">
                      {g.name}
                    </span>
                    {g.coverUrl && (
                      <AlbumCover
                        src={g.coverUrl}
                        alt={g.name}
                        size="sm"
                        className="w-16 h-16 rounded-lg shadow-md absolute -right-2 -bottom-2 rotate-[16deg] transition-transform duration-200 group-hover:scale-105 group-hover:rotate-[12deg]"
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : !detectedYtVideoId ? (
          <div className="space-y-6">
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
              <button
                type="button"
                onClick={() => setGenreFilter('all')}
                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  genreFilter === 'all'
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
                  onClick={() => setGenreFilter(g.name)}
                  className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                    genreFilter === g.name
                      ? 'bg-[var(--accent)] text-white font-semibold'
                      : 'bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated-hover)] text-[var(--text-main)]'
                  }`}
                >
                  {g.name}
                </button>
              ))}
            </div>

            {searchOutcome.artists.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                {searchOutcome.artists.map((a) => (
                  <button
                    key={a.name}
                    type="button"
                    onClick={() => onSelectArtist(a.name)}
                    className="inline-flex items-center gap-2 pl-1.5 pr-3 py-1 rounded-full bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated-hover)] border border-[var(--border-subtle)] text-xs font-medium text-[var(--text-main)] anim-press cursor-pointer"
                  >
                    <AlbumCover
                      src={a.coverUrl}
                      alt={a.name}
                      size="sm"
                      className="w-6 h-6 rounded-full"
                    />
                    <span>{a.name}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Local Results */}
            {searchOutcome.tracks.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2">
                  <h2 className="text-xs font-semibold text-[var(--text-sub)]">
                    Titres
                  </h2>
                  <button
                    type="button"
                    onClick={() =>
                      onPlayLibraryTrack(
                        searchOutcome.tracks[0],
                        searchOutcome.tracks
                      )
                    }
                    className="text-xs font-semibold text-[var(--accent)] hover:underline cursor-pointer"
                  >
                    Tout lire
                  </button>
                </div>

                <div className="space-y-0.5" data-testid="search-results-list">
                  {searchOutcome.tracks.map((t) =>
                    renderResultRow(t, searchOutcome.tracks, false)
                  )}
                </div>
              </div>
            )}

            {/* Live YouTube Results */}
            {(liveTracks.length > 0 ||
              liveSearching ||
              searchOutcome.tracks.length === 0) && (
              <div className="space-y-2">
                <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2">
                  <div className="flex items-center gap-2">
                    <YouTubeLogo className="w-4.5 h-3.5" />
                    <h2 className="text-xs font-semibold text-[var(--text-sub)]">
                      Autres résultats sur YouTube
                    </h2>
                    {liveSearching && (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--accent)]" />
                    )}
                  </div>

                  <a
                    href={getYouTubeSearchUrl(query)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium text-[var(--text-sub)] hover:text-[var(--text-main)]"
                  >
                    <span>YouTube</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                {liveTracks.length > 0 ? (
                  <div className="space-y-0.5">
                    {liveTracks.map((lt) =>
                      renderResultRow(lt, liveTracks, true)
                    )}
                  </div>
                ) : liveSearching ? (
                  <div className="py-6 flex items-center justify-center gap-2 text-xs text-[var(--text-sub)]">
                    <Loader2 className="w-4 h-4 animate-spin text-[var(--accent)]" />
                    <span>Recherche en cours…</span>
                  </div>
                ) : (
                  <div className="py-8 text-center space-y-3">
                    <p className="text-sm font-medium text-[var(--text-main)]">
                      Aucun résultat pour « {query} »
                    </p>
                    <a
                      href={getYouTubeSearchUrl(query)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 h-9 px-4 rounded-full btn-accent text-xs font-semibold"
                    >
                      <YouTubeLogo className="w-4.5 h-3.5" />
                      <span>Ouvrir sur YouTube</span>
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
});
