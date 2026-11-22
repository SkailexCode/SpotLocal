import { useRef, useState, type ChangeEvent } from 'react';
import {
  Download,
  FileJson,
  FolderOpen,
  RotateCcw,
  Upload,
  X,
} from 'lucide-react';

interface LocalExeModalProps {
  open: boolean;
  onClose: () => void;
  onImportAudioFiles: (files: FileList) => void;
  onExportBackupJson: () => void;
  onImportBackupJson: (file: File) => void;
  onResetLibrary: () => void;
}

export function LocalExeModal({
  open,
  onClose,
  onImportAudioFiles,
  onExportBackupJson,
  onImportBackupJson,
  onResetLibrary,
}: LocalExeModalProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const backupInputRef = useRef<HTMLInputElement | null>(null);
  const [activeTab, setActiveTab] = useState<'audio' | 'backup'>('audio');

  if (!open) return null;

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onImportAudioFiles(e.target.files);
      e.target.value = '';
    }
  };

  const handleBackupFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportBackupJson(file);
      e.target.value = '';
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="local-audio-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-2xl bg-[var(--bg-panel-solid)] border border-[var(--border-strong)] shadow-2xl overflow-hidden text-[var(--text-main)] anim-modal">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-subtle)]">
          <h2
            id="local-audio-modal-title"
            className="font-display font-bold text-base"
          >
            Fichiers locaux &amp; Sauvegarde
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="p-1.5 rounded-full text-[var(--text-sub)] hover:text-[var(--text-main)] hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        <div className="flex border-b border-[var(--border-subtle)] px-5 gap-3 pt-1.5 bg-[var(--bg-elevated)]">
          <button
            type="button"
            onClick={() => setActiveTab('audio')}
            className={`px-2 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'audio'
                ? 'border-[var(--accent)] text-[var(--text-main)]'
                : 'border-transparent text-[var(--text-sub)] hover:text-[var(--text-main)]'
            }`}
          >
            Fichiers audio
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('backup')}
            className={`px-2 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'backup'
                ? 'border-[var(--accent)] text-[var(--text-main)]'
                : 'border-transparent text-[var(--text-sub)] hover:text-[var(--text-main)]'
            }`}
          >
            Sauvegarde
          </button>
        </div>

        <div className="p-5 space-y-4">
          {activeTab === 'audio' ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <FolderOpen className="w-5 h-5 text-[var(--accent)] shrink-0 mt-0.5" />
                <p className="text-xs text-[var(--text-sub)] leading-relaxed">
                  Importez vos fichiers MP3, WAV, FLAC ou M4A. Ils restent
                  stockés uniquement dans votre navigateur.
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full inline-flex items-center justify-center gap-2 h-10 px-4 rounded-full btn-accent text-xs font-semibold cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>Choisir des fichiers audio</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-2.5">
                  <FileJson className="w-4.5 h-4.5 text-[var(--accent)] shrink-0 mt-0.5" />
                  <p className="text-xs text-[var(--text-sub)] leading-relaxed">
                    Exportez ou restaurez vos playlists et favoris au format
                    JSON.
                  </p>
                </div>

                <input
                  ref={backupInputRef}
                  type="file"
                  accept="application/json,.json"
                  onChange={handleBackupFileChange}
                  className="hidden"
                />

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={onExportBackupJson}
                    className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full btn-accent text-xs font-semibold cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Exporter (.json)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => backupInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated-hover)] border border-[var(--border-subtle)] text-[var(--text-main)] text-xs font-medium cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Restaurer</span>
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between gap-3">
                <span className="text-xs text-[var(--text-sub)]">
                  Vider la bibliothèque locale
                </span>
                <button
                  type="button"
                  onClick={onResetLibrary}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-500/12 hover:bg-rose-500/20 text-rose-500 text-xs font-semibold cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Réinitialiser</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
