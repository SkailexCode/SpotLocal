import { memo, useEffect, useMemo, useState } from 'react';
import {
  Check,
  ExternalLink,
  Heart,
  Link2,
  Loader2,
  Pause,
  Play,
  Plus,
  Search,
  Youtube,
} from 'lucide-react';
import type { Playlist, ResolvedYouTubeMeta, Track } from '../types/music';
import {
  extractYouTubeVideoId,
  getYouTubeSearchUrl,
  searchRankedTracks,
} from '../utils/musicLogic';
import { resolveYouTubeMetadataClient } from '../utils/webCatalogSearch';
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
  onToggleLike: (trackId: string) => void;
  onAddTrackToPlaylist: (trackId: string, playlistId: string) => void;
  onAddYouTubeDrafts: (
    drafts: YouTubeTrackDraft[],
    playlistId?: string,
    playImmediately?: boolean
  ) => void;
  onOpenYouTubeModal: () => void;
}

const DISCOVER_TOPICS = [
  {
    label: 'Scène Française',
    query: 'Stromae Angèle Indila Clara Luciani Indochine',
    tone: 'from-emerald-800 to-zinc-900',
  },
  {
    label: 'Rap Français',
    query: 'Orelsan Nekfeu Damso Ninho PNL Hamza Gims',
    tone: 'from-amber-800 to-zinc-900',
  },
  {
    label: 'Hits Pop Internationaux',
    query: 'The Weeknd Billie Eilish Dua Lipa Bruno Mars',
    tone: 'from-purple-800 to-zinc-900',
  },
  {
    label: 'Rock & Légendes',
    query: 'Queen Nirvana Pink Floyd Beatles Linkin Park',
    tone: 'from-rose-800 to-zinc-900',
  },
  {
    label: 'Électro & Dance',
    query: 'Daft Punk Avicii David Guetta DJ Snake Justice',
    tone: 'from-cyan-800 to-zinc-900',
  },
  {
    label: 'Cinéma & Instrumental',
    query: 'Hans Zimmer Ludovico Einaudi Yann Tiersen',
    tone: 'from-indigo-800 to-zinc-900',
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
  onToggleLike,
  onAddTrackToPlaylist,
  onAddYouTubeDrafts,
  onOpenYouTubeModal,
}: SearchViewProps) {
  const [targetPlaylistId, setTargetPlaylistId] = useState<string>('liked');

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

  const rankedMatches = useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed || detectedYtVideoId) return [];
    return searchRankedTracks(libraryTracks, trimmed, 120);
  }, [libraryTracks, query, detectedYtVideoId]);

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
              Recherche YouTube Intégrale
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-500/15 text-red-300 border border-red-500/30 text-[11px] font-semibold">
              <Youtube className="w-3 h-3 fill-current" />
              {libraryTracks.length.toLocaleString('fr-FR')} clips complets
            </span>
          </div>
          <p className="text-sm text-[#b3b3b3] mt-1">
            Recherchez parmi les{' '}
            <strong className="text-white">
              {libraryTracks.length.toLocaleString('fr-FR')} titres intégraux
            </strong>{' '}
            ou collez directement n&apos;importe quel lien{' '}
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
                      <span>Déjà dans le catalogue</span>
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
          <div className="p-4 rounded-xl bg-[#181818] border border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-600/20 flex items-center justify-center text-red-400 shrink-0">
                <Link2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">
                  Ajoutez n&apos;importe quelle musique YouTube en 1 seconde
                </p>
                <p className="text-xs text-[#b3b3b3]">
                  Collez un ou plusieurs liens YouTube / YouTube Music pour les écouter en entier.
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
              Suggestions de recherche rapide
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
                    Explorer en lecture intégrale
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : !detectedYtVideoId ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] pb-3">
            <p className="text-xs font-semibold text-[#b3b3b3]">
              <span className="text-white font-bold">{rankedMatches.length}</span>{' '}
              {rankedMatches.length > 1
                ? 'résultats intégraux trouvés'
                : 'résultat intégral trouvé'}{' '}
              pour « {query} »
            </p>

            <a
              href={getYouTubeSearchUrl(query)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-600/15 hover:bg-red-600/25 text-red-300 text-xs font-semibold transition-colors"
            >
              <Youtube className="w-3.5 h-3.5 fill-current" />
              <span>Chercher d&apos;autres clips sur YouTube</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {rankedMatches.length === 0 ? (
            <div className="py-12 text-center space-y-4">
              <p className="text-base font-semibold text-white">
                « {query} » n&apos;est pas encore dans les{' '}
                {libraryTracks.length.toLocaleString('fr-FR')} titres intégrés
              </p>
              <p className="text-sm text-[#b3b3b3] max-w-md mx-auto">
                Ouvrez la recherche YouTube ci-dessous, copiez le lien de partage de la vidéo et collez-le dans la barre de recherche pour l&apos;écouter en entier !
              </p>
              <a
                href={getYouTubeSearchUrl(query)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 h-10 px-5 rounded-full bg-[#1ED760] hover:bg-[#1fdf64] text-black text-xs font-bold transition-colors"
              >
                <Youtube className="w-4 h-4 fill-black" />
                <span>Trouver « {query} » sur YouTube</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          ) : (
            <div className="space-y-1" data-testid="search-results-list">
              {rankedMatches.map((track) => {
                const active = currentTrackId === track.id && isPlaying;
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
                    className="group flex items-center justify-between gap-4 px-3 py-2 rounded-md hover:bg-white/[0.07] transition-colors track-row-contain"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => onPlayLibraryTrack(track, rankedMatches)}
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
                        <div className="flex items-center gap-1.5 min-w-0">
                          <button
                            type="button"
                            onClick={() =>
                              onPlayLibraryTrack(track, rankedMatches)
                            }
                            className={`text-[15px] font-medium truncate text-left hover:underline cursor-pointer ${
                              currentTrackId === track.id
                                ? 'text-[#1ED760]'
                                : 'text-white'
                            }`}
                          >
                            {track.title}
                          </button>
                          <span className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 text-[10px] font-bold shrink-0">
                            <Youtube className="w-2.5 h-2.5 fill-current" />
                            Intégral
                          </span>
                        </div>
                        <p className="text-[13px] text-[#b3b3b3] truncate">
                          {track.artist}
                          {track.genre ? ` · ${track.genre}` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="hidden sm:inline text-xs text-[#b3b3b3] font-mono-tabular">
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
                        className={`inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                          inTargetPlaylist
                            ? 'bg-[#1ED760]/15 text-[#1ED760] border border-[#1ED760]/40'
                            : 'bg-white/10 text-white hover:bg-white/20'
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
  );
});
