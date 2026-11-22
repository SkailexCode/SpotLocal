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
    <aside className="hidden xl:flex w-[312px] studio-panel rounded-2xl flex-col shrink-0 overflow-hidden select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/[0.06]">
        <h2 className="font-display font-bold text-sm text-white truncate">
          Studio Lecture
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer le panneau"
          className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-[#8b93a4] hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        {currentTrack && (
          <div className="space-y-3.5">
            <AlbumCover
              src={currentTrack.coverUrl}
              alt={currentTrack.title}
              sizeClass="w-full aspect-square"
              roundedClass="rounded-2xl shadow-2xl"
            />
            <div className="space-y-1">
              <p className="font-display font-bold text-lg text-white leading-snug">
                {currentTrack.title}
              </p>
              {onSelectArtist ? (
                <button
                  type="button"
                  onClick={() => onSelectArtist(currentTrack.artist)}
                  className="text-sm text-[#9ca3b0] hover:text-white hover:underline text-left cursor-pointer"
                >
                  {currentTrack.artist}
                </button>
              ) : (
                <p className="text-sm text-[#9ca3b0]">{currentTrack.artist}</p>
              )}
            </div>

            {/* Source Card */}
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.07] space-y-2.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[#8b93a4]">Source active</span>
                {activeAudioSource === 'local-idb' ||
                activeAudioSource === 'local-folder' ? (
                  <span className="inline-flex items-center gap-1 text-[#1ED760] font-semibold">
                    <HardDrive className="w-3 h-3" />
                    MP3 Local
                  </span>
                ) : activeAudioSource === 'youtube' ? (
                  <span className="inline-flex items-center gap-1 text-rose-300 font-semibold">
                    <Youtube className="w-3 h-3 fill-current" />
                    YouTube Intégral
                  </span>
                ) : (
                  <span className="text-[#7d8596]">En attente</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {activeAudioSource === 'youtube' && (
                  <button
                    type="button"
                    onClick={onToggleVideoMode}
                    className="flex-1 h-8 rounded-lg bg-white/[0.07] hover:bg-white/[0.14] text-xs font-semibold text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Tv className="w-3.5 h-3.5 text-[#1ED760]" />
                    <span>
                      {videoDisplayMode === 'theater'
                        ? 'Mini-lecteur'
                        : 'Mode Cinéma'}
                    </span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => onAttachYouTubeLink(currentTrack)}
                  className="flex-1 h-8 rounded-lg bg-white/[0.07] hover:bg-white/[0.14] text-xs font-semibold text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Link2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>Changer lien YT</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Queue */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#8b93a4]">
              À suivre
            </h3>
            <span className="text-[11px] text-[#6e7787] font-mono-tabular">
              {upcomingTracks.length}{' '}
              {upcomingTracks.length > 1 ? 'titres' : 'titre'}
            </span>
          </div>

          {upcomingTracks.length === 0 ? (
            <p className="text-xs text-[#6e7787] py-4">
              La file d&apos;attente est vide. Lancez une radio ou un mix !
            </p>
          ) : (
            <div className="space-y-1">
              {upcomingTracks.slice(0, 16).map((track) => {
                const active = currentTrack?.id === track.id && isPlaying;
                return (
                  <div
                    key={track.id}
                    className="group flex items-center justify-between gap-2 p-2 rounded-xl hover:bg-white/[0.05] transition-colors"
                  >
                    <button
                      type="button"
                      onClick={() => onPlayFromQueue(track)}
                      className="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer"
                    >
                      <div className="relative w-9.5 h-9.5 rounded-lg overflow-hidden shrink-0">
                        <AlbumCover
                          src={track.coverUrl}
                          alt={track.title}
                          sizeClass="w-9.5 h-9.5"
                          roundedClass="rounded-lg"
                        />
                        <span className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          {active ? (
                            <Pause className="w-4 h-4 text-white fill-white" />
                          ) : (
                            <Play className="w-4 h-4 text-white fill-white" />
                          )}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-white truncate">
                          {track.title}
                        </p>
                        <p className="text-[11px] text-[#8b93a4] truncate">
                          {track.artist}
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => onRemoveFromQueue(track.id)}
                      aria-label={`Retirer ${track.title} de la file`}
                      className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-lg hover:bg-white/10 flex items-center justify-center text-[#8b93a4] hover:text-white transition-all cursor-pointer"
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
