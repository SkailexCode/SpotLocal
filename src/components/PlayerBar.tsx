import { useState } from 'react';
import {
  HardDrive,
  Heart,
  Link2,
  ListMusic,
  Loader2,
  Moon,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Sparkles,
  Tv,
  Volume1,
  Volume2,
  VolumeX,
  Youtube,
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
  onAttachYouTubeLink,
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

  const renderSourceBadge = () => {
    if (!currentTrack) return null;
    if (
      activeAudioSource === 'local-idb' ||
      activeAudioSource === 'local-folder'
    ) {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#1ED760]/18 text-[#1ED760] text-[10px] font-bold shrink-0">
          <HardDrive className="w-2.5 h-2.5" />
          MP3 Local
        </span>
      );
    }
    if (activeAudioSource === 'youtube') {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-rose-500/18 text-rose-300 text-[10px] font-semibold shrink-0">
          <Youtube className="w-2.5 h-2.5 fill-current" />
          Intégral
        </span>
      );
    }
    return null;
  };

  return (
    <footer className="h-[86px] px-3 sm:px-5 bg-[#090b11]/95 backdrop-blur-2xl border-t border-white/[0.08] grid grid-cols-[1fr_auto] md:grid-cols-3 items-center gap-3 shrink-0 select-none z-20 relative shadow-[0_-12px_32px_rgba(0,0,0,0.6)]">
      {/* Left: Active Track Metadata or Clean First-Visit Prompt */}
      <div className="flex items-center gap-3.5 min-w-0">
        {currentTrack ? (
          <>
            <div className="relative shrink-0">
              <AlbumCover
                src={currentTrack.coverUrl}
                alt={currentTrack.title}
                sizeClass="w-13.5 h-13.5"
                roundedClass="rounded-xl shadow-lg"
              />
              {isPlaying && (
                <span className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-md bg-[#0b0d14] border border-white/15 inline-flex items-end gap-0.5 h-4">
                  <span className="w-0.5 h-2.5 bg-[#1ED760] animate-eq-1" />
                  <span className="w-0.5 h-2.5 bg-[#1ED760] animate-eq-2" />
                  <span className="w-0.5 h-2.5 bg-[#1ED760] animate-eq-3" />
                </span>
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-white truncate">
                  {currentTrack.title}
                </p>
                <span className="hidden xl:inline-flex">
                  {renderSourceBadge()}
                </span>
              </div>

              {onSelectArtist ? (
                <button
                  type="button"
                  onClick={() => onSelectArtist(currentTrack.artist)}
                  className="text-xs text-[#9ca3b0] hover:text-white hover:underline truncate block text-left max-w-full mt-0.5 cursor-pointer"
                >
                  {currentTrack.artist}
                </button>
              ) : (
                <p className="text-xs text-[#9ca3b0] truncate mt-0.5">
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
              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                currentTrack.liked
                  ? 'bg-[#1ED760]/18 text-[#1ED760]'
                  : 'text-[#8b93a4] hover:text-white hover:bg-white/[0.08]'
              }`}
            >
              <Heart
                className={`w-4 h-4 ${
                  currentTrack.liked ? 'fill-[#1ED760]' : ''
                }`}
              />
            </button>

            <button
              type="button"
              onClick={() => onAttachYouTubeLink(currentTrack)}
              title="Changer le lien YouTube associé"
              aria-label="Changer le lien YouTube"
              className="hidden lg:flex w-7.5 h-7.5 rounded-lg hover:bg-white/[0.08] items-center justify-center shrink-0 text-[#7d8596] hover:text-white transition-colors cursor-pointer"
            >
              <Link2 className="w-3.5 h-3.5" />
            </button>
          </>
        ) : (
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-[#6e7787] shrink-0">
              <Sparkles className="w-5 h-5 text-[#1ED760]" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-semibold text-white truncate">
                Prêt à jouer
              </p>
              {onPlaySmartMix ? (
                <button
                  type="button"
                  onClick={onPlaySmartMix}
                  className="text-xs text-[#1ED760] hover:underline font-medium truncate cursor-pointer"
                >
                  Lancer un mix aléatoire →
                </button>
              ) : (
                <p className="text-xs text-[#7d8596] truncate">
                  Sélectionnez une musique pour démarrer
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Center: Transport Controls + Luminous Progress Scrubber */}
      <div className="flex flex-col items-end md:items-center justify-center gap-1.5 max-w-xl w-full mx-auto">
        <div className="flex items-center gap-3 sm:gap-5">
          <button
            type="button"
            onClick={onToggleShuffle}
            aria-label="Lecture aléatoire"
            className={`hidden sm:inline-flex transition-colors relative cursor-pointer ${
              isShuffle ? 'text-[#1ED760]' : 'text-[#8b93a4] hover:text-white'
            }`}
          >
            <Shuffle className="w-4 h-4" />
            {isShuffle && (
              <span className="w-1 h-1 rounded-full bg-[#1ED760] absolute -bottom-1.5 left-1/2 -translate-x-1/2" />
            )}
          </button>

          <button
            type="button"
            onClick={onPrev}
            aria-label="Titre précédent"
            className="text-[#b8beca] hover:text-white transition-colors cursor-pointer"
          >
            <SkipBack className="w-5 h-5 fill-current" />
          </button>

          <button
            type="button"
            onClick={onTogglePlay}
            aria-label={isPlaying ? 'Pause' : 'Lecture'}
            className="w-10 h-10 rounded-full bg-white hover:bg-[#1ED760] text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-[0_4px_18px_rgba(255,255,255,0.22)] cursor-pointer"
          >
            {isLoadingAudio ? (
              <Loader2 className="w-4.5 h-4.5 animate-spin text-black" />
            ) : isPlaying ? (
              <Pause className="w-4.5 h-4.5 fill-black" />
            ) : (
              <Play className="w-4.5 h-4.5 fill-black ml-0.5" />
            )}
          </button>

          <button
            type="button"
            onClick={onNext}
            aria-label="Titre suivant"
            className="text-[#b8beca] hover:text-white transition-colors cursor-pointer"
          >
            <SkipForward className="w-5 h-5 fill-current" />
          </button>

          <button
            type="button"
            onClick={onCycleRepeat}
            aria-label="Mode répétition"
            className={`hidden sm:inline-flex transition-colors relative cursor-pointer ${
              repeatMode !== 'off'
                ? 'text-[#1ED760]'
                : 'text-[#8b93a4] hover:text-white'
            }`}
          >
            {repeatMode === 'one' ? (
              <Repeat1 className="w-4 h-4" />
            ) : (
              <Repeat className="w-4 h-4" />
            )}
            {repeatMode !== 'off' && (
              <span className="w-1 h-1 rounded-full bg-[#1ED760] absolute -bottom-1.5 left-1/2 -translate-x-1/2" />
            )}
          </button>
        </div>

        {/* Progress Bar */}
        <div className="hidden sm:flex items-center gap-2.5 w-full">
          <span className="text-[11px] text-[#8b93a4] font-mono-tabular w-9 text-right">
            {formatTime(currentTimeSec)}
          </span>

          <div className="relative flex-1 h-4 flex items-center group">
            <div className="w-full h-1.5 rounded-full bg-white/[0.12] overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#1ED760] to-[#4ade80] rounded-full transition-[width] duration-150"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <input
              type="range"
              min={0}
              max={effectiveDuration || 100}
              step={0.5}
              value={Math.min(currentTimeSec, effectiveDuration || 100)}
              onChange={(e) => onSeek(Number(e.target.value))}
              aria-label="Progression du titre"
              className="absolute inset-0 w-full opacity-0 cursor-pointer"
            />
          </div>

          <span className="text-[11px] text-[#8b93a4] font-mono-tabular w-9">
            {formatTime(effectiveDuration)}
          </span>
        </div>
      </div>

      {/* Right: Video Mode, Sleep Timer, Queue & Volume */}
      <div className="hidden md:flex items-center justify-end gap-2.5">
        {activeAudioSource === 'youtube' && (
          <button
            type="button"
            onClick={onToggleVideoMode}
            aria-label="Basculer le mode Cinéma vidéo"
            title={
              videoDisplayMode === 'theater'
                ? 'Réduire en mini-lecteur (V)'
                : 'Agrandir en mode Cinéma (V)'
            }
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              videoDisplayMode === 'theater'
                ? 'bg-[#1ED760]/18 text-[#1ED760] border border-[#1ED760]/35'
                : 'bg-white/[0.06] text-[#c8cdd6] hover:text-white border border-white/[0.08]'
            }`}
          >
            <Tv className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">
              {videoDisplayMode === 'theater' ? 'Cinéma' : 'Vidéo'}
            </span>
          </button>
        )}

        {/* Sleep Timer */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowSleepMenu((prev) => !prev)}
            aria-label="Minuterie de mise en veille"
            title="Minuterie de mise en veille"
            className={`w-8 h-8 rounded-lg flex items-center justify-center gap-1 text-xs transition-colors cursor-pointer ${
              activeSleepOption !== 0
                ? 'bg-[#1ED760]/15 text-[#1ED760]'
                : 'text-[#8b93a4] hover:text-white hover:bg-white/[0.06]'
            }`}
          >
            <Moon className="w-4 h-4" />
          </button>

          {showSleepMenu && (
            <div className="absolute bottom-11 right-0 w-48 py-1.5 rounded-xl bg-[#161a26] border border-white/12 shadow-2xl text-xs text-white z-40">
              <p className="px-3 py-1.5 text-[10.5px] font-bold uppercase tracking-wider text-[#7d8596] border-b border-white/[0.07]">
                Mise en veille
                {sleepTimerRemainingMin
                  ? ` (${sleepTimerRemainingMin}m)`
                  : ''}
              </p>
              {SLEEP_OPTIONS.map((opt) => (
                <button
                  key={String(opt.value)}
                  type="button"
                  onClick={() => {
                    onSelectSleepTimer(opt.value);
                    setShowSleepMenu(false);
                  }}
                  className={`w-full px-3 py-2 text-left hover:bg-white/10 flex items-center justify-between cursor-pointer ${
                    activeSleepOption === opt.value
                      ? 'text-[#1ED760] font-bold'
                      : 'text-white'
                  }`}
                >
                  <span>{opt.label}</span>
                  {activeSleepOption === opt.value && <span>✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Queue Toggle */}
        <button
          type="button"
          onClick={onToggleQueuePanel}
          aria-label="Afficher la file d'attente"
          title="File d'attente"
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors relative cursor-pointer ${
            showQueuePanel
              ? 'bg-[#1ED760]/15 text-[#1ED760]'
              : 'text-[#8b93a4] hover:text-white hover:bg-white/[0.06]'
          }`}
        >
          <ListMusic className="w-4 h-4" />
        </button>

        {/* Volume */}
        <button
          type="button"
          onClick={onToggleMute}
          aria-label={isMuted ? 'Réactiver le son' : 'Couper le son'}
          className="text-[#8b93a4] hover:text-white transition-colors cursor-pointer"
        >
          {displayVolume === 0 ? (
            <VolumeX className="w-4 h-4" />
          ) : displayVolume < 0.5 ? (
            <Volume1 className="w-4 h-4" />
          ) : (
            <Volume2 className="w-4 h-4" />
          )}
        </button>

        <div className="relative w-24 h-4 flex items-center group">
          <div className="w-full h-1.5 rounded-full bg-white/[0.12] overflow-hidden">
            <div
              className="h-full bg-white group-hover:bg-[#1ED760] rounded-full transition-colors"
              style={{ width: `${displayVolume * 100}%` }}
            />
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={displayVolume}
            onChange={(e) => onVolumeChange(Number(e.target.value))}
            aria-label="Volume"
            className="absolute inset-0 w-full opacity-0 cursor-pointer"
          />
        </div>
      </div>
    </footer>
  );
}
