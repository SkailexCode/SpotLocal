import { memo, useMemo } from 'react';
import { Check, Pause, Play, Plus, Shuffle } from 'lucide-react';
import type { Playlist, Track } from '../types/music';
import {
  CATALOG_GENRES,
  CATALOG_MOODS,
  catalogStore,
  type UserLibraryOverlay,
} from '../utils/catalogEngine';
import { AlbumCover, getPlaylistCoverUrls, MosaicCover } from './AlbumCover';
import { LikedTracksPoster, VideoClipBadge } from './Logos';

interface HomeViewProps {
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
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 18) return 'Bonjour';
  return 'Bonsoir';
}

export const HomeView = memo(function HomeView({
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
}: HomeViewProps) {
  const catalogMosaic = useMemo(() => {
    void catalogVersion;
    return catalogStore.getCatalogSampleCovers(4);
  }, [catalogVersion]);

  const moodCards = useMemo(() => {
    void catalogVersion;
    return CATALOG_MOODS.slice(0, 5).map((mood) => ({
      ...mood,
      covers: catalogStore.getMoodSampleCovers(mood.bit, 4),
    }));
  }, [catalogVersion]);

  const genreCards = useMemo(() => {
    void catalogVersion;
    return CATALOG_GENRES.map((genre) => ({
      ...genre,
      covers: catalogStore.getGenreSampleCovers(genre.name, 4),
    }));
  }, [catalogVersion]);

  const shelves = useMemo(() => {
    void catalogVersion;
    return [
      {
        title: 'Scène Française',
        genre: 'Scène Française',
        tracks: catalogStore.getShelfTracks('Scène Française', 8, overlay),
      },
      {
        title: 'Rap FR',
        genre: 'Rap FR',
        tracks: catalogStore.getShelfTracks('Rap FR', 8, overlay),
      },
      {
        title: 'Pop',
        genre: 'Pop',
        tracks: catalogStore.getShelfTracks('Pop', 8, overlay),
      },
      {
        title: 'Électro & Dance',
        genre: 'Électro & Dance',
        tracks: catalogStore.getShelfTracks('Électro & Dance', 8, overlay),
      },
      {
        title: 'Rock & Alternative',
        genre: 'Rock & Alternative',
        tracks: catalogStore.getShelfTracks('Rock & Alternative', 8, overlay),
      },
    ];
  }, [catalogVersion, overlay]);

  const renderTrackCard = (track: Track, sectionQueue: Track[]) => {
    const isCurrent = currentTrackId === track.id;
    const activePlaying = isCurrent && isPlaying;
    const isYouTube = Boolean(track.youtubeVideoIds?.length);

    return (
      <div
        key={track.id}
        className={`group p-2.5 rounded-xl studio-card flex flex-col relative ${
          isCurrent ? 'border-[var(--accent)] bg-[var(--bg-row-active)]' : ''
        }`}
      >
        <button
          type="button"
          onClick={() => onPlayTrack(track, sectionQueue)}
          className="relative aspect-video w-full mb-2.5 rounded-lg overflow-hidden cursor-pointer text-left bg-[var(--bg-hover)]"
        >
          <AlbumCover
            src={track.coverUrl}
            videoIds={track.youtubeVideoIds}
            alt={track.title}
            size="lg"
            className="w-full h-full rounded-lg transition-transform duration-200 group-hover:scale-[1.03]"
          />

          {track.durationLabel && (
            <span
              className={`absolute right-1.5 bottom-1.5 px-1.5 py-0.5 rounded bg-black/80 text-[11px] font-mono font-medium text-white leading-none transition-opacity duration-150 ${
                activePlaying ? 'opacity-0' : 'group-hover:opacity-0'
              }`}
            >
              {track.durationLabel}
            </span>
          )}

          <span
            className={`absolute right-2 bottom-2 w-9.5 h-9.5 rounded-full bg-[var(--accent)] text-white flex items-center justify-center shadow-md transition-all duration-150 ${
              activePlaying
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-1.5 group-hover:opacity-100 group-hover:translate-y-0'
            }`}
          >
            {activePlaying ? (
              <Pause className="w-4 h-4 fill-current" />
            ) : (
              <Play className="w-4 h-4 fill-current ml-0.5" />
            )}
          </span>
        </button>

        <div className="flex items-start justify-between gap-2 px-0.5">
          <button
            type="button"
            onClick={() => onPlayTrack(track, sectionQueue)}
            className="min-w-0 flex-1 text-left cursor-pointer"
          >
            <p
              className={`text-sm font-semibold truncate ${
                isCurrent ? 'text-[var(--accent)]' : 'text-[var(--text-main)]'
              }`}
            >
              {track.title}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
              {isYouTube && <VideoClipBadge />}
              <p className="text-xs text-[var(--text-sub)] truncate">
                {track.artist}
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onToggleLike(track.id)}
            aria-label={
              track.liked ? 'Retirer des favoris' : 'Ajouter aux Titres likés'
            }
            className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-opacity cursor-pointer ${
              track.liked
                ? 'bg-[var(--accent)] text-white opacity-100'
                : 'border border-[var(--border-strong)] text-[var(--text-sub)] hover:text-[var(--text-main)] opacity-0 group-hover:opacity-100'
            }`}
          >
            {track.liked ? (
              <Check className="w-3 h-3 stroke-[3]" />
            ) : (
              <Plus className="w-3 h-3 stroke-[2.5]" />
            )}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 studio-panel rounded-xl overflow-y-auto anim-view">
      <div className="px-5 sm:px-7 py-6 space-y-8">
        {/* Top Greeting + Shuffle */}
        <div className="flex items-center justify-between gap-4">
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-[var(--text-main)]">
            {getGreeting()}
          </h1>

          <button
            type="button"
            onClick={() => onPlaySmartMix()}
            className="inline-flex items-center gap-2 h-9.5 px-4 rounded-full btn-accent text-xs font-semibold cursor-pointer"
          >
            <Shuffle className="w-3.5 h-3.5" />
            <span>Lecture aléatoire</span>
          </button>
        </div>

        {/* Quick Shortcuts with real posters */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={onOpenLiked}
            className="flex items-center gap-3.5 pr-4 rounded-lg studio-card overflow-hidden text-left cursor-pointer"
          >
            <LikedTracksPoster
              className="w-14 h-14 rounded-none"
              iconClassName="w-5 h-5"
            />
            <span className="font-display font-semibold text-sm text-[var(--text-main)] truncate">
              Titres likés
            </span>
          </button>

          <button
            type="button"
            onClick={() => onOpenAllTracks('all')}
            className="flex items-center gap-3.5 pr-4 rounded-lg studio-card overflow-hidden text-left cursor-pointer"
          >
            <MosaicCover
              urls={catalogMosaic}
              alt="Catalogue"
              size="sm"
              className="w-14 h-14"
            />
            <span className="font-display font-semibold text-sm text-[var(--text-main)] truncate">
              Catalogue
            </span>
          </button>

          {playlists.length === 0 ? (
            <button
              type="button"
              onClick={onCreatePlaylist}
              className="flex items-center gap-3.5 pr-4 rounded-lg studio-card overflow-hidden text-left cursor-pointer"
            >
              <div className="w-14 h-14 bg-[var(--accent-soft)] flex items-center justify-center shrink-0">
                <Plus className="w-5 h-5 text-[var(--accent)]" />
              </div>
              <span className="font-display font-semibold text-sm text-[var(--text-main)] truncate">
                Nouvelle playlist
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onOpenPlaylist(playlists[0].id)}
              className="flex items-center gap-3.5 pr-4 rounded-lg studio-card overflow-hidden text-left cursor-pointer"
            >
              <MosaicCover
                urls={getPlaylistCoverUrls(playlists[0])}
                alt={playlists[0].name}
                size="sm"
                className="w-14 h-14"
              />
              <span className="font-display font-semibold text-sm text-[var(--text-main)] truncate">
                {playlists[0].name}
              </span>
            </button>
          )}
        </section>

        {/* Recently Played */}
        {recentTracks.length > 0 && (
          <section className="space-y-3">
            <h2 className="font-display font-bold text-lg text-[var(--text-main)]">
              Écoutés récemment
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3.5">
              {recentTracks
                .slice(0, 4)
                .map((t) => renderTrackCard(t, recentTracks))}
            </div>
          </section>
        )}

        {/* Ambiances with real 2x2 Mosaic Posters */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-bold text-lg text-[var(--text-main)]">
              Ambiances
            </h2>
            <button
              type="button"
              onClick={onOpenMoods}
              className="text-xs font-semibold text-[var(--text-sub)] hover:text-[var(--text-main)] cursor-pointer"
            >
              Tout voir
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
            {moodCards.map((mood) => (
              <div
                key={mood.bit}
                className="group p-2.5 rounded-xl studio-card flex items-center gap-3"
              >
                <button
                  type="button"
                  onClick={() => onOpenAllTracks('all', mood.bit)}
                  className="flex items-center gap-3 min-w-0 flex-1 text-left cursor-pointer"
                >
                  <MosaicCover
                    urls={mood.covers}
                    alt={mood.name}
                    size="sm"
                    className="w-12 h-12 rounded-lg"
                  />
                  <span className="font-semibold text-sm text-[var(--text-main)] truncate">
                    {mood.name}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => onPlaySmartMix('all', mood.bit)}
                  aria-label={`Lancer ${mood.name}`}
                  className="w-8 h-8 rounded-full bg-[var(--bg-panel)] hover:bg-[var(--accent)] text-[var(--text-main)] hover:text-white border border-[var(--border-subtle)] flex items-center justify-center shrink-0 transition-colors cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Genres with real tilted cover posters */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-bold text-lg text-[var(--text-main)]">
              Genres
            </h2>
            <button
              type="button"
              onClick={() => onOpenAllTracks('all')}
              className="text-xs font-semibold text-[var(--text-sub)] hover:text-[var(--text-main)] cursor-pointer"
            >
              Parcourir
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-2.5">
            {genreCards.map((g) => (
              <button
                key={g.name}
                type="button"
                onClick={() => onOpenAllTracks(g.name)}
                className="group relative h-[76px] p-3.5 rounded-xl studio-card overflow-hidden text-left cursor-pointer"
              >
                <span className="relative z-10 block max-w-[68%] font-display font-bold text-sm text-[var(--text-main)] leading-snug">
                  {g.name}
                </span>
                {g.covers[0] && (
                  <AlbumCover
                    src={g.covers[0]}
                    alt={g.name}
                    size="sm"
                    className="w-16 h-16 rounded-lg shadow-md absolute -right-2 -bottom-2 rotate-[16deg] transition-transform duration-200 group-hover:scale-105 group-hover:rotate-[12deg]"
                  />
                )}
              </button>
            ))}
          </div>
        </section>

        {/* Video / Music Shelves with 16:9 YouTube Miniatures ("minia") */}
        {shelves.map(
          (shelf) =>
            shelf.tracks.length > 0 && (
              <section key={shelf.genre} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="font-display font-bold text-lg text-[var(--text-main)]">
                    {shelf.title}
                  </h2>
                  <button
                    type="button"
                    onClick={() => onOpenAllTracks(shelf.genre)}
                    className="text-xs font-semibold text-[var(--text-sub)] hover:text-[var(--text-main)] cursor-pointer"
                  >
                    Tout voir
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3.5">
                  {shelf.tracks.map((t) => renderTrackCard(t, shelf.tracks))}
                </div>
              </section>
            )
        )}
      </div>
    </div>
  );
});
