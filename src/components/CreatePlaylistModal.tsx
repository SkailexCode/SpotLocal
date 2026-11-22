import { useState, type FormEvent } from 'react';
import { X } from 'lucide-react';

interface CreatePlaylistModalProps {
  onCreate: (name: string, description: string) => void;
  onClose: () => void;
}

export function CreatePlaylistModal({ onCreate, onClose }: CreatePlaylistModalProps) {
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-playlist-title"
    >
      <div className="w-full max-w-md rounded-xl bg-[#202020] border border-white/10 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08]">
          <h2 id="create-playlist-title" className="font-display font-bold text-base text-white">
            Créer une playlist
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#b3b3b3] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="playlist-name-input" className="block text-xs font-medium text-[#d4d4d4]">
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
              className="w-full h-10 px-3 rounded-md bg-[#121212] text-sm text-white placeholder-[#7a7a7a] border border-white/15 focus:border-white/40 outline-none"
            />
            {error && <p className="text-xs text-rose-400">{error}</p>}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="playlist-desc-input" className="block text-xs font-medium text-[#d4d4d4]">
              Description (optionnelle)
            </label>
            <textarea
              id="playlist-desc-input"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ajoutez une courte description..."
              className="w-full p-3 rounded-md bg-[#121212] text-sm text-white placeholder-[#7a7a7a] border border-white/15 focus:border-white/40 outline-none resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full text-xs font-semibold text-[#d4d4d4] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-full bg-[#1ED760] hover:bg-[#1fdf64] text-black text-xs font-bold transition-colors cursor-pointer"
            >
              Créer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
