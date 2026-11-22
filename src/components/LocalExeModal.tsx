import { useRef, useState, type ChangeEvent } from 'react';
import {
  Check,
  Copy,
  Download,
  FileJson,
  FolderOpen,
  HardDrive,
  Monitor,
  RotateCcw,
  Upload,
  X,
} from 'lucide-react';

interface LocalExeModalProps {
  open: boolean;
  localTrackCount: number;
  customTrackCount: number;
  onClose: () => void;
  onImportAudioFiles: (files: FileList) => void;
  onExportBackupJson: () => void;
  onImportBackupJson: (file: File) => void;
  onResetLibrary: () => void;
}

export function LocalExeModal({
  open,
  localTrackCount,
  customTrackCount,
  onClose,
  onImportAudioFiles,
  onExportBackupJson,
  onImportBackupJson,
  onResetLibrary,
}: LocalExeModalProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const backupInputRef = useRef<HTMLInputElement | null>(null);
  const [activeTab, setActiveTab] = useState<'audio' | 'backup' | 'desktop'>(
    'audio'
  );
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  if (!open) return null;

  const copyCommand = (cmd: string) => {
    navigator.clipboard?.writeText(cmd);
    setCopiedCmd(cmd);
    window.setTimeout(() => setCopiedCmd(null), 1800);
  };

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
      aria-labelledby="local-exe-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
    >
      <div className="w-full max-w-xl rounded-xl bg-[#1e1e1e] border border-white/10 shadow-2xl overflow-hidden text-white">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <HardDrive className="w-5 h-5 text-[#1ED760]" />
            <h2
              id="local-exe-modal-title"
              className="font-display font-bold text-lg"
            >
              Fichiers MP3, Sauvegarde Web &amp; Mode Bureau
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="p-1.5 rounded-full text-[#b3b3b3] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10 px-6 gap-2 pt-2 bg-[#181818]">
          <button
            type="button"
            onClick={() => setActiveTab('audio')}
            className={`px-3.5 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'audio'
                ? 'border-[#1ED760] text-white'
                : 'border-transparent text-[#a0a0a0] hover:text-white'
            }`}
          >
            Importer MP3 (Navigateur)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('backup')}
            className={`px-3.5 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'backup'
                ? 'border-[#1ED760] text-white'
                : 'border-transparent text-[#a0a0a0] hover:text-white'
            }`}
          >
            Sauvegarde JSON
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('desktop')}
            className={`px-3.5 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'desktop'
                ? 'border-[#1ED760] text-white'
                : 'border-transparent text-[#a0a0a0] hover:text-white'
            }`}
          >
            Application .EXE
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {activeTab === 'audio' && (
            <div className="p-5 rounded-lg bg-[#141414] border border-white/[0.08] space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-sm text-white flex items-center gap-2">
                    <FolderOpen className="w-4 h-4 text-[#1ED760]" />
                    Lecture directe de vos fichiers audio dans le navigateur
                  </h3>
                  <p className="text-xs text-[#b3b3b3] mt-1 leading-relaxed">
                    Sélectionnez ou glissez-déposez n&apos;importe où sur la page vos fichiers{' '}
                    <strong className="text-white">.mp3, .wav, .ogg, .m4a, .flac</strong>.
                    Aucun fichier n&apos;est envoyé sur un serveur : la lecture se fait localement en mémoire HTML5.
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-[#1ED760]/15 text-[#1ED760] text-xs font-mono-tabular font-semibold shrink-0">
                  {localTrackCount} MP3 actifs
                </span>
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
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#1ED760] hover:bg-[#1fdf64] text-black text-xs font-bold transition-colors cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>Choisir des fichiers audio sur mon appareil</span>
              </button>
            </div>
          )}

          {activeTab === 'backup' && (
            <div className="space-y-4">
              <div className="p-5 rounded-lg bg-[#141414] border border-white/[0.08] space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-sm text-white flex items-center gap-2">
                      <FileJson className="w-4 h-4 text-[#1ED760]" />
                      Exporter / Importer votre bibliothèque Web (.json)
                    </h3>
                    <p className="text-xs text-[#b3b3b3] mt-1 leading-relaxed">
                      Vos playlists, titres likés et liens YouTube sont enregistrés dans le{' '}
                      <code className="text-white">localStorage</code> de votre navigateur. Exportez un fichier JSON léger pour les transférer sur un autre navigateur ou PC.
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-white/10 text-white text-xs font-mono-tabular font-semibold shrink-0">
                    {customTrackCount} ajouts perso
                  </span>
                </div>

                <input
                  ref={backupInputRef}
                  type="file"
                  accept="application/json,.json"
                  onChange={handleBackupFileChange}
                  className="hidden"
                />

                <div className="flex flex-wrap items-center gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={onExportBackupJson}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#1ED760] hover:bg-[#1fdf64] text-black text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Télécharger ma sauvegarde (.json)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => backupInputRef.current?.click()}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Restaurer un fichier .json</span>
                  </button>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-rose-950/20 border border-rose-500/20 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-white">
                    Réinitialiser aux valeurs d&apos;origine
                  </p>
                  <p className="text-[11px] text-[#b3b3b3]">
                    Restaure les 130 titres et 6 playlists de démonstration.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onResetLibrary}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-semibold transition-colors shrink-0 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Réinitialiser</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'desktop' && (
            <div className="p-5 rounded-lg bg-[#141414] border border-white/[0.08] space-y-3">
              <h3 className="font-semibold text-sm text-white flex items-center gap-2">
                <Monitor className="w-4 h-4 text-[#1ED760]" />
                Générer l&apos;exécutable Windows autonome (.exe)
              </h3>
              <p className="text-xs text-[#b3b3b3] leading-relaxed">
                Le projet inclut une configuration <strong className="text-white">Electron</strong> optionnelle pour scanner automatiquement un dossier{' '}
                <code className="text-white">/music</code> sur votre disque dur :
              </p>

              <div className="space-y-2 pt-1">
                {[
                  {
                    label: '1. Installer les dépendances',
                    cmd: 'npm install',
                  },
                  {
                    label: '2. Lancer la version Web locale',
                    cmd: 'npm start',
                  },
                  {
                    label: '3. Compiler SpotLocal Portable (.exe)',
                    cmd: 'npm run build:exe',
                  },
                ].map((step) => (
                  <div
                    key={step.cmd}
                    className="flex items-center justify-between gap-2 px-3 py-2 rounded-md bg-black/60 border border-white/10"
                  >
                    <div className="min-w-0">
                      <p className="text-[11px] text-[#a0a0a0]">{step.label}</p>
                      <code className="text-xs font-mono-tabular text-[#1ED760]">
                        {step.cmd}
                      </code>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyCommand(step.cmd)}
                      className="p-1.5 rounded hover:bg-white/10 text-[#b3b3b3] hover:text-white transition-colors cursor-pointer"
                      aria-label={`Copier ${step.cmd}`}
                    >
                      {copiedCmd === step.cmd ? (
                        <Check className="w-4 h-4 text-[#1ED760]" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
