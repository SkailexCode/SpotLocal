import { memo } from 'react';
import { HardDrive, Pause, Play, Tv, X } from 'lucide-react';
import type { AudioSourceKind, Track } from '../types/music';
import { AlbumCover } from './AlbumCover';
import { YouTubeLogo } from './Logos';
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
  const isLocal =
    activeAudioSource === 'local-idb' || activeAudioSource === 'local-folder';

  return (
    <aside className="hidden xl:flex w-[306px] studio-panel rounded-xl flex-col shrink-0 overflow-hidden select-none anim-view">
      {/* Header: Lecture en cours + × */}
      <div className="flex items-center justify-between px-4 py-3.5">
        <h2 className="font-display font-bold text-sm text-[var(--text-main)] truncate">
          Lecture en cours
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer le panneau"
          className="w-7 h-7 rounded-full hover:bg-[var(--bg-elevated)] flex items-center justify-center text-[var(--text-sub)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-5">
        {currentTrack ? (
          <div className="space-y-3">
            <AlbumCover
              src={currentTrack.coverUrl}
              videoIds={currentTrack.youtubeVideoIds}
              alt={currentTrack.title}
              size="lg"
              className={`w-full rounded-lg shadow-md ${
                isLocal ? 'aspect-square' : 'aspect-video'
              }`}
            />

            <div className="space-y-0.5 pt-0.5">
              <p className="font-display font-extrabold text-[17px] text-[var(--text-main)] leading-snug line-clamp-2">
                {currentTrack.title}
              </p>
              {onSelectArtist ? (
                <button
                  type="button"
                  onClick={() => onSelectArtist(currentTrack.artist)}
                  className="text-sm text-[var(--text-sub)] hover:text-[var(--text-main)] hover:underline text-left block truncate max-w-full cursor-pointer"
                >
                  {currentTrack.artist}
                </button>
              ) : (
                <p className="text-sm text-[var(--text-sub)] truncate">
                  {currentTrack.artist}
                </p>
              )}
              <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] pt-1">
                {isLocal ? (
                  <HardDrive className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
                ) : (
                  <YouTubeLogo className="w-4 h-3 shrink-0" />
                )}
                <span className="truncate">
                  {currentTrack.album || currentTrack.genre}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              {activeAudioSource === 'youtube' && (
                <button
                  type="button"
                  onClick={onToggleVideoMode}
                  className="flex-1 h-8 rounded-full bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated-hover)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-main)] flex items-center justify-center gap-1.5 anim-press cursor-pointer"
                >
                  <Tv className="w-3.5 h-3.5 text-[var(--accent)]" />
                  <span>
                    {videoDisplayMode === 'theater'
                      ? 'Mini-lecteur'
                      : 'Voir clip'}
                  </span>
                </button>
              )}

              <button
                type="button"
                onClick={() => onAttachYouTubeLink(currentTrack)}
                className="flex-1 h-8 rounded-full bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated-hover)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-main)] flex items-center justify-center gap-1.5 anim-press cursor-pointer"
              >
                <YouTubeLogo className="w-4 h-3 shrink-0" />
                <span>Lien YouTube</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center space-y-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] px-4">
            <p className="text-sm font-bold text-[var(--text-main)]">
              Aucune lecture en cours
            </p>
            <p className="text-xs text-[var(--text-sub)]">
              Lancez un titre pour afficher sa pochette ou sa miniature ici.
            </p>
          </div>
        )}

        {/* À suivre */}
        <div className="space-y-2 pt-1">
          <h3 className="text-xs font-semibold text-[var(--text-main)]">
            À suivre
          </h3>

          {upcomingTracks.length === 0 ? (
            <p className="text-xs text-[var(--text-sub)] py-2">
              La file d&apos;attente est vide.
            </p>
          ) : (
            <div className="space-y-1">
              {upcomingTracks.slice(0, 16).map((track) => {
                const active = currentTrack?.id === track.id && isPlaying;
                return (
                  <div
                    key={track.id}
                    className="group flex items-center justify-between gap-2 p-1.5 rounded-lg hover:bg-[var(--bg-row-hover)] transition-colors"
                  >
                    <button
                      type="button"
                      onClick={() => onPlayFromQueue(track)}
                      className="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer"
                    >
                      <div className="relative w-12 h-7 rounded-[4px] overflow-hidden shrink-0">
                        <AlbumCover
                          src={track.coverUrl}
                          videoIds={track.youtubeVideoIds}
                          alt={track.title}
                          size="sm"
                          className="w-full h-full rounded-[4px]"
                        />
                        <span className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          {active ? (
                            <Pause className="w-3.5 h-3.5 text-white fill-white" />
                          ) : (
                            <Play className="w-3.5 h-3.5 text-white fill-white" />
                          )}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-[var(--text-main)] truncate">
                          {track.title}
                        </p>
                        <p className="text-[11px] text-[var(--text-sub)] truncate">
                          {track.artist}
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => onRemoveFromQueue(track.id)}
                      aria-label={`Retirer ${track.title} de la file`}
                      className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-full hover:bg-[var(--bg-elevated)] flex items-center justify-center text-[var(--text-sub)] hover:text-[var(--text-main)] transition-all cursor-pointer"
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
