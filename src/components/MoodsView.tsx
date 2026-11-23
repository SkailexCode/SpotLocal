import { memo } from 'react';
import { ArrowRight, Play } from 'lucide-react';
import { CATALOG_MOODS } from '../utils/catalogEngine';

interface MoodsViewProps {
  onPlayMoodRadio: (moodBit: number, moodName: string) => void;
  onBrowseMood: (moodBit: number) => void;
}

export const MoodsView = memo(function MoodsView({
  onPlayMoodRadio,
  onBrowseMood,
}: MoodsViewProps) {
  return (
    <div className="flex-1 flex flex-col min-h-0 studio-panel rounded-xl overflow-y-auto anim-view">
      <div className="px-5 sm:px-7 py-6 space-y-6">
        <h1 className="font-display font-bold text-2xl sm:text-3xl text-[var(--text-main)]">
          Ambiances
        </h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5">
          {CATALOG_MOODS.map((mood) => (
            <div
              key={mood.bit}
              className="p-5 rounded-xl studio-card flex flex-col justify-between gap-5"
            >
              <div>
                <h2 className="font-display font-bold text-lg text-[var(--text-main)]">
                  {mood.name}
                </h2>
                <p className="text-xs text-[var(--text-sub)] mt-1">
                  {mood.subtitle}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onPlayMoodRadio(mood.bit, mood.name)}
                  className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full btn-accent text-xs font-semibold cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Écouter</span>
                </button>

                <button
                  type="button"
                  onClick={() => onBrowseMood(mood.bit)}
                  className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-[var(--bg-panel)] hover:bg-[var(--bg-elevated-hover)] border border-[var(--border-subtle)] text-xs font-medium text-[var(--text-main)] anim-press cursor-pointer"
                >
                  <span>Parcourir</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});
