import { useState } from 'react';
import {
  Check,
  ListMusic,
  Loader2,
  Moon,
  Music,
  Pause,
  Play,
  Plus,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Tv,
  Volume1,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type {
  AudioSourceKind,
  RepeatMode,
  SleepTimerOption,
  Track,
} from '../types/music';
import { formatTime } from '../utils/musicLogic';
import { AlbumCover } from './AlbumCover';
import type { VideoDisplayMode } from './YouTubePlayerHost';

interface PlayerBarProps {
  currentTrack: Track | null;
  isPlaying: boolean;
  isLoadingAudio: boolean;
  isShuffle: boolean;
  repeatMode: RepeatMode;
  currentTimeSec: number;
  durationSec: number;
  volume: number;
  isMuted: boolean;
  showQueuePanel: boolean;
  activeAudioSource: AudioSourceKind;
  videoDisplayMode: VideoDisplayMode;
  sleepTimerRemainingMin: number | null;
  activeSleepOption: SleepTimerOption;
  onTogglePlay: () => void;
  onPlaySmartMix?: () => void;
  onPrev: () => void;
  onNext: () => void;
  onToggleShuffle: () => void;
  onCycleRepeat: () => void;
  onSeek: (newTimeSec: number) => void;
  onVolumeChange: (newVol: number) => void;
  onToggleMute: () => void;
  onToggleLike: (trackId: string) => void;
  onToggleQueuePanel: () => void;
  onToggleVideoMode: () => void;
  onAttachYouTubeLink: (track: Track) => void;
  onSelectSleepTimer: (opt: SleepTimerOption) => void;
  onSelectArtist?: (artistName: string) => void;
}

const SLEEP_OPTIONS: Array<{ value: SleepTimerOption; label: string }> = [
  { value: 0, label: 'Désactivée' },
  { value: 15, label: 'Dans 15 minutes' },
  { value: 30, label: 'Dans 30 minutes' },
  { value: 45, label: 'Dans 45 minutes' },
  { value: 60, label: 'Dans 1 heure' },
  { value: 'end-of-track', label: 'À la fin du titre' },
];

export function PlayerBar({
  currentTrack,
  isPlaying,
  isLoadingAudio,
  isShuffle,
  repeatMode,
  currentTimeSec,
  durationSec,
  volume,
  isMuted,
  showQueuePanel,
  activeAudioSource,
  videoDisplayMode,
  sleepTimerRemainingMin,
  activeSleepOption,
  onTogglePlay,
  onPlaySmartMix,
  onPrev,
  onNext,
  onToggleShuffle,
  onCycleRepeat,
  onSeek,
  onVolumeChange,
  onToggleMute,
  onToggleLike,
  onToggleQueuePanel,
  onToggleVideoMode,
  onSelectSleepTimer,
  onSelectArtist,
}: PlayerBarProps) {
  const [showSleepMenu, setShowSleepMenu] = useState(false);

  const effectiveDuration =
    durationSec > 0 ? durationSec : currentTrack?.durationSec || 0;
  const progressPercent =
    effectiveDuration > 0
      ? Math.min(100, (currentTimeSec / effectiveDuration) * 100)
      : 0;
  const displayVolume = isMuted ? 0 : volume;

  return (
    <footer
      style={{ backgroundColor: 'var(--player-bg)' }}
      className="h-[82px] px-3 sm:px-5 backdrop-blur-xl border-t border-[var(--border-panel)] grid grid-cols-[1fr_auto] md:grid-cols-3 items-center gap-3 shrink-0 select-none z-20 relative transition-colors duration-250"
    >
      {/* Left: Cover + Title + Artist + Round Check (✓) (exact image-1.png) */}
      <div className="flex items-center gap-3.5 min-w-0">
        {currentTrack ? (
          <>
            <AlbumCover
              src={currentTrack.coverUrl}
              alt={currentTrack.title}
              sizeClass="w-13.5 h-13.5"
              roundedClass="rounded-md shadow-md"
            />

            <div className="min-w-0">
              <p className="text-sm font-bold text-[var(--text-main)] truncate">
                {currentTrack.title}
              </p>
              {onSelectArtist ? (
                <button
                  type="button"
                  onClick={() => onSelectArtist(currentTrack.artist)}
                  className="text-xs text-[var(--text-sub)] hover:text-[var(--text-main)] hover:underline truncate block text-left max-w-full mt-0.5 cursor-pointer"
                >
                  {currentTrack.artist}
                </button>
              ) : (
                <p className="text-xs text-[var(--text-sub)] truncate mt-0.5">
                  {currentTrack.artist}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() => onToggleLike(currentTrack.id)}
              aria-label={
                currentTrack.liked
                  ? 'Retirer des favoris'
                  : 'Ajouter aux Titres likés'
              }
              className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all duration-150 cursor-pointer ${
                currentTrack.liked
                  ? 'bg-[var(--accent)] text-white shadow-xs'
                  : 'border border-[var(--text-sub)] text-[var(--text-sub)] hover:border-[var(--text-main)] hover:text-[var(--text-main)]'
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
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex items-center justify-center shrink-0">
              <Music className="w-5 h-5 text-[var(--text-sub)]" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-medium text-[var(--text-main)] truncate">
                Aucune lecture
              </p>
              {onPlaySmartMix && (
                <button
                  type="button"
                  onClick={onPlaySmartMix}
                  className="text-xs text-[var(--text-sub)] hover:text-[var(--text-main)] hover:underline truncate block cursor-pointer"
                >
                  Lecture aléatoire
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Center: Transport Controls + Progress Bar (exact image-1.png) */}
      <div className="flex flex-col items-center justify-center gap-1.5 max-w-xl w-full mx-auto">
        <div className="flex items-center gap-4 sm:gap-5">
          <button
            type="button"
            onClick={onToggleShuffle}
            aria-label="Lecture aléatoire"
            className={`hidden sm:flex items-center justify-center transition-colors cursor-pointer ${
              isShuffle
                ? 'text-[var(--accent)]'
                : 'text-[var(--text-sub)] hover:text-[var(--text-main)]'
            }`}
          >
            <Shuffle className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onPrev}
            aria-label="Titre précédent"
            className="text-[var(--text-sub)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
          >
            <SkipBack className="w-4.5 h-4.5 fill-current" />
          </button>

          <button
            type="button"
            onClick={onTogglePlay}
            aria-label={isPlaying ? 'Pause' : 'Lecture'}
            className="w-9 h-9 rounded-full bg-[var(--pill-active-bg)] text-[var(--pill-active-fg)] flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-sm cursor-pointer"
          >
            {isLoadingAudio ? (
              <Loader2 className="w-4.5 h-4.5 animate-spin" />
            ) : isPlaying ? (
              <Pause className="w-4.5 h-4.5 fill-current" />
            ) : (
              <Play className="w-4.5 h-4.5 fill-current ml-0.5" />
            )}
          </button>

          <button
            type="button"
            onClick={onNext}
            aria-label="Titre suivant"
            className="text-[var(--text-sub)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
          >
            <SkipForward className="w-4.5 h-4.5 fill-current" />
          </button>

          <button
            type="button"
            onClick={onCycleRepeat}
            aria-label="Mode répétition"
            className={`hidden sm:flex items-center justify-center transition-colors cursor-pointer ${
              repeatMode !== 'off'
                ? 'text-[var(--accent)]'
                : 'text-[var(--text-sub)] hover:text-[var(--text-main)]'
            }`}
          >
            {repeatMode === 'one' ? (
              <Repeat1 className="w-4 h-4" />
            ) : (
              <Repeat className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Seek Bar */}
        <div className="hidden md:flex items-center gap-2.5 w-full">
          <span className="text-[11px] text-[var(--text-sub)] font-mono-tabular w-9 text-right">
            {formatTime(currentTimeSec)}
          </span>

          <div className="relative flex-1 h-4 flex items-center group">
            <div className="w-full h-1 rounded-full bg-[var(--border-strong)] overflow-hidden">
              <div
                className="h-full bg-[var(--text-main)] group-hover:bg-[var(--accent)] transition-colors rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <input
              type="range"
              aria-label="Progression du morceau"
              min={0}
              max={effectiveDuration || 100}
              step={1}
              value={Math.min(currentTimeSec, effectiveDuration || 100)}
              disabled={!currentTrack}
              onChange={(e) => onSeek(Number(e.target.value))}
              className="absolute inset-0 w-full opacity-0 cursor-pointer disabled:cursor-default"
            />
          </div>

          <span className="text-[11px] text-[var(--text-sub)] font-mono-tabular w-9">
            {formatTime(effectiveDuration)}
          </span>
        </div>
      </div>

      {/* Right: Queue + Video + Sleep + Volume (exact image-1.png) */}
      <div className="hidden md:flex items-center justify-end gap-2.5">
        {activeAudioSource === 'youtube' && (
          <button
            type="button"
            onClick={onToggleVideoMode}
            title={
              videoDisplayMode === 'theater'
                ? 'Réduire le clip'
                : 'Agrandir le clip'
            }
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
              videoDisplayMode === 'theater'
                ? 'text-[var(--accent)] bg-[var(--accent-soft)]'
                : 'text-[var(--text-sub)] hover:text-[var(--text-main)]'
            }`}
          >
            <Tv className="w-4 h-4" />
          </button>
        )}

        {/* Sleep Timer */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowSleepMenu((v) => !v)}
            title="Mise en veille automatique"
            aria-label="Mise en veille automatique"
            className={`h-8 px-2 rounded-full flex items-center gap-1 text-xs transition-colors cursor-pointer ${
              activeSleepOption !== 0
                ? 'text-[var(--accent)] bg-[var(--accent-soft)] font-semibold'
                : 'text-[var(--text-sub)] hover:text-[var(--text-main)]'
            }`}
          >
            <Moon className="w-4 h-4" />
            {sleepTimerRemainingMin !== null && (
              <span className="font-mono-tabular text-[10.5px]">
                {sleepTimerRemainingMin}m
              </span>
            )}
          </button>

          {showSleepMenu && (
            <div className="absolute right-0 bottom-11 z-30 w-48 py-1.5 rounded-xl bg-[var(--bg-panel-solid)] border border-[var(--border-strong)] shadow-2xl text-xs text-[var(--text-main)] anim-modal">
              <p className="px-3.5 py-1 text-[10.5px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Mise en veille
              </p>
              {SLEEP_OPTIONS.map((opt) => (
                <button
                  key={String(opt.value)}
                  type="button"
                  onClick={() => {
                    onSelectSleepTimer(opt.value);
                    setShowSleepMenu(false);
                  }}
                  className={`w-full px-3.5 py-1.5 text-left hover:bg-[var(--bg-row-hover)] flex items-center justify-between cursor-pointer ${
                    activeSleepOption === opt.value
                      ? 'text-[var(--accent)] font-bold'
                      : ''
                  }`}
                >
                  <span>{opt.label}</span>
                  {activeSleepOption === opt.value && (
                    <Check className="w-3.5 h-3.5" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onToggleQueuePanel}
          aria-label="File d'attente"
          title="Afficher / masquer la file d'attente"
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
            showQueuePanel
              ? 'text-[var(--accent)]'
              : 'text-[var(--text-sub)] hover:text-[var(--text-main)]'
          }`}
        >
          <ListMusic className="w-4.5 h-4.5" />
        </button>

        <button
          type="button"
          onClick={onToggleMute}
          aria-label={isMuted ? 'Activer le son' : 'Couper le son'}
          className="text-[var(--text-sub)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
        >
          {isMuted || displayVolume === 0 ? (
            <VolumeX className="w-4.5 h-4.5" />
          ) : displayVolume < 0.5 ? (
            <Volume1 className="w-4.5 h-4.5" />
          ) : (
            <Volume2 className="w-4.5 h-4.5" />
          )}
        </button>

        <div className="relative w-24 h-4 flex items-center group">
          <div className="w-full h-1 rounded-full bg-[var(--border-strong)] overflow-hidden">
            <div
              className="h-full bg-[var(--text-main)] group-hover:bg-[var(--accent)] transition-colors rounded-full"
              style={{ width: `${Math.round(displayVolume * 100)}%` }}
            />
          </div>
          <input
            type="range"
            aria-label="Volume"
            min={0}
            max={1}
            step={0.01}
            value={displayVolume}
            onChange={(e) => onVolumeChange(Number(e.target.value))}
            className="absolute inset-0 w-full opacity-0 cursor-pointer"
          />
        </div>
      </div>
    </footer>
  );
}
