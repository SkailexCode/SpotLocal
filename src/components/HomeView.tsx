import { memo, useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  Check,
  Clock,
  Disc3,
  Flame,
  Heart,
  Link2,
  Pause,
  Play,
  Plus,
  Upload,
  Youtube,
} from 'lucide-react';
import type { Playlist, SearchResultTrack, Track } from '../types/music';
import { extractYouTubeVideoId } from '../utils/musicLogic';
import { fetchLiveChartsHybrid } from '../utils/webCatalogSearch';
import { AlbumCover } from './AlbumCover';

interface HomeViewProps {
  likedCount: number;
  playlists: Playlist[];
  tracks: Track[];
  recentTracks: Track[];
  currentTrackId: string | null;
  isPlaying: boolean;
  onOpenLiked: () => void;
  onOpenAllTracks: () => void;
  onOpenPlaylist: (id: string) => void;
  onPlayTrack: (track: Track, queue: Track[]) => void;
  onPlaySearchResult: (item: SearchResultTrack) => void;
  onAddSearchResultToLibrary: (item: SearchResultTrack) => void;
  onQuickPasteYouTubeUrl: (url: string) => void;
  onOpenYouTubeModal: () => void;
  onOpenImportModal: () => void;
}

export const HomeView = memo(function HomeView({
  likedCount,
  playlists,
  tracks,
  recentTracks,
  currentTrackId,
  isPlaying,
  onOpenLiked,
  onOpenAllTracks,
  onOpenPlaylist,
  onPlayTrack,
  onPlaySearchResult,
  onAddSearchResultToLibrary,
  onQuickPasteYouTubeUrl,
  onOpenYouTubeModal,
  onOpenImportModal,
}: HomeViewProps) {
  const [quickLink, setQuickLink] = useState('');
  const [quickError, setQuickError] = useState('');
  const [liveCharts, setLiveCharts] = useState<SearchResultTrack[]>([]);
  const [chartsLoading, setChartsLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    fetchLiveChartsHybrid(controller.signal)
      .then((items) => {
        if (!controller.signal.aborted) {
          setLiveCharts(items);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setChartsLoading(false);
        }
      });
    return () => controller.abort();
  }, []);

  const handleQuickSubmit = (e: FormEvent) => {
    e.preventDefault();
    const id = extractYouTubeVideoId(quickLink, { allowRawId: true });
    if (!id) {
      setQuickError('Collez un lien YouTube valide (ex: https://youtu.be/...).');
      return;
    }
    setQuickError('');
    const submitted = quickLink.trim();
    setQuickLink('');
    onQuickPasteYouTubeUrl(submitted);
  };

  const trackById = useMemo(
    () => new Map(tracks.map((t) => [t.id, t])),
    [tracks]
  );

  const libraryIdSet = useMemo(() => {
    const set = new Set<string>();
    for (const t of tracks) {
      set.add(t.id);
      if (t.deezerId) set.add(`dz-${t.deezerId}`);
      if (t.itunesId) set.add(`it-${t.itunesId}`);
    }
    return set;
  }, [tracks]);

  const { popHits, frenchScene, rockLegends, electroBeats } = useMemo(() => {
    const getNum = (id: string) => {
      const n = Number.parseInt(id.replace(/^t-/, ''), 10);
      return Number.isFinite(n) ? n : 0;
    };

    return {
      popHits: tracks
        .filter((t) => {
          const n = getNum(t.id);
          return n >= 38 && n <= 64;
        })
        .slice(0, 10),
      frenchScene: tracks
        .filter((t) => {
          const n = getNum(t.id);
          return (n >= 65 && n <= 90) || (n >= 4 && n <= 8);
        })
        .slice(0, 10),
      rockLegends: tracks
        .filter((t) => {
          const n = getNum(t.id);
          return (n >= 91 && n <= 108) || [1, 3, 12, 31].includes(n);
        })
        .slice(0, 10),
      electroBeats: tracks
        .filter((t) => {
          const n = getNum(t.id);
          return (n >= 109 && n <= 118) || [65, 66, 2, 19].includes(n);
        })
        .slice(0, 10),
    };
  }, [tracks]);

  const renderTrackCard = (track: Track, sectionQueue: Track[]) => {
    const active = currentTrackId === track.id && isPlaying;
    return (
      <button
        key={track.id}
        type="button"
        onClick={() => onPlayTrack(track, sectionQueue)}
        className="group p-3.5 rounded-lg bg-[#181818] hover:bg-[#242424] transition-colors text-left cursor-pointer flex flex-col"
      >
        <div className="relative aspect-square w-full mb-3 rounded-md overflow-hidden shadow-md bg-[#282828]">
          <AlbumCover
            src={track.coverUrl}
            alt={track.title}
            sizeClass="w-full h-full"
            roundedClass="rounded-md"
          />
          <span
            className={`absolute right-2 bottom-2 w-11 h-11 rounded-full bg-[#1ED760] text-black flex items-center justify-center shadow-xl transition-all ${
              active
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0'
            }`}
          >
            {active ? (
              <Pause className="w-5 h-5 fill-black" />
            ) : (
              <Play className="w-5 h-5 fill-black ml-0.5" />
            )}
          </span>
        </div>
        <p
          className={`text-sm font-semibold truncate ${
            currentTrackId === track.id ? 'text-[#1ED760]' : 'text-white'
          }`}
        >
          {track.title}
        </p>
        <p className="text-xs text-[#b3b3b3] truncate mt-1">{track.artist}</p>
      </button>
    );
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-gradient-to-b from-[#1f2924] via-[#121212] to-[#121212] rounded-lg overflow-y-auto px-4 sm:px-6 py-6 space-y-9">
      {/* Top Hero + Quick YouTube Link Bar */}
      <div className="space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div>
            <h1 className="font-display font-bold text-2xl sm:text-3xl text-white">
              Bienvenue sur SpotLocal Web
            </h1>
            <p className="text-sm text-[#b3b3b3] mt-1">
              Vos MP3 locaux + liens YouTube + catalogues gratuits{' '}
              <strong className="text-purple-300">Deezer</strong> &amp;{' '}
              <strong className="text-rose-300">Apple Music</strong> — sans clé API.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onOpenImportModal}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-white/10 hover:bg-white/15 text-xs font-semibold text-white transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-[#1ED760]" />
              <span>Glisser / Importer MP3</span>
            </button>
            <button
              type="button"
              onClick={onOpenYouTubeModal}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-white/10 hover:bg-white/15 text-xs font-semibold text-white transition-colors cursor-pointer"
            >
              <Link2 className="w-3.5 h-3.5 text-red-400" />
              <span>Import multi-liens</span>
            </button>
          </div>
        </div>

        {/* Instant 1-Click YouTube Share Link Input */}
        <form
          onSubmit={handleQuickSubmit}
          className="p-3 sm:p-3.5 rounded-xl bg-black/45 border border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5"
        >
          <div className="flex items-center gap-2.5 flex-1 min-w-0 px-2">
            <Youtube className="w-5 h-5 text-red-500 fill-red-500 shrink-0" />
            <input
              type="text"
              value={quickLink}
              onChange={(e) => {
                setQuickLink(e.target.value);
                if (quickError) setQuickError('');
              }}
              placeholder="Collez un lien de partage YouTube (ex: https://youtu.be/4NRXx6U8ABQ) pour l'écouter et l'ajouter…"
              className="w-full bg-transparent text-sm text-white placeholder-[#8e8e8e] outline-none"
            />
          </div>
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-full bg-[#1ED760] hover:bg-[#1fdf64] text-black text-xs font-bold transition-colors shrink-0 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-black" />
            <span>Lire &amp; Ajouter</span>
          </button>
        </form>
        {quickError && (
          <p className="text-xs text-amber-400 -mt-3 px-1">{quickError}</p>
        )}

        {/* Quick Library Tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          <button
            type="button"
            onClick={onOpenLiked}
            className="group flex items-center gap-3.5 h-16 rounded-md bg-white/[0.07] hover:bg-white/[0.14] overflow-hidden pr-4 transition-colors text-left cursor-pointer"
          >
            <div className="w-16 h-16 bg-gradient-to-br from-[#450af5] via-[#6d4aff] to-[#c4efd9] flex items-center justify-center shrink-0">
              <Heart className="w-6 h-6 text-white fill-white" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm text-white truncate">
                Titres likés
              </p>
              <p className="text-xs text-[#b3b3b3] font-mono-tabular">
                {likedCount} titres
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={onOpenAllTracks}
            className="group flex items-center gap-3.5 h-16 rounded-md bg-white/[0.07] hover:bg-white/[0.14] overflow-hidden pr-4 transition-colors text-left cursor-pointer"
          >
            <div className="w-16 h-16 bg-gradient-to-br from-[#1ED760] via-[#14833b] to-[#121212] flex items-center justify-center shrink-0">
              <Disc3 className="w-6 h-6 text-black" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm text-white truncate">
                Toutes les musiques
              </p>
              <p className="text-xs text-[#b3b3b3] font-mono-tabular">
                {tracks.length} titres
              </p>
            </div>
          </button>

          {playlists.map((pl) => {
            const cover =
              pl.coverUrl ||
              (pl.trackIds[0] ? trackById.get(pl.trackIds[0])?.coverUrl : '') ||
              '';
            return (
              <button
                key={pl.id}
                type="button"
                onClick={() => onOpenPlaylist(pl.id)}
                className="group flex items-center gap-3.5 h-16 rounded-md bg-white/[0.07] hover:bg-white/[0.14] overflow-hidden pr-4 transition-colors text-left cursor-pointer"
              >
                <AlbumCover
                  src={cover}
                  alt={pl.name}
                  sizeClass="w-16 h-16"
                  roundedClass="rounded-none"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm text-white truncate">
                    {pl.name}
                  </p>
                  <p className="text-xs text-[#b3b3b3] font-mono-tabular">
                    {pl.trackIds.length} titres
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Live Trending Section from Deezer Charts & Apple Music */}
      {(chartsLoading || liveCharts.length > 0) && (
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-orange-400" />
                <h2 className="font-display font-bold text-xl text-white">
                  Top Tendances en direct
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 text-[10px] font-bold">
                  Deezer Charts
                </span>
                <span className="px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 text-[10px] font-bold">
                  Apple Music
                </span>
              </div>
              <p className="text-xs text-[#b3b3b3] mt-0.5">
                Flux mis à jour automatiquement via les API publiques gratuites Deezer &amp; Apple iTunes
              </p>
            </div>
          </div>

          {chartsLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-[3/4] rounded-lg bg-[#181818] animate-pulse"
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
              {liveCharts.slice(0, 10).map((item) => {
                const active = currentTrackId === item.externalId && isPlaying;
                const alreadySaved = libraryIdSet.has(item.externalId);
                const providers = item.providerSources || [item.source];

                return (
                  <div
                    key={item.externalId}
                    className="group p-3.5 rounded-lg bg-[#181818] hover:bg-[#242424] transition-colors flex flex-col relative"
                  >
                    <div
                      onClick={() => onPlaySearchResult(item)}
                      className="relative aspect-square w-full mb-3 rounded-md overflow-hidden shadow-md bg-[#282828] cursor-pointer"
                    >
                      <AlbumCover
                        src={item.coverUrl}
                        alt={item.title}
                        sizeClass="w-full h-full"
                        roundedClass="rounded-md"
                      />
                      <div className="absolute top-2 left-2 flex gap-1">
                        {providers.includes('deezer') && (
                          <span className="px-1.5 py-0.5 rounded bg-black/75 text-purple-300 text-[9px] font-bold backdrop-blur-xs">
                            Deezer
                          </span>
                        )}
                        {providers.includes('itunes') && (
                          <span className="px-1.5 py-0.5 rounded bg-black/75 text-rose-300 text-[9px] font-bold backdrop-blur-xs">
                            Apple
                          </span>
                        )}
                      </div>
                      <span
                        className={`absolute right-2 bottom-2 w-11 h-11 rounded-full bg-[#1ED760] text-black flex items-center justify-center shadow-xl transition-all ${
                          active
                            ? 'opacity-100 translate-y-0'
                            : 'opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0'
                        }`}
                      >
                        {active ? (
                          <Pause className="w-5 h-5 fill-black" />
                        ) : (
                          <Play className="w-5 h-5 fill-black ml-0.5" />
                        )}
                      </span>
                    </div>

                    <div className="flex items-start justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => onPlaySearchResult(item)}
                        className="min-w-0 flex-1 text-left cursor-pointer"
                      >
                        <p
                          className={`text-sm font-semibold truncate ${
                            active ? 'text-[#1ED760]' : 'text-white'
                          }`}
                        >
                          {item.title}
                        </p>
                        <p className="text-xs text-[#b3b3b3] truncate mt-0.5">
                          {item.artist}
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => onAddSearchResultToLibrary(item)}
                        title={
                          alreadySaved
                            ? 'Déjà dans vos titres'
                            : 'Ajouter aux Titres likés'
                        }
                        aria-label={`Ajouter ${item.title}`}
                        className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                          alreadySaved
                            ? 'bg-[#1ED760]/20 text-[#1ED760]'
                            : 'bg-white/10 hover:bg-white/20 text-white'
                        }`}
                      >
                        {alreadySaved ? (
                          <Check className="w-3.5 h-3.5" />
                        ) : (
                          <Plus className="w-3.5 h-3.5" />
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

      {/* Recently Played */}
      {recentTracks.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-[#1ED760]" />
            <h2 className="font-display font-bold text-xl text-white">
              Écoutés récemment
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
            {recentTracks
              .slice(0, 5)
              .map((t) => renderTrackCard(t, recentTracks))}
          </div>
        </div>
      )}

      {/* Top Pop International */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-display font-bold text-xl text-white">
              Hits Mondiaux &amp; Pop
            </h2>
            <p className="text-xs text-[#b3b3b3] mt-0.5">
              The Weeknd, Billie Eilish, Dua Lipa, Harry Styles, Taylor Swift, Bruno Mars…
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenAllTracks}
            className="text-xs font-semibold text-[#b3b3b3] hover:text-white transition-colors cursor-pointer"
          >
            Tout afficher ({tracks.length})
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
          {(popHits.length > 0 ? popHits : tracks.slice(0, 10)).map((t) =>
            renderTrackCard(t, popHits.length > 0 ? popHits : tracks)
          )}
        </div>
      </div>

      {/* Scène Française & Francophone */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-display font-bold text-xl text-white">
              Scène Française &amp; Variété
            </h2>
            <p className="text-xs text-[#b3b3b3] mt-0.5">
              Stromae, Orelsan, Angèle, Indochine, Céline Dion, Clara Luciani, Bigflo &amp; Oli…
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
          {(frenchScene.length > 0 ? frenchScene : tracks.slice(10, 20)).map(
            (t) =>
              renderTrackCard(t, frenchScene.length > 0 ? frenchScene : tracks)
          )}
        </div>
      </div>

      {/* Rock & Légendes */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-display font-bold text-xl text-white">
              Légendes du Rock &amp; Classiques
            </h2>
            <p className="text-xs text-[#b3b3b3] mt-0.5">
              Queen, Michael Jackson, Nirvana, Pink Floyd, The Beatles, AC/DC, Linkin Park…
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
          {(rockLegends.length > 0 ? rockLegends : tracks.slice(20, 30)).map(
            (t) =>
              renderTrackCard(t, rockLegends.length > 0 ? rockLegends : tracks)
          )}
        </div>
      </div>

      {/* Électro & Club */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-display font-bold text-xl text-white">
              Électro, Club &amp; Festival
            </h2>
            <p className="text-xs text-[#b3b3b3] mt-0.5">
              Daft Punk, David Guetta, Avicii, Calvin Harris, Martin Garrix, Kygo…
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
          {(electroBeats.length > 0 ? electroBeats : tracks.slice(30, 40)).map(
            (t) =>
              renderTrackCard(
                t,
                electroBeats.length > 0 ? electroBeats : tracks
              )
          )}
        </div>
      </div>
    </div>
  );
});
