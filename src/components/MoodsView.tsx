import { memo, useMemo } from 'react';
import { ArrowRight, Play, Radio, Sparkles } from 'lucide-react';
import { CATALOG_MOODS, catalogStore } from '../utils/catalogEngine';

interface MoodsViewProps {
  catalogVersion: number;
  onPlayMoodRadio: (moodBit: number, moodName: string) => void;
  onBrowseMood: (moodBit: number) => void;
}

export const MoodsView = memo(function MoodsView({
  catalogVersion,
  onPlayMoodRadio,
  onBrowseMood,
}: MoodsViewProps) {
  const moodCounts = useMemo(() => {
    void catalogVersion;
    return catalogStore.getMoodCounts();
  }, [catalogVersion]);

  return (
    <div className="flex-1 flex flex-col min-h-0 studio-panel rounded-2xl overflow-y-auto relative">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(ellipse_75%_55%_at_30%_0%,rgba(168,85,247,0.18),transparent_65%),radial-gradient(ellipse_60%_50%_at_80%_0%,rgba(30,215,96,0.14),transparent_60%)]" />

      <div className="relative px-5 sm:px-8 py-7 space-y-8">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/15 border border-purple-400/25 text-purple-300 text-xs font-semibold">
            <Radio className="w-3.5 h-3.5" />
            <span>10 Radios Thématiques sans coupure</span>
          </div>
          <h1 className="font-display font-extrabold text-2xl sm:text-4xl text-white">
            Ambiances &amp; Moments
          </h1>
          <p className="text-sm sm:text-[15px] text-[#9ca3b0]">
            Chaque radio pioche intelligemment 60 morceaux intégraux dans le
            catalogue YouTube selon votre humeur du moment — zéro publicité
            audio injectée par SpotLocal et zéro extrait tronqué.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {CATALOG_MOODS.map((mood) => {
            const count = moodCounts[mood.bit] || 0;
            return (
              <div
                key={mood.bit}
                className={`p-6 rounded-3xl bg-gradient-to-br ${mood.gradient} border border-white/[0.09] hover:border-white/22 transition-all flex flex-col justify-between min-h-[190px] shadow-xl`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className="px-2.5 py-0.5 rounded-full bg-black/45 border border-white/10 text-xs font-mono-tabular font-bold"
                      style={{ color: mood.accent }}
                    >
                      {count.toLocaleString('fr-FR')} titres
                    </span>
                    <Sparkles
                      className="w-4 h-4 opacity-75"
                      style={{ color: mood.accent }}
                    />
                  </div>
                  <h2 className="font-display font-bold text-xl text-white pt-1">
                    {mood.name}
                  </h2>
                  <p className="text-sm text-white/75 leading-relaxed">
                    {mood.subtitle}
                  </p>
                </div>

                <div className="flex items-center gap-2.5 pt-5">
                  <button
                    type="button"
                    onClick={() => onPlayMoodRadio(mood.bit, mood.name)}
                    className="inline-flex items-center gap-2 h-10 px-4.5 rounded-full bg-[#1ED760] hover:bg-[#22e668] text-black text-xs font-bold shadow-lg transition-transform hover:scale-[1.02] cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-black" />
                    <span>Lancer la radio</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onBrowseMood(mood.bit)}
                    className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-white/[0.08] hover:bg-white/[0.15] border border-white/10 text-xs font-semibold text-white transition-colors cursor-pointer"
                  >
                    <span>Explorer</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});
