import {
  Check,
  ListMusic,
  Pause,
  Play,
  Plus,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Youtube,
  ExternalLink,
} from 'lucide-react';
import type { RepeatMode, Track } from '../types/music';
import { formatTime, getTrackYouTubeWatchUrl } from '../utils/musicLogic';
import { AlbumCover } from './AlbumCover';

interface PlayerBarProps {
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  muted: boolean;
  shuffle: boolean;
  repeat: RepeatMode;
  queueOpen: boolean;
  audioError: string | null;
  youtubeActive?: boolean;
  activeVideoId?: string | null;
  onTogglePlayPause: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onSeek: (timeSec: number) => void;
  onVolumeChange: (vol: number) => void;
  onToggleMute: () => void;
  onToggleShuffle: () => void;
  onCycleRepeat: () => void;
  onToggleLike: (trackId: string) => void;
  onToggleQueue: () => void;
}

export function PlayerBar({
  currentTrack,
  isPlaying,
  currentTime,
  duration,
  volume,
  muted,
  shuffle,
  repeat,
  queueOpen,
  audioError,
  youtubeActive = false,
  activeVideoId = null,
  onTogglePlayPause,
  onPrevious,
  onNext,
  onSeek,
  onVolumeChange,
  onToggleMute,
  onToggleShuffle,
  onCycleRepeat,
  onToggleLike,
  onToggleQueue,
}: PlayerBarProps) {
  const effectiveDuration = duration > 0 ? duration : currentTrack?.durationSec || 30;
  const progressPct = Math.min(
    100,
    Math.max(0, effectiveDuration > 0 ? (currentTime / effectiveDuration) * 100 : 0)
  );
  const ytWatchUrl =
    currentTrack && youtubeActive ? getTrackYouTubeWatchUrl(currentTrack, activeVideoId) : null;

  return (
    <footer
      aria-label="Lecteur audio"
      className="relative h-[74px] sm:h-[86px] bg-black px-3 sm:px-4 flex items-center justify-between gap-3 sm:gap-4 shrink-0 select-none border-t border-white/[0.06] sm:border-t-0"
    >
      {/* Mobile thin top progress bar */}
      <div className="sm:hidden absolute top-0 left-0 right-0 h-[2px] bg-[#2a2a2a]">
        <div
          className="h-full bg-[#1ED760]"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Left: Now Playing Info */}
      <div className="flex items-center gap-3 min-w-0 flex-1 sm:flex-none sm:w-[30%] sm:max-w-[340px]">
        {currentTrack ? (
          <>
            <AlbumCover
              src={currentTrack.coverUrl}
              alt={currentTrack.title}
              sizeClass="w-12 h-12 sm:w-14 sm:h-14"
              roundedClass="rounded-[4px]"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {currentTrack.title}
                </p>
                {youtubeActive && ytWatchUrl && (
                  <a
                    href={ytWatchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Ouvrir la vidéo officielle sur YouTube"
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm bg-red-600/20 text-red-400 hover:text-white hover:bg-red-600/40 text-[10px] font-semibold transition-colors shrink-0"
                  >
                    <Youtube className="w-2.5 h-2.5 fill-current" />
                    <span>YouTube</span>
                    <ExternalLink className="w-2 h-2 opacity-80" />
                  </a>
                )}
              </div>
              <p className="text-xs text-[#b3b3b3] truncate">
                {currentTrack.artist}
              </p>
              {audioError && (
                <p className="text-[11px] text-amber-400 truncate">{audioError}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => onToggleLike(currentTrack.id)}
              aria-label={
                currentTrack.liked
                  ? `Retirer ${currentTrack.title} des titres likés`
                  : `Aimer ${currentTrack.title}`
              }
              className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                currentTrack.liked
                  ? 'bg-[#1ED760] text-black'
                  : 'border border-[#b3b3b3]/70 text-[#b3b3b3] hover:border-white hover:text-white'
              }`}
            >
              {currentTrack.liked ? (
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              ) : (
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              )}
            </button>
          </>
        ) : (
          <div className="text-xs text-[#9a9a9a] truncate">
            Sélectionnez un titre pour lancer la lecture
          </div>
        )}
      </div>

      {/* Mobile compact transport controls */}
      <div className="flex sm:hidden items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onTogglePlayPause}
          disabled={!currentTrack}
          aria-label={isPlaying ? 'Pause' : 'Lecture'}
          className="w-9 h-9 rounded-full bg-white disabled:opacity-40 text-black flex items-center justify-center cursor-pointer"
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 fill-black" />
          ) : (
            <Play className="w-4 h-4 fill-black ml-0.5" />
          )}
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!currentTrack}
          aria-label="Titre suivant"
          className="w-8 h-8 rounded-full flex items-center justify-center text-[#b3b3b3] hover:text-white disabled:opacity-40 cursor-pointer"
        >
          <SkipForward className="w-5 h-5 fill-current" />
        </button>
      </div>

      {/* Desktop Center: Transport Controls + Seek Bar */}
      <div className="hidden sm:flex flex-col items-center gap-1.5 flex-1 max-w-[600px]">
        <div className="flex items-center gap-4 sm:gap-5">
          <button
            type="button"
            onClick={onToggleShuffle}
            aria-label="Lecture aléatoire"
            title="Lecture aléatoire"
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
              shuffle ? 'text-[#1ED760]' : 'text-[#b3b3b3] hover:text-white'
            }`}
          >
            <Shuffle className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onPrevious}
            disabled={!currentTrack}
            aria-label="Titre précédent"
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#b3b3b3] hover:text-white disabled:opacity-40 transition-colors cursor-pointer"
          >
            <SkipBack className="w-5 h-5 fill-current" />
          </button>

          <button
            type="button"
            onClick={onTogglePlayPause}
            disabled={!currentTrack}
            aria-label={isPlaying ? 'Pause' : 'Lecture'}
            className="w-9 h-9 rounded-full bg-white hover:scale-105 active:scale-95 disabled:opacity-40 text-black flex items-center justify-center transition-transform cursor-pointer"
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 fill-black" />
            ) : (
              <Play className="w-4 h-4 fill-black ml-0.5" />
            )}
          </button>

          <button
            type="button"
            onClick={onNext}
            disabled={!currentTrack}
            aria-label="Titre suivant"
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#b3b3b3] hover:text-white disabled:opacity-40 transition-colors cursor-pointer"
          >
            <SkipForward className="w-5 h-5 fill-current" />
          </button>

          <button
            type="button"
            onClick={onCycleRepeat}
            aria-label={`Répétition : ${repeat}`}
            title="Répéter"
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
              repeat !== 'off' ? 'text-[#1ED760]' : 'text-[#b3b3b3] hover:text-white'
            }`}
          >
            {repeat === 'one' ? (
              <Repeat1 className="w-4 h-4" />
            ) : (
              <Repeat className="w-4 h-4" />
            )}
          </button>
        </div>

        <div className="w-full flex items-center gap-2.5">
          <span className="text-[11px] text-[#b3b3b3] font-mono-tabular w-9 text-right">
            {formatTime(currentTime)}
          </span>
          <div className="relative flex-1 h-3 flex items-center group">
            <div className="w-full h-1 rounded-full bg-[#4d4d4d] overflow-hidden">
              <div
                className="h-full bg-white group-hover:bg-[#1ED760] transition-colors"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <input
              type="range"
              min={0}
              max={effectiveDuration}
              step={0.1}
              value={Math.min(currentTime, effectiveDuration)}
              disabled={!currentTrack}
              onChange={(e) => onSeek(Number(e.target.value))}
              aria-label="Position de lecture"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>
          <span className="text-[11px] text-[#b3b3b3] font-mono-tabular w-9">
            {formatTime(effectiveDuration)}
          </span>
        </div>
      </div>

      {/* Right: Queue & Volume */}
      <div className="hidden sm:flex items-center justify-end gap-3 w-[28%] max-w-[280px]">
        <button
          type="button"
          onClick={onToggleQueue}
          aria-label="File d'attente"
          title="File d'attente"
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
            queueOpen ? 'text-[#1ED760]' : 'text-[#b3b3b3] hover:text-white'
          }`}
        >
          <ListMusic className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 w-32">
          <button
            type="button"
            onClick={onToggleMute}
            aria-label={muted ? 'Réactiver le son' : 'Couper le son'}
            className="text-[#b3b3b3] hover:text-white transition-colors cursor-pointer"
          >
            {muted || volume === 0 ? (
              <VolumeX className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>

          <div className="relative flex-1 h-3 flex items-center group">
            <div className="w-full h-1 rounded-full bg-[#4d4d4d] overflow-hidden">
              <div
                className="h-full bg-white group-hover:bg-[#1ED760] transition-colors"
                style={{ width: `${(muted ? 0 : volume) * 100}%` }}
              />
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.02}
              value={muted ? 0 : volume}
              onChange={(e) => onVolumeChange(Number(e.target.value))}
              aria-label="Volume"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>
        </div>
      </div>
    </footer>
  );
}
