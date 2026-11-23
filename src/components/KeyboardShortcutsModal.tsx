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

export function KeyboardShortcutsModal({
  onClose,
}: KeyboardShortcutsModalProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-2xl bg-[var(--bg-panel-solid)] border border-[var(--border-strong)] shadow-2xl overflow-hidden text-[var(--text-main)] anim-modal">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2.5">
            <Keyboard className="w-5 h-5 text-[var(--accent)]" />
            <h2
              id="shortcuts-modal-title"
              className="font-display font-bold text-base"
            >
              Raccourcis clavier Web
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-sub)] hover:text-[var(--text-main)] hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-2">
          {SHORTCUTS.map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between gap-4 py-2 px-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)]"
            >
              <span className="text-xs text-[var(--text-sub)]">
                {item.label}
              </span>
              <div className="flex items-center gap-1 shrink-0">
                {item.keys.map((k) => (
                  <kbd
                    key={k}
                    className="px-2 py-0.5 rounded bg-[var(--bg-panel-solid)] border border-[var(--border-strong)] font-mono-tabular text-[11px] font-bold text-[var(--text-main)]"
                  >
                    {k}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="px-6 py-3.5 border-t border-[var(--border-subtle)] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-1.5 rounded-full btn-accent text-xs font-bold cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
