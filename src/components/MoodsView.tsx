import { memo, useMemo } from 'react';
import { ArrowRight, Play } from 'lucide-react';
import { CATALOG_MOODS, catalogStore } from '../utils/catalogEngine';
import { MosaicCover } from './AlbumCover';

interface MoodsViewProps {
  onPlayMoodRadio: (moodBit: number, moodName: string) => void;
  onBrowseMood: (moodBit: number) => void;
}

export const MoodsView = memo(function MoodsView({
  onPlayMoodRadio,
  onBrowseMood,
}: MoodsViewProps) {
  const moodsWithCovers = useMemo(
    () =>
      CATALOG_MOODS.map((mood) => ({
        ...mood,
        covers: catalogStore.getMoodSampleCovers(mood.bit, 4),
      })),
    []
  );

  return (
    <div className="flex-1 flex flex-col min-h-0 studio-panel rounded-xl overflow-y-auto anim-view">
      <div className="px-5 sm:px-7 py-6 space-y-6">
        <h1 className="font-display font-bold text-2xl sm:text-3xl text-[var(--text-main)]">
          Ambiances
        </h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {moodsWithCovers.map((mood) => (
            <div
              key={mood.bit}
              className="p-4 rounded-xl studio-card flex items-center gap-4"
            >
              <button
                type="button"
                onClick={() => onPlayMoodRadio(mood.bit, mood.name)}
                className="group relative shrink-0 cursor-pointer"
                aria-label={`Écouter ${mood.name}`}
              >
                <MosaicCover
                  urls={mood.covers}
                  alt={mood.name}
                  size="md"
                  className="w-24 h-24 rounded-lg shadow-sm"
                />
                <span className="absolute right-1.5 bottom-1.5 w-8.5 h-8.5 rounded-full bg-[var(--accent)] text-white flex items-center justify-center shadow-md opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-150">
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                </span>
              </button>

              <div className="min-w-0 flex-1 flex flex-col justify-between gap-3">
                <div>
                  <h2 className="font-display font-bold text-base sm:text-lg text-[var(--text-main)] truncate">
                    {mood.name}
                  </h2>
                  <p className="text-xs text-[var(--text-sub)] line-clamp-2 mt-0.5">
                    {mood.subtitle}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onPlayMoodRadio(mood.bit, mood.name)}
                    className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full btn-accent text-xs font-semibold cursor-pointer"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>Écouter</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onBrowseMood(mood.bit)}
                    className="inline-flex items-center gap-1 h-8 px-3 rounded-full bg-[var(--bg-panel)] hover:bg-[var(--bg-elevated-hover)] border border-[var(--border-subtle)] text-xs font-medium text-[var(--text-main)] anim-press cursor-pointer"
                  >
                    <span>Voir</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});
