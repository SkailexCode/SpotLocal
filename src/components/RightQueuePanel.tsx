import { memo } from 'react';
import {
  HardDrive,
  Link2,
  Pause,
  Play,
  Tv,
  X,
  Youtube,
} from 'lucide-react';
import type { AudioSourceKind, Track } from '../types/music';
import { AlbumCover } from './AlbumCover';
import type { VideoDisplayMode } from './YouTubePlayerHost';

interface RightQueuePanelProps {
  currentTrack: Track | null;
  upcomingTracks: Track[];
  isPlaying: boolean;
  activeAudioSource: AudioSourceKind;
  videoDisplayMode: VideoDisplayMode;
  onToggleVideoMode: () => void;
  onAttachYouTubeLink: (track: Track) => void;
  onPlayFromQueue: (track: Track) => void;
  onRemoveFromQueue: (trackId: string) => void;
  onSelectArtist?: (artistName: string) => void;
  onClose: () => void;
}

export const RightQueuePanel = memo(function RightQueuePanel({
  currentTrack,
  upcomingTracks,
  isPlaying,
  activeAudioSource,
  videoDisplayMode,
  onToggleVideoMode,
  onAttachYouTubeLink,
  onPlayFromQueue,
  onRemoveFromQueue,
  onSelectArtist,
  onClose,
}: RightQueuePanelProps) {
  return (
    <aside className="fixed inset-y-16 right-2 z-30 xl:static xl:z-auto flex flex-col w-[300px] sm:w-[320px] xl:w-[300px] shrink-0 bg-[#121212] rounded-lg border border-white/10 xl:border-none shadow-2xl xl:shadow-none overflow-hidden select-none">
      <div className="flex items-center justify-between px-4 pt-3.5 pb-2.5 border-b border-white/[0.06]">
        <h2 className="font-display font-bold text-[15px] text-white truncate">
          File d&apos;attente
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer la file d'attente"
          className="p-1.5 rounded-full text-[#b3b3b3] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 pt-3 space-y-5">
        {currentTrack ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#b3b3b3]">
                Lecture en cours
              </p>

              {(activeAudioSource === 'local-idb' ||
                activeAudioSource === 'local-folder') && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1ED760]">
                  <HardDrive className="w-3 h-3" />
                  MP3 Local
                </span>
              )}
              {activeAudioSource === 'youtube' && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-400">
                  <Youtube className="w-3 h-3 fill-current" />
                  YouTube Intégral
                </span>
              )}
            </div>

            <AlbumCover
              src={currentTrack.coverUrl}
              alt={currentTrack.album}
              sizeClass="w-full aspect-square"
              roundedClass="rounded-lg shadow-lg"
            />

            <div>
              <p className="font-display font-bold text-lg text-white leading-snug">
                {currentTrack.title}
              </p>
              {onSelectArtist ? (
                <button
                  type="button"
                  onClick={() => onSelectArtist(currentTrack.artist)}
                  className="text-sm text-[#b3b3b3] hover:text-white hover:underline mt-0.5 text-left cursor-pointer"
                >
                  {currentTrack.artist}
                </button>
              ) : (
                <p className="text-sm text-[#b3b3b3] mt-0.5">
                  {currentTrack.artist}
                </p>
              )}
              <p className="text-xs text-[#8a8a8a] mt-1">{currentTrack.album}</p>
            </div>

            {/* Source Actions */}
            <div className="flex flex-wrap gap-2 pt-1">
              {activeAudioSource === 'youtube' && (
                <button
                  type="button"
                  onClick={onToggleVideoMode}
                  className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                    videoDisplayMode !== 'hidden'
                      ? 'bg-[#1ED760] text-black'
                      : 'bg-white/10 text-white hover:bg-white/15'
                  }`}
                >
                  <Tv className="w-3.5 h-3.5" />
                  <span>
                    {videoDisplayMode === 'hidden'
                      ? 'Afficher le clip'
                      : videoDisplayMode === 'pip'
                      ? 'Mode Cinéma'
                      : 'Masquer le clip'}
                  </span>
                </button>
              )}

              <button
                type="button"
                onClick={() => onAttachYouTubeLink(currentTrack)}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-white/10 hover:bg-white/15 text-xs font-medium text-white transition-colors cursor-pointer"
              >
                <Link2 className="w-3.5 h-3.5 text-[#1ED760]" />
                <span>
                  {currentTrack.youtubeVideoIds?.length
                    ? 'Changer le lien YT'
                    : 'Associer un lien YT'}
                </span>
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-[#b3b3b3]">Aucun titre sélectionné.</p>
        )}

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#b3b3b3]">
            À suivre ({upcomingTracks.length})
          </p>

          {upcomingTracks.length === 0 ? (
            <p className="text-xs text-[#8a8a8a]">
              Lancez une playlist ou un album pour remplir la file d&apos;attente.
            </p>
          ) : (
            <div className="space-y-1">
              {upcomingTracks.slice(0, 20).map((t) => {
                const active = currentTrack?.id === t.id && isPlaying;
                return (
                  <div
                    key={t.id}
                    className="group flex items-center gap-2.5 p-1.5 rounded-md hover:bg-white/[0.07] transition-colors"
                  >
                    <button
                      type="button"
                      onClick={() => onPlayFromQueue(t)}
                      className="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer"
                    >
                      <div className="relative w-10 h-10 shrink-0">
                        <AlbumCover
                          src={t.coverUrl}
                          alt={t.title}
                          sizeClass="w-10 h-10"
                        />
                        <span className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-[4px] transition-opacity">
                          {active ? (
                            <Pause className="w-4 h-4 text-white fill-white" />
                          ) : (
                            <Play className="w-4 h-4 text-white fill-white" />
                          )}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-white truncate">
                          {t.title}
                        </p>
                        <p className="text-xs text-[#b3b3b3] truncate">
                          {t.artist}
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => onRemoveFromQueue(t.id)}
                      aria-label={`Retirer ${t.title} de la file`}
                      title="Retirer de la file"
                      className="opacity-0 group-hover:opacity-100 p-1 rounded text-[#8e8e8e] hover:text-white transition-opacity cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
});
