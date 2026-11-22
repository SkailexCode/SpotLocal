import { Disc3, ExternalLink, Scale, X, Youtube } from 'lucide-react';
import type { Track } from '../types/music';
import { getTrackYouTubeWatchUrl } from '../utils/musicLogic';
import { AlbumCover } from './AlbumCover';

interface RightQueuePanelProps {
  currentTrack: Track | null;
  youtubeActive: boolean;
  activeVideoId?: string | null;
  playbackMode: 'local' | 'full' | 'preview';
  queue: Track[];
  currentIndex: number;
  onPlayTrack: (track: Track, queue: Track[]) => void;
  onClose: () => void;
  onOpenLegalModal?: () => void;
}

export function RightQueuePanel({
  currentTrack,
  youtubeActive,
  activeVideoId,
  playbackMode,
  queue,
  currentIndex,
  onPlayTrack,
  onClose,
  onOpenLegalModal,
}: RightQueuePanelProps) {
  const upcoming = currentIndex >= 0 ? queue.slice(currentIndex + 1, currentIndex + 12) : [];
  const youtubeUrl = currentTrack ? getTrackYouTubeWatchUrl(currentTrack, activeVideoId) : null;

  return (
    <aside
      aria-label="Lecture en cours et file d'attente"
      className="hidden xl:flex flex-col w-[290px] shrink-0 h-full bg-[#121212] rounded-lg overflow-hidden"
    >
      <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-white/[0.06]">
        <h2 className="font-display font-bold text-sm text-white">
          Lecture en cours
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer la file d'attente"
          className="w-7 h-7 rounded-full flex items-center justify-center text-[#b3b3b3] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {currentTrack ? (
          <div className="space-y-3">
            {youtubeActive ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-600/20 text-red-400 font-semibold text-[10px] border border-red-500/30">
                    <Youtube className="w-3 h-3 fill-red-500 text-red-500" />
                    Lecteur officiel YouTube
                  </span>
                  {youtubeUrl && (
                    <a
                      href={youtubeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-[#b3b3b3] hover:text-white transition-colors"
                      title="Ouvrir dans un nouvel onglet YouTube"
                    >
                      <span>Ouvrir</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
                {/* Reserved video placement for YouTube IFrame player */}
                <div className="aspect-video w-full rounded-md bg-black/80 shadow-inner" aria-hidden="true" />
              </div>
            ) : (
              <div className="aspect-square w-full rounded-md overflow-hidden shadow-lg bg-[#242424]">
                <AlbumCover
                  src={currentTrack.coverUrl}
                  alt={currentTrack.title}
                  sizeClass="w-full h-full"
                  roundedClass="rounded-md"
                />
              </div>
            )}

            <div className="min-w-0">
              <p className="font-display font-bold text-base text-white leading-snug truncate">
                {currentTrack.title}
              </p>
              <p className="text-xs text-[#b3b3b3] truncate mt-0.5">
                {currentTrack.artist}
              </p>
              <p className="text-[11px] text-[#8f8f8f] mt-1 truncate">
                {currentTrack.album} ·{' '}
                {playbackMode === 'local'
                  ? 'Fichier MP3 local'
                  : youtubeActive
                    ? 'Vidéo officielle YouTube'
                    : playbackMode === 'full'
                      ? 'Titre complet'
                      : 'Extrait audio (30 s)'}
              </p>
            </div>

            {/* Official YouTube redirection button */}
            {youtubeActive && youtubeUrl && (
              <div className="pt-1 space-y-1.5">
                <a
                  href={youtubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[#242424] hover:bg-[#2f2f2f] border border-white/10 text-xs font-semibold text-white transition-all cursor-pointer group shadow-xs"
                >
                  <Youtube className="w-4 h-4 text-red-500 fill-red-500 group-hover:scale-110 transition-transform" />
                  <span>Regarder sur YouTube</span>
                  <ExternalLink className="w-3 h-3 text-[#9a9a9a]" />
                </a>
                <p className="text-[10px] text-[#7a7a7a] leading-tight px-0.5">
                  Diffusé via YouTube IFrame API. Vues et annonces créditées aux ayants droit.
                </p>
              </div>
            )}

            {onOpenLegalModal && (
              <button
                type="button"
                onClick={onOpenLegalModal}
                className="inline-flex items-center gap-1.5 text-[11px] text-[#8a8a8a] hover:text-[#1ED760] transition-colors cursor-pointer pt-0.5"
              >
                <Scale className="w-3.5 h-3.5" />
                <span>Notice légale & Open Source</span>
              </button>
            )}
          </div>
        ) : (
          <div className="py-10 text-center space-y-2">
            <Disc3 className="w-10 h-10 text-[#535353] mx-auto" />
            <p className="text-xs text-[#b3b3b3]">
              Aucun titre en cours de lecture
            </p>
          </div>
        )}

        <div className="space-y-2 pt-2 border-t border-white/[0.06]">
          <h3 className="text-xs font-semibold text-[#b3b3b3]">
            À suivre ({upcoming.length})
          </h3>
          {upcoming.length === 0 ? (
            <p className="text-xs text-[#7a7a7a]">
              Fin de la file d&apos;attente.
            </p>
          ) : (
            <div className="space-y-1">
              {upcoming.map((track) => (
                <button
                  key={`${track.id}-up`}
                  type="button"
                  onClick={() => onPlayTrack(track, queue)}
                  className="w-full flex items-center gap-2.5 p-1.5 rounded-md hover:bg-white/[0.07] text-left transition-colors cursor-pointer"
                >
                  <AlbumCover
                    src={track.coverUrl}
                    alt={track.title}
                    sizeClass="w-9 h-9"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-white truncate">
                      {track.title}
                    </p>
                    <p className="text-[11px] text-[#b3b3b3] truncate">
                      {track.artist}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
