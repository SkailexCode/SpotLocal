import { Heart, Pause, Play } from 'lucide-react';
import type { Playlist, Track } from '../types/music';
import { AlbumCover } from './AlbumCover';

interface HomeViewProps {
  likedCount: number;
  playlists: Playlist[];
  tracks: Track[];
  currentTrackId: string | null;
  isPlaying: boolean;
  onOpenLiked: () => void;
  onOpenPlaylist: (id: string) => void;
  onPlayTrack: (track: Track, queue: Track[]) => void;
}

export function HomeView({
  likedCount,
  playlists,
  tracks,
  currentTrackId,
  isPlaying,
  onOpenLiked,
  onOpenPlaylist,
  onPlayTrack,
}: HomeViewProps) {
  // Helper to reliably parse track number from ID
  const getNum = (id: string) => {
    const n = parseInt(id.replace(/^t-/, ''), 10);
    return Number.isFinite(n) ? n : 0;
  };

  // Curated selections from the massive library
  const popHits = tracks
    .filter((t) => {
      const n = getNum(t.id);
      return n >= 38 && n <= 64;
    })
    .slice(0, 10);

  const frenchScene = tracks
    .filter((t) => {
      const n = getNum(t.id);
      return (n >= 65 && n <= 90) || (n >= 4 && n <= 8);
    })
    .slice(0, 10);

  const rockLegends = tracks
    .filter((t) => {
      const n = getNum(t.id);
      return (n >= 91 && n <= 108) || [1, 3, 12, 31].includes(n);
    })
    .slice(0, 10);

  const electroBeats = tracks
    .filter((t) => {
      const n = getNum(t.id);
      return (n >= 109 && n <= 118) || [65, 66, 19, 20].includes(n);
    })
    .slice(0, 10);

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
        <p className="text-xs text-[#b3b3b3] truncate mt-1">
          {track.artist}
        </p>
      </button>
    );
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-gradient-to-b from-[#1f2924] via-[#121212] to-[#121212] rounded-lg overflow-y-auto px-6 py-6 space-y-10">
      <div>
        <h1 className="font-display font-bold text-2xl sm:text-3xl text-white">
          Bon retour sur SpotLocal
        </h1>
        <p className="text-sm text-[#b3b3b3] mt-1">
          Plus de 130 morceaux complets prêts à être écoutés via le lecteur officiel YouTube ou en local.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 mt-5">
          <button
            type="button"
            onClick={onOpenLiked}
            className="group flex items-center gap-3.5 h-16 rounded-md bg-white/[0.07] hover:bg-white/[0.14] overflow-hidden pr-4 transition-colors text-left cursor-pointer"
          >
            <div className="w-16 h-16 bg-gradient-to-br from-[#450af5] via-[#6d4aff] to-[#c4efd9] flex items-center justify-center shrink-0">
              <Heart className="w-6 h-6 text-white fill-white" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm text-white truncate">Titres likés</p>
              <p className="text-xs text-[#b3b3b3] font-mono-tabular">
                {likedCount} titres
              </p>
            </div>
          </button>

          {playlists.map((pl) => {
            const cover =
              pl.coverUrl ||
              tracks.find((t) => t.id === pl.trackIds[0])?.coverUrl ||
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
                  <p className="font-semibold text-sm text-white truncate">{pl.name}</p>
                  <p className="text-xs text-[#b3b3b3] font-mono-tabular">
                    {pl.trackIds.length} titres
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Top Pop International */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-display font-bold text-xl text-white">
              Hits Mondiaux & Pop
            </h2>
            <p className="text-xs text-[#b3b3b3] mt-0.5">
              The Weeknd, Billie Eilish, Dua Lipa, Harry Styles, Taylor Swift, Bruno Mars...
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenLiked}
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
              Scène Française & Variété
            </h2>
            <p className="text-xs text-[#b3b3b3] mt-0.5">
              Daft Punk, Stromae, Orelsan, Angèle, Indochine, Céline Dion, Goldman...
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
          {(frenchScene.length > 0 ? frenchScene : tracks.slice(10, 20)).map((t) =>
            renderTrackCard(t, frenchScene.length > 0 ? frenchScene : tracks)
          )}
        </div>
      </div>

      {/* Rock & Légendes */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-display font-bold text-xl text-white">
              Légendes du Rock & Classiques
            </h2>
            <p className="text-xs text-[#b3b3b3] mt-0.5">
              Queen, Michael Jackson, Nirvana, Pink Floyd, The Beatles, AC/DC, Linkin Park...
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
          {(rockLegends.length > 0 ? rockLegends : tracks.slice(20, 30)).map((t) =>
            renderTrackCard(t, rockLegends.length > 0 ? rockLegends : tracks)
          )}
        </div>
      </div>

      {/* Électro & Club */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-display font-bold text-xl text-white">
              Électro, Club & Festival
            </h2>
            <p className="text-xs text-[#b3b3b3] mt-0.5">
              David Guetta, Avicii, Calvin Harris, Martin Garrix, Kygo, Swedish House Mafia...
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
          {(electroBeats.length > 0 ? electroBeats : tracks.slice(30, 40)).map((t) =>
            renderTrackCard(t, electroBeats.length > 0 ? electroBeats : tracks)
          )}
        </div>
      </div>
    </div>
  );
}
