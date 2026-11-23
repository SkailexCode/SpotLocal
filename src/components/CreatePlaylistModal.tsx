import { useState, type FormEvent } from 'react';
import { X } from 'lucide-react';

interface CreatePlaylistModalProps {
  onCreate: (name: string, description: string) => void;
  onClose: () => void;
}

export function CreatePlaylistModal({
  onCreate,
  onClose,
}: CreatePlaylistModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Veuillez saisir un nom de playlist.');
      return;
    }
    onCreate(trimmed, description.trim());
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-playlist-title"
    >
      <div className="w-full max-w-md rounded-2xl bg-[var(--bg-panel-solid)] border border-[var(--border-strong)] shadow-2xl overflow-hidden anim-modal">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-subtle)]">
          <h2
            id="create-playlist-title"
            className="font-display font-bold text-base text-[var(--text-main)]"
          >
            Créer une playlist
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-sub)] hover:text-[var(--text-main)] hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="playlist-name-input"
              className="block text-xs font-semibold text-[var(--text-sub)]"
            >
              Nom de la playlist
            </label>
            <input
              id="playlist-name-input"
              type="text"
              autoFocus
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError('');
              }}
              placeholder="Ex : Soirée Chill, Sport..."
              className="w-full h-10 px-3 rounded-lg bg-[var(--bg-input)] focus:bg-[var(--bg-input-focus)] text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] border border-[var(--border-subtle)] focus:border-[var(--accent)] outline-none"
            />
            {error && <p className="text-xs text-rose-500">{error}</p>}
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="playlist-desc-input"
              className="block text-xs font-semibold text-[var(--text-sub)]"
            >
              Description (optionnelle)
            </label>
            <textarea
              id="playlist-desc-input"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ajoutez une courte description..."
              className="w-full p-3 rounded-lg bg-[var(--bg-input)] focus:bg-[var(--bg-input-focus)] text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] border border-[var(--border-subtle)] focus:border-[var(--accent)] outline-none resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full text-xs font-semibold text-[var(--text-sub)] hover:text-[var(--text-main)] hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-full btn-accent text-xs font-bold cursor-pointer"
            >
              Créer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
