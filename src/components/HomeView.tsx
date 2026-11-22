import { memo, useMemo, useState, type FormEvent } from 'react';
import {
  ArrowRight,
  Clock,
  Disc3,
  Flame,
  Heart,
  Pause,
  Play,
  Plus,
  Radio,
  Sparkles,
  Upload,
  Youtube,
} from 'lucide-react';
import type { Playlist, Track } from '../types/music';
import {
  CATALOG_GENRES,
  CATALOG_MOODS,
  catalogStore,
  type UserLibraryOverlay,
} from '../utils/catalogEngine';
import { extractYouTubeVideoId } from '../utils/musicLogic';
import { AlbumCover } from './AlbumCover';

interface HomeViewProps {
  likedCount: number;
  catalogCount: number;
  artistCount: number;
  totalHours: number;
  catalogVersion: number;
  overlay: UserLibraryOverlay;
  playlists: Playlist[];
  recentTracks: Track[];
  currentTrackId: string | null;
  isPlaying: boolean;
  onOpenLiked: () => void;
  onOpenAllTracks: (initialGenre?: string, initialMoodBit?: number) => void;
  onOpenMoods: () => void;
  onOpenPlaylist: (id: string) => void;
  onCreatePlaylist: () => void;
  onPlayTrack: (track: Track, queue: Track[]) => void;
  onPlaySmartMix: (genre?: string, moodBit?: number) => void;
  onToggleLike: (trackId: string) => void;
  onQuickPasteYouTubeUrl: (url: string) => void;
  onOpenImportModal: () => void;
}

