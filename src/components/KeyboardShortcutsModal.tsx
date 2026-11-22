import { Keyboard, X } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  onClose: () => void;
}

const SHORTCUTS = [
  { keys: ['Espace'], label: 'Lecture / Pause' },
  { keys: ['←', '→'], label: 'Reculer / Avancer de 5 secondes' },
  { keys: ['N'], label: 'Titre suivant' },
  { keys: ['P'], label: 'Titre précédent' },
  { keys: ['M'], label: 'Couper / Réactiver le son (Mute)' },
  { keys: ['L'], label: 'Aimer / Retirer le titre en cours' },
  { keys: ['Ctrl', 'K'], label: 'Rechercher ou coller un lien YouTube' },
  { keys: ['?'], label: 'Afficher ce guide des raccourcis' },
];

export function KeyboardShortcutsModal({ onClose }: KeyboardShortcutsModalProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-2xl bg-[#181818] border border-white/10 shadow-2xl overflow-hidden text-white">
        <div className="flex items-center justify-between px-6 py-4 bg-[#121212] border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <Keyboard className="w-5 h-5 text-[#1ED760]" />
            <h2 id="shortcuts-modal-title" className="font-display font-bold text-base">
              Raccourcis clavier Web
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#b3b3b3] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-2.5">
          {SHORTCUTS.map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between gap-4 py-1.5 px-2.5 rounded-lg bg-[#121212] border border-white/[0.05]"
            >
              <span className="text-xs text-[#d4d4d4]">{item.label}</span>
              <div className="flex items-center gap-1 shrink-0">
                {item.keys.map((k) => (
                  <kbd
                    key={k}
                    className="px-2 py-0.5 rounded bg-[#262626] border border-white/15 font-mono-tabular text-[11px] font-semibold text-white"
                  >
                    {k}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="px-6 py-3.5 bg-[#121212] border-t border-white/[0.08] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-1.5 rounded-full bg-[#1ED760] hover:bg-[#1fdf64] text-black text-xs font-bold transition-colors cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
