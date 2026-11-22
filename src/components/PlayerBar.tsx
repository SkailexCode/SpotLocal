import { useState } from 'react';
import {
  Check,
  HardDrive,
  Link2,
  ListMusic,
  Loader2,
  Moon,
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
  const [sleepMenuOpen, setSleepMenuOpen] = useState(false);

  const effectiveDuration =
    durationSec > 0 ? durationSec : currentTrack?.durationSec || 0;
  const progressPercent =
    effectiveDuration > 0
      ? Math.min(100, (currentTimeSec / effectiveDuration) * 100)
      : 0;
  const effectiveVolume = isMuted ? 0 : volume;

  const VolumeIcon =
    effectiveVolume === 0
      ? VolumeX
      : effectiveVolume < 0.5
      ? Volume1
      : Volume2;

  return (
    <footer className="h-[88px] px-3 sm:px-4 bg-black border-t border-white/[0.08] grid grid-cols-[minmax(0,1.2fr)_minmax(0,1.6fr)_auto] sm:grid-cols-3 items-center gap-2 sm:gap-4 shrink-0 select-none z-20">
      {/* Left: Now Playing Info */}
      <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
        {currentTrack ? (
          <>
            <AlbumCover
              src={currentTrack.coverUrl}
              alt={currentTrack.album}
              sizeClass="w-12 h-12 sm:w-14 sm:h-14"
              roundedClass="rounded-[4px] shadow-md"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <p
                  data-testid="now-playing-title"
                  className="text-xs sm:text-sm font-medium text-white truncate"
                >
                  {currentTrack.title}
                </p>
              </div>
              <div className="flex items-center gap-2 min-w-0 mt-0.5">
                {onSelectArtist ? (
                  <button
                    type="button"
                    onClick={() => onSelectArtist(currentTrack.artist)}
                    className="text-[11px] sm:text-xs text-[#b3b3b3] hover:text-white hover:underline truncate text-left cursor-pointer"
                  >
                    {currentTrack.artist}
                  </button>
                ) : (
                  <p className="text-[11px] sm:text-xs text-[#b3b3b3] truncate">
                    {currentTrack.artist}
                  </p>
                )}

                {(activeAudioSource === 'local-idb' ||
                  activeAudioSource === 'local-folder') && (
                  <span
                    title="Lecture intégrale depuis votre fichier MP3"
                    className="hidden md:inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#1ED760]/15 text-[#1ED760] text-[10px] font-bold shrink-0"
                  >
                    <HardDrive className="w-2.5 h-2.5" />
                    MP3
                  </span>
                )}
                {activeAudioSource === 'youtube' && (
                  <button
                    type="button"
                    onClick={onToggleVideoMode}
                    title="Cliquer pour afficher/masquer le clip YouTube"
                    className="hidden md:inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-500/15 hover:bg-red-500/25 text-red-400 text-[10px] font-bold shrink-0 cursor-pointer"
                  >
                    <Youtube className="w-2.5 h-2.5 fill-current" />
                    YT
                  </button>
                )}
                {(activeAudioSource === 'deezer' ||
                  activeAudioSource === 'itunes' ||
                  activeAudioSource === 'stream') && (
                  <button
                    type="button"
                    onClick={() => onAttachYouTubeLink(currentTrack)}
                    title="Extrait 30s — Cliquez pour associer un lien YouTube intégral"
                    className={`hidden md:inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold shrink-0 cursor-pointer ${
                      activeAudioSource === 'deezer'
                        ? 'bg-purple-500/15 hover:bg-purple-500/25 text-purple-300'
                        : activeAudioSource === 'itunes'
                          ? 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-300'
                          : 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300'
                    }`}
                  >
                    <Link2 className="w-2.5 h-2.5" />
                    {activeAudioSource === 'deezer'
                      ? 'Deezer · Lier YT'
                      : activeAudioSource === 'itunes'
                        ? 'Apple · Lier YT'
                        : '30s · Lier YT'}
                  </button>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => onToggleLike(currentTrack.id)}
              aria-label={
                currentTrack.liked
                  ? 'Retirer des titres likés'
                  : 'Ajouter aux titres likés'
              }
              className={`ml-0.5 shrink-0 transition-colors cursor-pointer ${
                currentTrack.liked
                  ? 'text-[#1ED760]'
                  : 'text-[#b3b3b3] hover:text-white'
              }`}
            >
              {currentTrack.liked ? (
                <Check className="w-4 h-4 stroke-[2.75] bg-[#1ED760] text-black rounded-full p-0.5" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
            </button>
          </>
        ) : (
          <p className="text-xs text-[#b3b3b3]">Sélectionnez un titre</p>
        )}
      </div>

      {/* Center: Transport + Progress */}
      <div className="flex flex-col items-center justify-center max-w-[620px] w-full mx-auto gap-1.5">
        <div className="flex items-center gap-3 sm:gap-5">
          <button
            type="button"
            onClick={onToggleShuffle}
            aria-label="Lecture aléatoire"
            title="Lecture aléatoire (S)"
            className={`hidden sm:inline-flex relative transition-colors cursor-pointer ${
              isShuffle ? 'text-[#1ED760]' : 'text-[#b3b3b3] hover:text-white'
            }`}
          >
            <Shuffle className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onPrev}
            disabled={!currentTrack}
            aria-label="Titre précédent"
            className="text-[#b3b3b3] hover:text-white disabled:opacity-40 transition-colors cursor-pointer"
          >
            <SkipBack className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
          </button>

          <button
            type="button"
            onClick={onTogglePlay}
            disabled={!currentTrack}
            aria-label={isPlaying ? 'Pause' : 'Lecture'}
            data-testid="player-play-toggle"
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white hover:scale-105 active:scale-95 disabled:opacity-40 text-black flex items-center justify-center transition-transform cursor-pointer"
          >
            {isLoadingAudio ? (
              <Loader2 className="w-4 h-4 animate-spin text-black" />
            ) : isPlaying ? (
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
            className="text-[#b3b3b3] hover:text-white disabled:opacity-40 transition-colors cursor-pointer"
          >
            <SkipForward className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
          </button>

          <button
            type="button"
            onClick={onCycleRepeat}
            aria-label="Mode répétition"
            title="Répétition (R)"
            className={`hidden sm:inline-flex transition-colors cursor-pointer ${
              repeatMode !== 'off'
                ? 'text-[#1ED760]'
                : 'text-[#b3b3b3] hover:text-white'
            }`}
          >
            {repeatMode === 'one' ? (
              <Repeat1 className="w-4 h-4" />
            ) : (
              <Repeat className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Scrubber */}
        <div className="flex items-center gap-2 w-full">
          <span className="font-mono-tabular text-[11px] text-[#a7a7a7] w-8 sm:w-9 text-right">
            {formatTime(currentTimeSec)}
          </span>

          <div className="group relative flex-1 h-3 flex items-center">
            <div className="w-full h-1 rounded-full bg-white/25 overflow-hidden">
              <div
                className="h-full bg-white group-hover:bg-[#1ED760] transition-colors"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <input
              type="range"
              min={0}
              max={effectiveDuration || 1}
              step={0.25}
              value={Math.min(currentTimeSec, effectiveDuration || 1)}
              disabled={!currentTrack || effectiveDuration === 0}
              aria-label="Position de lecture"
              onChange={(e) => onSeek(Number(e.target.value))}
              className="absolute inset-0 w-full opacity-0 cursor-pointer disabled:cursor-default"
            />
          </div>

          <span className="font-mono-tabular text-[11px] text-[#a7a7a7] w-8 sm:w-9">
            {formatTime(effectiveDuration)}
          </span>
        </div>
      </div>

      {/* Right: Sleep Timer, Video Mode, Queue & Volume */}
      <div className="flex items-center justify-end gap-2 sm:gap-2.5">
        {/* Sleep Timer Popover */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setSleepMenuOpen((prev) => !prev)}
            aria-label="Minuterie de mise en veille"
            title="Minuterie de mise en veille"
            className={`inline-flex items-center gap-1 p-1.5 rounded-md transition-colors cursor-pointer ${
              activeSleepOption !== 0
                ? 'text-[#1ED760] bg-[#1ED760]/10'
                : 'text-[#b3b3b3] hover:text-white'
            }`}
          >
            <Moon className="w-4 h-4" />
            {sleepTimerRemainingMin !== null && (
              <span className="hidden xl:inline text-[11px] font-mono-tabular font-semibold">
                {sleepTimerRemainingMin}m
              </span>
            )}
          </button>

          {sleepMenuOpen && (
            <div
              onMouseLeave={() => setSleepMenuOpen(false)}
              className="absolute right-0 bottom-10 z-40 w-48 rounded-lg bg-[#282828] border border-white/10 shadow-2xl py-1.5 text-xs text-white"
            >
              <p className="px-3 py-1 text-[11px] font-semibold text-[#a0a0a0]">
                Mise en veille
              </p>
              {SLEEP_OPTIONS.map((opt) => (
                <button
                  key={String(opt.value)}
                  type="button"
                  onClick={() => {
                    onSelectSleepTimer(opt.value);
                    setSleepMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-white/10 text-left cursor-pointer"
                >
                  <span>{opt.label}</span>
                  {activeSleepOption === opt.value && (
                    <Check className="w-3.5 h-3.5 text-[#1ED760]" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Toggle Video Clip (when playing YouTube) */}
        {activeAudioSource === 'youtube' && (
          <button
            type="button"
            onClick={onToggleVideoMode}
            aria-label="Afficher ou masquer le clip vidéo"
            title="Afficher / agrandir le clip vidéo (V)"
            className={`p-1.5 rounded-md transition-colors cursor-pointer ${
              videoDisplayMode !== 'hidden'
                ? 'text-[#1ED760]'
                : 'text-[#b3b3b3] hover:text-white'
            }`}
          >
            <Tv className="w-4 h-4" />
          </button>
        )}

        {/* Queue Toggle (works on all viewports now!) */}
        <button
          type="button"
          onClick={onToggleQueuePanel}
          aria-label="Afficher ou masquer la file d'attente"
          title="File d'attente"
          className={`p-1.5 rounded-md transition-colors cursor-pointer ${
            showQueuePanel
              ? 'text-[#1ED760]'
              : 'text-[#b3b3b3] hover:text-white'
          }`}
        >
          <ListMusic className="w-4 h-4" />
        </button>

        {/* Volume (Desktop & Tablet) */}
        <div className="hidden sm:flex items-center gap-1.5">
          <button
            type="button"
            onClick={onToggleMute}
            aria-label={isMuted ? 'Réactiver le son' : 'Couper le son'}
            title="Muet (M)"
            className="p-1 text-[#b3b3b3] hover:text-white transition-colors cursor-pointer"
          >
            <VolumeIcon className="w-4 h-4" />
          </button>

          <div className="group relative w-20 md:w-24 h-3 flex items-center">
            <div className="w-full h-1 rounded-full bg-white/25 overflow-hidden">
              <div
                className="h-full bg-white group-hover:bg-[#1ED760] transition-colors"
                style={{ width: `${effectiveVolume * 100}%` }}
              />
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={effectiveVolume}
              aria-label="Volume"
              onChange={(e) => onVolumeChange(Number(e.target.value))}
              className="absolute inset-0 w-full opacity-0 cursor-pointer"
            />
          </div>
        </div>
      </div>
    </footer>
  );
}