export const HomeView = memo(function HomeView({
  likedCount,
  catalogCount,
  artistCount,
  totalHours,
  catalogVersion,
  overlay,
  playlists,
  recentTracks,
  currentTrackId,
  isPlaying,
  onOpenLiked,
  onOpenAllTracks,
  onOpenMoods,
  onOpenPlaylist,
  onCreatePlaylist,
  onPlayTrack,
  onPlaySmartMix,
  onToggleLike,
  onQuickPasteYouTubeUrl,
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

  const { genreCounts, moodCounts, shelves } = useMemo(() => {
    void catalogVersion;
    return {
      genreCounts: catalogStore.getGenreCounts(),
      moodCounts: catalogStore.getMoodCounts(),
      shelves: [
        {
          title: 'Scène Française & Chanson',
          subtitle: 'Stromae, Angèle, Céline Dion, Indochine, Clara Luciani, Pomme…',
          genre: 'Scène Française',
          tracks: catalogStore.getShelfTracks('Scène Française', 10, overlay),
        },
        {
          title: 'Rap Francophone & Urbain',
          subtitle: 'Ninho, Damso, Orelsan, PNL, Tiakola, Hamza, Werenoi, Booba…',
          genre: 'Rap FR',
          tracks: catalogStore.getShelfTracks('Rap FR', 10, overlay),
        },
        {
          title: 'Hits Mondiaux & Pop',
          subtitle: 'The Weeknd, Billie Eilish, Dua Lipa, Taylor Swift, Bruno Mars…',
          genre: 'Pop',
          tracks: catalogStore.getShelfTracks('Pop', 10, overlay),
        },
        {
          title: 'French Touch, Électro & Club',
          subtitle: 'Daft Punk, Justice, Avicii, David Guetta, DJ Snake, Kavinsky…',
          genre: 'Électro & Dance',
          tracks: catalogStore.getShelfTracks('Électro & Dance', 10, overlay),
        },
        {
          title: 'Rock, Indie & Légendes',
          subtitle: 'Queen, Nirvana, Pink Floyd, Arctic Monkeys, Linkin Park…',
          genre: 'Rock & Alternative',
          tracks: catalogStore.getShelfTracks('Rock & Alternative', 10, overlay),
        },
      ],
    };
  }, [catalogVersion, overlay]);

  const renderTrackCard = (track: Track, sectionQueue: Track[]) => {
    const isCurrent = currentTrackId === track.id;
    const activePlaying = isCurrent && isPlaying;

    return (
      <div
        key={track.id}
        className={`group p-3 rounded-2xl studio-card flex flex-col relative ${
          isCurrent ? 'border-[#1ED760]/40 bg-[#1ED760]/[0.05]' : ''
        }`}
      >
        <button
          type="button"
          onClick={() => onPlayTrack(track, sectionQueue)}
          className="relative aspect-square w-full mb-3 rounded-xl overflow-hidden shadow-lg bg-[#161925] cursor-pointer text-left"
        >
          <AlbumCover
            src={track.coverUrl}
            alt={track.title}
            sizeClass="w-full h-full"
            roundedClass="rounded-xl"
          />

          <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/70 border border-white/10 text-[9.5px] font-semibold text-white/90 inline-flex items-center gap-1 backdrop-blur-md">
            <Youtube className="w-2.5 h-2.5 text-rose-500 fill-rose-500" />
            {track.durationLabel}
          </span>

          {activePlaying && (
            <span className="absolute bottom-2.5 left-2.5 px-2 py-1 rounded-lg bg-black/75 backdrop-blur-md inline-flex items-end gap-0.5 h-6">
              <span className="w-0.75 h-3.5 bg-[#1ED760] rounded-full animate-eq-1" />
              <span className="w-0.75 h-3.5 bg-[#1ED760] rounded-full animate-eq-2" />
              <span className="w-0.75 h-3.5 bg-[#1ED760] rounded-full animate-eq-3" />
              <span className="w-0.75 h-3.5 bg-[#1ED760] rounded-full animate-eq-4" />
            </span>
          )}

          <span
            className={`absolute right-2.5 bottom-2.5 w-11 h-11 rounded-full bg-[#1ED760] text-black flex items-center justify-center shadow-[0_8px_24px_rgba(30,215,96,0.45)] transition-all ${
              activePlaying
                ? 'opacity-100 translate-y-0 scale-100'
                : 'opacity-0 translate-y-2 scale-95 group-hover:opacity-100 group-hover:translate-y-0 group-hover:scale-100'
            }`}
          >
            {activePlaying ? (
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
              className={`text-[13.5px] font-bold truncate ${
                isCurrent ? 'text-[#1ED760]' : 'text-white'
              }`}
            >
              {track.title}
            </p>
            <p className="text-xs text-[#8b93a4] truncate mt-0.5">
              {track.artist}
            </p>
          </button>

          <button
            type="button"
            onClick={() => onToggleLike(track.id)}
            aria-label={
              track.liked ? 'Retirer des favoris' : 'Ajouter aux Titres likés'
            }
            className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all cursor-pointer ${
              track.liked
                ? 'bg-[#1ED760]/20 text-[#1ED760]'
                : 'bg-white/[0.04] hover:bg-white/[0.12] text-[#8b93a4] hover:text-white'
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
    <div className="flex-1 flex flex-col min-h-0 studio-panel rounded-2xl overflow-y-auto relative">
      {/* Ambient Aurora Top Glow */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(ellipse_80%_60%_at_25%_0%,rgba(30,215,96,0.16),transparent_65%),radial-gradient(ellipse_60%_50%_at_85%_5%,rgba(99,102,241,0.14),transparent_60%)]" />

      <div className="relative px-4 sm:px-7 py-6 sm:py-7 space-y-10">
        {/* Editorial Hero Card */}
        <section className="p-5 sm:p-7 rounded-3xl bg-gradient-to-br from-[#141c27]/90 via-[#10131d]/95 to-[#0b0d14] border border-white/[0.09] shadow-2xl space-y-6 relative overflow-hidden">
          <div className="pointer-events-none absolute -right-20 -top-20 w-72 h-72 rounded-full bg-[#1ED760]/10 blur-3xl" />

          <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-5 relative">
            <div className="space-y-2.5 max-w-2xl">
              <div className="inline-flex flex-wrap items-center gap-2 px-3 py-1 rounded-full bg-[#1ED760]/12 border border-[#1ED760]/25 text-[#1ED760] text-xs font-semibold">
                <Flame className="w-3.5 h-3.5" />
                <span>
                  {catalogCount.toLocaleString('fr-FR')} titres embarqués + Recherche Mondiale 100M+ YouTube en direct
                </span>
              </div>

              <h1 className="font-display font-extrabold text-2xl sm:text-4xl text-white leading-tight">
                Tout le catalogue musical mondial, en intégralité
              </h1>

              <p className="text-sm sm:text-[15px] text-[#9ca3b0] leading-relaxed">
                Naviguez instantanément dans{' '}
                <strong className="text-white">
                  {catalogCount.toLocaleString('fr-FR')} titres embarqués
                </strong>{' '}
                (<strong className="text-white">
                  {artistCount.toLocaleString('fr-FR')} artistes
                </strong>
                ,{' '}
                <strong className="text-white">
                  {totalHours.toLocaleString('fr-FR')} h
                </strong>
                ) et accédez en direct aux{' '}
                <strong className="text-white">
                  100M+ musiques de YouTube Music
                </strong>{' '}
                depuis la recherche — sans compte et sans clé API.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => onPlaySmartMix()}
                className="inline-flex items-center gap-2 h-11 px-5 rounded-full bg-[#1ED760] hover:bg-[#22e668] text-black text-sm font-bold shadow-[0_8px_28px_rgba(30,215,96,0.35)] transition-all hover:scale-[1.02] cursor-pointer"
              >
                <Sparkles className="w-4 h-4 fill-black" />
                <span>Lancer un Mix Intelligent</span>
              </button>

              <button
                type="button"
                onClick={() => onOpenAllTracks('all')}
                className="inline-flex items-center gap-2 h-11 px-5 rounded-full bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.12] text-sm font-semibold text-white transition-all cursor-pointer"
              >
                <Disc3 className="w-4 h-4 text-[#1ED760]" />
                <span>Parcourir tout</span>
              </button>

              <button
                type="button"
                onClick={onOpenImportModal}
                className="inline-flex items-center gap-2 h-11 px-4 rounded-full bg-white/[0.05] hover:bg-white/[0.11] border border-white/[0.08] text-sm font-semibold text-[#d1d5db] hover:text-white transition-all cursor-pointer"
              >
                <Upload className="w-4 h-4 text-[#1ED760]" />
                <span>MP3</span>
              </button>
            </div>
          </div>

          {/* Embedded 1-Click YouTube Link Studio Bar */}
          <form
            onSubmit={handleQuickSubmit}
            className="p-2 sm:p-2.5 rounded-2xl bg-[#080a0f]/90 border border-white/[0.09] focus-within:border-[#1ED760]/50 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 transition-colors"
          >
            <div className="flex items-center gap-3 flex-1 min-w-0 px-2.5 py-1">
              <div className="w-8 h-8 rounded-xl bg-rose-500/15 border border-rose-500/25 flex items-center justify-center shrink-0">
                <Youtube className="w-4 h-4 text-rose-400 fill-rose-400" />
              </div>
              <input
                type="text"
                value={quickLink}
                onChange={(e) => {
                  setQuickLink(e.target.value);
                  if (quickError) setQuickError('');
                }}
                placeholder="Un titre manque ? Collez n'importe quel lien YouTube (https://youtu.be/...) pour l'écouter en entier…"
                className="w-full bg-transparent text-sm text-white placeholder-[#767f91] outline-none"
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-1.5 h-9.5 px-4.5 rounded-xl bg-white hover:bg-[#e5e7eb] text-black text-xs font-bold transition-colors shrink-0 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-black" />
              <span>Lire &amp; Ajouter</span>
            </button>
          </form>
          {quickError && (
            <p className="text-xs text-amber-400 -mt-3 px-2">{quickError}</p>
          )}
        </section>

        {/* Bento Personal Space (First-Visit Clean State) */}
        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5">
          <button
            type="button"
            onClick={() => onOpenAllTracks('all')}
            className="group flex items-center justify-between p-4 rounded-2xl studio-card text-left cursor-pointer"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-[#1ED760] via-[#139c45] to-[#0b3d1e] flex items-center justify-center shrink-0 shadow-lg">
                <Disc3 className="w-6 h-6 text-black" />
              </div>
              <div className="min-w-0">
                <p className="font-display font-bold text-[15px] text-white truncate">
                  Catalogue Intégral
                </p>
                <p className="text-xs text-[#8b93a4] font-mono-tabular mt-0.5">
                  {catalogCount.toLocaleString('fr-FR')} titres complets
                </p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-[#6e7787] group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0" />
          </button>

          <button
            type="button"
            onClick={onOpenLiked}
            className="group flex items-center justify-between p-4 rounded-2xl studio-card text-left cursor-pointer"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-emerald-300 flex items-center justify-center shrink-0 shadow-lg">
                <Heart className="w-6 h-6 text-white fill-white" />
              </div>
              <div className="min-w-0">
                <p className="font-display font-bold text-[15px] text-white truncate">
                  Titres likés
                </p>
                <p className="text-xs text-[#8b93a4] font-mono-tabular mt-0.5">
                  {likedCount === 0
                    ? 'Aucun favori pour l’instant'
                    : `${likedCount} ${likedCount > 1 ? 'favoris' : 'favori'}`}
                </p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-[#6e7787] group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0" />
          </button>

          {playlists.length === 0 ? (
            <button
              type="button"
              onClick={onCreatePlaylist}
              className="group flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] hover:bg-white/[0.06] border border-dashed border-white/15 hover:border-[#1ED760]/45 transition-all text-left cursor-pointer"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-13 h-13 rounded-2xl bg-[#161a26] border border-white/[0.08] flex items-center justify-center shrink-0">
                  <Plus className="w-6 h-6 text-[#1ED760]" />
                </div>
                <div className="min-w-0">
                  <p className="font-display font-bold text-[15px] text-white truncate">
                    Créer ma première playlist
                  </p>
                  <p className="text-xs text-[#8b93a4] truncate mt-0.5">
                    Organisez vos sélections sur mesure
                  </p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-[#6e7787] group-hover:text-[#1ED760] transition-colors shrink-0" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onOpenPlaylist(playlists[0].id)}
              className="group flex items-center justify-between p-4 rounded-2xl studio-card text-left cursor-pointer"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <AlbumCover
                  src={playlists[0].coverUrl || ''}
                  alt={playlists[0].name}
                  sizeClass="w-13 h-13"
                  roundedClass="rounded-2xl"
                />
                <div className="min-w-0">
                  <p className="font-display font-bold text-[15px] text-white truncate">
                    {playlists[0].name}
                  </p>
                  <p className="text-xs text-[#8b93a4] font-mono-tabular mt-0.5">
                    {playlists[0].trackIds.length}{' '}
                    {playlists[0].trackIds.length > 1 ? 'titres' : 'titre'}
                  </p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-[#6e7787] group-hover:text-white transition-colors shrink-0" />
            </button>
          )}
        </section>

        {/* Recently Played (only shown once user listens to tracks!) */}
        {recentTracks.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4.5 h-4.5 text-[#1ED760]" />
              <h2 className="font-display font-bold text-xl text-white">
                Écoutés récemment
              </h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
              {recentTracks
                .slice(0, 5)
                .map((t) => renderTrackCard(t, recentTracks))}
            </div>
          </section>
        )}

        {/* Ambiances & Instant Radios (10 Moods) */}
        <section className="space-y-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Radio className="w-4.5 h-4.5 text-[#1ED760]" />
                <h2 className="font-display font-bold text-xl text-white">
                  Ambiances &amp; Radios Instantanées
                </h2>
              </div>
              <p className="text-xs text-[#8b93a4] mt-1">
                Lancez une radio continue de 60 morceaux complets adaptée à votre moment
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenMoods}
              className="text-xs font-semibold text-[#9ca3b0] hover:text-white transition-colors cursor-pointer shrink-0"
            >
              Voir les 10 ambiances →
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {CATALOG_MOODS.map((mood) => {
              const count = moodCounts[mood.bit] || 0;
              return (
                <div
                  key={mood.bit}
                  className={`group p-4 rounded-2xl bg-gradient-to-br ${mood.gradient} border border-white/[0.08] hover:border-white/20 transition-all flex flex-col justify-between min-h-[118px] relative overflow-hidden`}
                >
                  <button
                    type="button"
                    onClick={() => onOpenAllTracks('all', mood.bit)}
                    className="text-left flex-1 flex flex-col justify-between cursor-pointer"
                  >
                    <div>
                      <span className="font-display font-bold text-[15px] text-white block">
                        {mood.name}
                      </span>
                      <p className="text-[11.5px] text-white/70 line-clamp-2 mt-1 leading-snug">
                        {mood.subtitle}
                      </p>
                    </div>
                    <span className="text-[11px] font-mono-tabular text-white/60 mt-3 block">
                      {count.toLocaleString('fr-FR')} titres
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onPlaySmartMix('all', mood.bit)}
                    title={`Lancer la radio ${mood.name}`}
                    aria-label={`Lancer la radio ${mood.name}`}
                    className="absolute right-3 bottom-3 w-9 h-9 rounded-full bg-[#1ED760] hover:bg-[#22e668] text-black flex items-center justify-center shadow-lg opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-black ml-0.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* 14 Musical Genres Grid */}
        <section className="space-y-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="font-display font-bold text-xl text-white">
                Explorer les 14 univers musicaux
              </h2>
              <p className="text-xs text-[#8b93a4] mt-1">
                Cliquez sur un univers pour filtrer le catalogue ou lancer une radio thématique
              </p>
            </div>
            <button
              type="button"
              onClick={() => onOpenAllTracks('all')}
              className="text-xs font-semibold text-[#9ca3b0] hover:text-white transition-colors cursor-pointer shrink-0"
            >
              Tout afficher ({catalogCount.toLocaleString('fr-FR')}) →
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
            {CATALOG_GENRES.map((g) => {
              const count = genreCounts[g.name] || 0;
              return (
                <div
                  key={g.name}
                  className={`group p-4 rounded-2xl bg-gradient-to-br ${g.glowClass} border border-white/[0.08] hover:border-white/20 transition-all flex flex-col justify-between min-h-[116px] relative`}
                >
                  <button
                    type="button"
                    onClick={() => onOpenAllTracks(g.name)}
                    className="text-left flex-1 flex flex-col justify-between cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-display font-bold text-[15.5px] text-white">
                        {g.name}
                      </span>
                      <span
                        className="px-2 py-0.5 rounded-full bg-black/50 border border-white/10 text-[10.5px] font-mono-tabular font-bold shrink-0"
                        style={{ color: g.accent }}
                      >
                        {count.toLocaleString('fr-FR')}
                      </span>
                    </div>
                    <p className="text-xs text-[#b0b7c6] line-clamp-2 mt-2 pr-9 leading-relaxed">
                      {g.subtitle}
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => onPlaySmartMix(g.name)}
                    title={`Mix aléatoire ${g.name}`}
                    aria-label={`Mix aléatoire ${g.name}`}
                    className="absolute right-3.5 bottom-3.5 w-8.5 h-8.5 rounded-full bg-white/10 hover:bg-[#1ED760] text-white hover:text-black flex items-center justify-center transition-all cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* Curated Shelves */}
        {shelves.map(
          (shelf) =>
            shelf.tracks.length > 0 && (
              <section key={shelf.genre} className="space-y-4">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <h2 className="font-display font-bold text-xl text-white">
                      {shelf.title}
                    </h2>
                    <p className="text-xs text-[#8b93a4] mt-0.5">
                      {shelf.subtitle}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenAllTracks(shelf.genre)}
                    className="text-xs font-semibold text-[#9ca3b0] hover:text-white transition-colors cursor-pointer shrink-0"
                  >
                    Voir les{' '}
                    {(genreCounts[shelf.genre] || shelf.tracks.length).toLocaleString(
                      'fr-FR'
                    )}{' '}
                    titres →
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
                  {shelf.tracks.map((t) => renderTrackCard(t, shelf.tracks))}
                </div>
              </section>
            )
        )}
      </div>
    </div>
  );
});
