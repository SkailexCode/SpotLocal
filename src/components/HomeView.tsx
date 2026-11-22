import { memo, useMemo, useState, type FormEvent } from 'react';
import {
  Clock,
  Disc3,
  Heart,
  Link2,
  Pause,
  Play,
  Plus,
  Shuffle,
  Upload,
  Youtube,
} from 'lucide-react';
import type { Playlist, Track } from '../types/music';
import { extractYouTubeVideoId } from '../utils/musicLogic';
import { AlbumCover } from './AlbumCover';

interface HomeViewProps {
  likedCount: number;
  playlists: Playlist[];
  tracks: Track[];
  recentTracks: Track[];
  currentTrackId: string | null;
  isPlaying: boolean;
  onOpenLiked: () => void;
  onOpenAllTracks: (initialGenre?: string) => void;
  onOpenPlaylist: (id: string) => void;
  onCreatePlaylist: () => void;
  onPlayTrack: (track: Track, queue: Track[]) => void;
  onToggleLike: (trackId: string) => void;
  onQuickPasteYouTubeUrl: (url: string) => void;
  onOpenYouTubeModal: () => void;
  onOpenImportModal: () => void;
}

const GENRE_CARDS: Array<{ genre: string; subtitle: string; gradient: string }> = [
  {
    genre: 'Scène Française',
    subtitle: 'Stromae, Angèle, Indila, Céline Dion, Indochine, Clara Luciani…',
    gradient: 'from-emerald-800 via-emerald-950 to-[#161616]',
  },
  {
    genre: 'Rap FR',
    subtitle: 'Orelsan, Nekfeu, Damso, Ninho, PNL, Hamza, Gims, Jul, Werenoi…',
    gradient: 'from-amber-700 via-amber-950 to-[#161616]',
  },
  {
    genre: 'Pop',
    subtitle: 'The Weeknd, Billie Eilish, Dua Lipa, Taylor Swift, Bruno Mars…',
    gradient: 'from-fuchsia-800 via-purple-950 to-[#161616]',
  },
  {
    genre: 'Rock & Légendes',
    subtitle: 'Queen, Nirvana, Pink Floyd, The Beatles, AC/DC, Linkin Park…',
    gradient: 'from-rose-800 via-rose-950 to-[#161616]',
  },
  {
    genre: 'Rap US & R&B',
    subtitle: 'Eminem, Kendrick Lamar, Drake, Travis Scott, Snoop Dogg, Beyoncé…',
    gradient: 'from-orange-800 via-zinc-900 to-[#161616]',
  },
  {
    genre: 'Électro & Dance',
    subtitle: 'Daft Punk, Avicii, David Guetta, DJ Snake, Calvin Harris, Justice…',
    gradient: 'from-cyan-800 via-slate-950 to-[#161616]',
  },
  {
    genre: 'Afro, Reggae & Latino',
    subtitle: 'Burna Boy, Rema, Bob Marley, Bad Bunny, Shakira, Magic System…',
    gradient: 'from-lime-800 via-emerald-950 to-[#161616]',
  },
  {
    genre: 'K-Pop & J-Pop',
    subtitle: 'BTS, BLACKPINK, Rosé, LE SSERAFIM, YOASOBI, Kenshi Yonezu…',
    gradient: 'from-pink-800 via-indigo-950 to-[#161616]',
  },
  {
    genre: 'Cinéma & Instrumental',
    subtitle: 'Hans Zimmer, Ludovico Einaudi, Yann Tiersen, Ennio Morricone…',
    gradient: 'from-indigo-800 via-slate-950 to-[#161616]',
  },
];

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
  onCreatePlaylist,
  onPlayTrack,
  onToggleLike,
  onQuickPasteYouTubeUrl,
  onOpenYouTubeModal,
  onOpenImportModal,
}: HomeViewProps) {
  const [quickLink, setQuickLink] = useState('');
  const [quickError, setQuickError] = useState('');

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

  const {
    genreCounts,
    frenchScene,
    rapFr,
    popHits,
    rockLegends,
    electroBeats,
  } = useMemo(() => {
    const counts: Record<string, number> = {};
    const fr: Track[] = [];
    const rfr: Track[] = [];
    const pop: Track[] = [];
    const rock: Track[] = [];
    const electro: Track[] = [];

    for (const t of tracks) {
      const g = t.genre || 'Pop';
      counts[g] = (counts[g] || 0) + 1;
      if (g === 'Scène Française' && fr.length < 10) fr.push(t);
      else if (g === 'Rap FR' && rfr.length < 10) rfr.push(t);
      else if (g === 'Pop' && pop.length < 10) pop.push(t);
      else if (g === 'Rock & Légendes' && rock.length < 10) rock.push(t);
      else if (g === 'Électro & Dance' && electro.length < 10) electro.push(t);
    }

    return {
      genreCounts: counts,
      frenchScene: fr,
      rapFr: rfr,
      popHits: pop,
      rockLegends: rock,
      electroBeats: electro,
    };
  }, [tracks]);

  const handlePlayRandomMix = () => {
    if (tracks.length === 0) return;
    const sample = [...tracks]
      .sort(() => Math.random() - 0.5)
      .slice(0, 60);
    if (sample[0]) {
      onPlayTrack(sample[0], sample);
    }
  };

  const renderTrackCard = (track: Track, sectionQueue: Track[]) => {
    const active = currentTrackId === track.id && isPlaying;
    return (
      <div
        key={track.id}
        className="group p-3.5 rounded-lg bg-[#181818] hover:bg-[#242424] transition-colors flex flex-col relative"
      >
        <button
          type="button"
          onClick={() => onPlayTrack(track, sectionQueue)}
          className="relative aspect-square w-full mb-3 rounded-md overflow-hidden shadow-md bg-[#282828] cursor-pointer text-left"
        >
          <AlbumCover
            src={track.coverUrl}
            alt={track.title}
            sizeClass="w-full h-full"
            roundedClass="rounded-md"
          />
          <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/75 text-red-400 text-[9px] font-bold inline-flex items-center gap-1 backdrop-blur-xs">
            <Youtube className="w-2.5 h-2.5 fill-current" />
            Intégral
          </span>
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
        </button>

        <div className="flex items-start justify-between gap-2">
          <button
            type="button"
            onClick={() => onPlayTrack(track, sectionQueue)}
            className="min-w-0 flex-1 text-left cursor-pointer"
          >
            <p
              className={`text-sm font-semibold truncate ${
                currentTrackId === track.id ? 'text-[#1ED760]' : 'text-white'
              }`}
            >
              {track.title}
            </p>
            <p className="text-xs text-[#b3b3b3] truncate mt-0.5">
              {track.artist}
            </p>
          </button>

          <button
            type="button"
            onClick={() => onToggleLike(track.id)}
            aria-label={
              track.liked ? 'Retirer des favoris' : 'Ajouter aux Titres likés'
            }
            title={
              track.liked ? 'Dans vos Titres likés' : 'Ajouter aux Titres likés'
            }
            className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
              track.liked
                ? 'bg-[#1ED760]/20 text-[#1ED760]'
                : 'bg-white/5 hover:bg-white/15 text-[#b3b3b3] hover:text-white'
            }`}
          >
            <Heart
              className={`w-3.5 h-3.5 ${track.liked ? 'fill-[#1ED760]' : ''}`}
            />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-gradient-to-b from-[#1f2924] via-[#121212] to-[#121212] rounded-lg overflow-y-auto px-4 sm:px-6 py-6 space-y-9">
      {/* Top Hero + Quick YouTube Link Bar */}
      <div className="space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div>
            <h1 className="font-display font-bold text-2xl sm:text-3xl text-white">
              Bienvenue sur SpotLocal
            </h1>
            <p className="text-sm text-[#b3b3b3] mt-1">
              <strong className="text-white">
                {tracks.length.toLocaleString('fr-FR')} musiques en lecture
                intégrale
              </strong>{' '}
              via YouTube + vos fichiers MP3 locaux — sans compte et sans clé API.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handlePlayRandomMix}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-[#1ED760] hover:bg-[#1fdf64] text-black text-xs font-bold transition-colors cursor-pointer"
            >
              <Shuffle className="w-3.5 h-3.5" />
              <span>Mix aléatoire</span>
            </button>
            <button
              type="button"
              onClick={onOpenImportModal}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-white/10 hover:bg-white/15 text-xs font-semibold text-white transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-[#1ED760]" />
              <span>Importer MP3</span>
            </button>
            <button
              type="button"
              onClick={onOpenYouTubeModal}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-white/10 hover:bg-white/15 text-xs font-semibold text-white transition-colors cursor-pointer"
            >
              <Link2 className="w-3.5 h-3.5 text-red-400" />
              <span>Import multi-liens YT</span>
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
              placeholder="Collez n'importe quel lien YouTube (ex: https://youtu.be/oiKj0Z_Xnjc) pour l'écouter en entier…"
              className="w-full bg-transparent text-sm text-white placeholder-[#8e8e8e] outline-none"
            />
          </div>
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-full bg-white hover:bg-[#e5e5e5] text-black text-xs font-bold transition-colors shrink-0 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-black" />
            <span>Lire &amp; Ajouter</span>
          </button>
        </form>
        {quickError && (
          <p className="text-xs text-amber-400 -mt-3 px-1">{quickError}</p>
        )}

        {/* Quick Personal Space Tiles (Clean First-Visit State!) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => onOpenAllTracks('all')}
            className="group flex items-center gap-3.5 h-16 rounded-md bg-white/[0.07] hover:bg-white/[0.14] overflow-hidden pr-4 transition-colors text-left cursor-pointer"
          >
            <div className="w-16 h-16 bg-gradient-to-br from-[#1ED760] via-[#14833b] to-[#121212] flex items-center justify-center shrink-0">
              <Disc3 className="w-6 h-6 text-black" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm text-white truncate">
                Catalogue intégral YouTube
              </p>
              <p className="text-xs text-[#b3b3b3] font-mono-tabular">
                {tracks.length.toLocaleString('fr-FR')} clips complets
              </p>
            </div>
          </button>

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
                {likedCount === 0
                  ? 'Aucun favori pour l’instant'
                  : `${likedCount} ${likedCount > 1 ? 'titres' : 'titre'}`}
              </p>
            </div>
          </button>

          {playlists.length === 0 ? (
            <button
              type="button"
              onClick={onCreatePlaylist}
              className="group flex items-center gap-3.5 h-16 rounded-md bg-white/[0.05] hover:bg-white/[0.12] border border-dashed border-white/15 overflow-hidden pr-4 transition-colors text-left cursor-pointer"
            >
              <div className="w-16 h-16 bg-[#1f1f1f] flex items-center justify-center shrink-0">
                <Plus className="w-6 h-6 text-[#1ED760]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm text-white truncate">
                  Créer une playlist
                </p>
                <p className="text-xs text-[#b3b3b3] truncate">
                  Composez vos propres sélections
                </p>
              </div>
            </button>
          ) : (
            playlists.map((pl) => {
              const cover =
                pl.coverUrl ||
                (pl.trackIds[0]
                  ? trackById.get(pl.trackIds[0])?.coverUrl
                  : '') ||
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
                      {pl.trackIds.length}{' '}
                      {pl.trackIds.length > 1 ? 'titres' : 'titre'}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Recently Played (only shown after user actually listens to something!) */}
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

      {/* Explore by Genre (9 Curated YouTube Full-Clip Categories) */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-display font-bold text-xl text-white">
              Parcourir par univers musical
            </h2>
            <p className="text-xs text-[#b3b3b3] mt-0.5">
              100 % clips et morceaux complets via YouTube — aucun extrait coupé à 30 secondes
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenAllTracks('all')}
            className="text-xs font-semibold text-[#b3b3b3] hover:text-white transition-colors cursor-pointer"
          >
            Tout voir ({tracks.length.toLocaleString('fr-FR')})
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {GENRE_CARDS.map((card) => {
            const count = genreCounts[card.genre] || 0;
            return (
              <button
                key={card.genre}
                type="button"
                onClick={() => onOpenAllTracks(card.genre)}
                className={`p-4 rounded-xl bg-gradient-to-br ${card.gradient} border border-white/[0.08] hover:border-white/25 hover:brightness-110 transition-all text-left cursor-pointer flex flex-col justify-between min-h-[108px]`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-display font-bold text-base text-white">
                    {card.genre}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-black/45 text-[#1ED760] text-[11px] font-mono-tabular font-bold shrink-0">
                    {count.toLocaleString('fr-FR')} titres
                  </span>
                </div>
                <p className="text-xs text-white/75 line-clamp-2 mt-2">
                  {card.subtitle}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Scène Française */}
      {frenchScene.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display font-bold text-xl text-white">
                Scène Française &amp; Variété
              </h2>
              <p className="text-xs text-[#b3b3b3] mt-0.5">
                Stromae, Angèle, Indila, Céline Dion, Indochine, Clara Luciani…
              </p>
            </div>
            <button
              type="button"
              onClick={() => onOpenAllTracks('Scène Française')}
              className="text-xs font-semibold text-[#b3b3b3] hover:text-white cursor-pointer"
            >
              Voir les {genreCounts['Scène Française'] || frenchScene.length}{' '}
              titres
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
            {frenchScene.map((t) => renderTrackCard(t, frenchScene))}
          </div>
        </div>
      )}

      {/* Rap Français */}
      {rapFr.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display font-bold text-xl text-white">
                Rap Français &amp; Urbain
              </h2>
              <p className="text-xs text-[#b3b3b3] mt-0.5">
                Orelsan, Nekfeu, Damso, Ninho, PNL, Hamza, Gims, Jul, Werenoi…
              </p>
            </div>
            <button
              type="button"
              onClick={() => onOpenAllTracks('Rap FR')}
              className="text-xs font-semibold text-[#b3b3b3] hover:text-white cursor-pointer"
            >
              Voir les {genreCounts['Rap FR'] || rapFr.length} titres
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
            {rapFr.map((t) => renderTrackCard(t, rapFr))}
          </div>
        </div>
      )}

      {/* Pop Internationale */}
      {popHits.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display font-bold text-xl text-white">
                Hits Mondiaux &amp; Pop
              </h2>
              <p className="text-xs text-[#b3b3b3] mt-0.5">
                The Weeknd, Billie Eilish, Dua Lipa, Taylor Swift, Bruno Mars…
              </p>
            </div>
            <button
              type="button"
              onClick={() => onOpenAllTracks('Pop')}
              className="text-xs font-semibold text-[#b3b3b3] hover:text-white cursor-pointer"
            >
              Voir les {(genreCounts['Pop'] || popHits.length).toLocaleString('fr-FR')}{' '}
              titres
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
            {popHits.map((t) => renderTrackCard(t, popHits))}
          </div>
        </div>
      )}

      {/* Rock & Légendes */}
      {rockLegends.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display font-bold text-xl text-white">
                Rock &amp; Légendes
              </h2>
              <p className="text-xs text-[#b3b3b3] mt-0.5">
                Queen, Nirvana, Pink Floyd, The Beatles, AC/DC, Linkin Park…
              </p>
            </div>
            <button
              type="button"
              onClick={() => onOpenAllTracks('Rock & Légendes')}
              className="text-xs font-semibold text-[#b3b3b3] hover:text-white cursor-pointer"
            >
              Voir les {genreCounts['Rock & Légendes'] || rockLegends.length}{' '}
              titres
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
            {rockLegends.map((t) => renderTrackCard(t, rockLegends))}
          </div>
        </div>
      )}

      {/* Électro & Dance */}
      {electroBeats.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display font-bold text-xl text-white">
                Électro, House &amp; Club
              </h2>
              <p className="text-xs text-[#b3b3b3] mt-0.5">
                Daft Punk, Avicii, David Guetta, DJ Snake, Calvin Harris, Justice…
              </p>
            </div>
            <button
              type="button"
              onClick={() => onOpenAllTracks('Électro & Dance')}
              className="text-xs font-semibold text-[#b3b3b3] hover:text-white cursor-pointer"
            >
              Voir les {genreCounts['Électro & Dance'] || electroBeats.length}{' '}
              titres
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
            {electroBeats.map((t) => renderTrackCard(t, electroBeats))}
          </div>
        </div>
      )}
    </div>
  );
});
