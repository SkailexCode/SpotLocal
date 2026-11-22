import { useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  Download,
  FileArchive,
  FileAudio,
  FolderOpen,
  Loader2,
  MonitorDown,
  RefreshCw,
  ShieldCheck,
  Upload,
  X,
} from 'lucide-react';

interface LocalExeModalProps {
  initialTab: 'import' | 'exe';
  musicDir: string | null;
  localTrackCount: number;
  totalTrackCount: number;
  importSummary: string | null;
  onImportFiles: (files: FileList | File[]) => Promise<void>;
  onScanServerFolder: () => Promise<void>;
  onClose: () => void;
}

interface ExeStatus {
  available: boolean;
  filename: string;
  sizeBytes: number;
  zipAvailable?: boolean;
  zipSizeBytes?: number;
  updatedAt: string | null;
}

const CHUNK_SIZE = 8 * 1024 * 1024; // 8 Mo par requête (contourne la limite 32 Mo des proxys cloud)

export function LocalExeModal({
  initialTab,
  musicDir,
  localTrackCount,
  totalTrackCount,
  importSummary,
  onImportFiles,
  onScanServerFolder,
  onClose,
}: LocalExeModalProps) {
  const [tab, setTab] = useState<'import' | 'exe'>(initialTab);
  const [scanning, setScanning] = useState(false);
  const [exeStatus, setExeStatus] = useState<ExeStatus | null>(null);
  const [loadingExe, setLoadingExe] = useState(false);

  const [downloadProgress, setDownloadProgress] = useState<{
    active: boolean;
    loadedBytes: number;
    totalBytes: number;
    targetName: string;
  } | null>(null);
  const [readyDownload, setReadyDownload] = useState<{
    url: string;
    filename: string;
    sizeBytes: number;
  } | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const readyUrlRef = useRef<string | null>(null);

  const isDesktopApp = Boolean(window.spotlocalDesktop?.isDesktop);

  useEffect(() => {
    let cancelled = false;
    setLoadingExe(true);
    fetch('/api/download/exe-status')
      .then((res) => (res.ok ? (res.json() as Promise<ExeStatus>) : null))
      .then((data) => {
        if (!cancelled && data) setExeStatus(data);
      })
      .catch(() => {
        // Ignore offline fetch failure
      })
      .finally(() => {
        if (!cancelled) setLoadingExe(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (readyUrlRef.current) {
        URL.revokeObjectURL(readyUrlRef.current);
        readyUrlRef.current = null;
      }
    };
  }, []);

  const handleScan = async () => {
    setScanning(true);
    try {
      await onScanServerFolder();
    } finally {
      setScanning(false);
    }
  };

  const triggerBlobSave = (blobUrl: string, filename: string) => {
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const startChunkedDownload = async (
    endpoint: string,
    totalBytes: number,
    filename: string,
    mimeType: string
  ) => {
    if (totalBytes <= 0) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    if (readyUrlRef.current) {
      URL.revokeObjectURL(readyUrlRef.current);
      readyUrlRef.current = null;
    }
    setReadyDownload(null);
    setDownloadError(null);
    setDownloadProgress({
      active: true,
      loadedBytes: 0,
      totalBytes,
      targetName: filename,
    });

    try {
      const chunks: BlobPart[] = [];
      let offset = 0;

      while (offset < totalBytes) {
        const end = Math.min(offset + CHUNK_SIZE - 1, totalBytes - 1);
        const res = await fetch(`${endpoint}?start=${offset}&end=${end}`, {
          signal: controller.signal,
          cache: 'no-store',
        });
        if (!res.ok) {
          throw new Error(`Erreur serveur (${res.status})`);
        }
        const buf = await res.arrayBuffer();
        chunks.push(buf);
        offset += buf.byteLength;
        setDownloadProgress({
          active: true,
          loadedBytes: offset,
          totalBytes,
          targetName: filename,
        });
        if (buf.byteLength === 0) break;
      }

      const fullBlob = new Blob(chunks, { type: mimeType });
      const blobUrl = URL.createObjectURL(fullBlob);
      readyUrlRef.current = blobUrl;

      setDownloadProgress(null);
      setReadyDownload({
        url: blobUrl,
        filename,
        sizeBytes: fullBlob.size,
      });

      triggerBlobSave(blobUrl, filename);
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return;
      setDownloadProgress(null);
      setDownloadError(
        err instanceof Error
          ? err.message
          : 'Échec du téléchargement par segments.'
      );
    }
  };

  const exeSizeMb = exeStatus?.sizeBytes
    ? (exeStatus.sizeBytes / (1024 * 1024)).toFixed(1)
    : null;
  const zipSizeMb = exeStatus?.zipSizeBytes
    ? (exeStatus.zipSizeBytes / (1024 * 1024)).toFixed(1)
    : null;
  const progressPct = downloadProgress
    ? Math.min(
        100,
        Math.round((downloadProgress.loadedBytes / downloadProgress.totalBytes) * 100)
      )
    : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
      role="dialog"
      aria-modal="true"
      aria-labelledby="local-exe-modal-title"
    >
      <div className="w-full max-w-xl rounded-xl bg-[#181818] border border-white/10 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08]">
          <h2
            id="local-exe-modal-title"
            className="font-display font-bold text-lg text-white"
          >
            Musiques locales &amp; Application .exe
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer la fenêtre"
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#b3b3b3] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-4 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setTab('import')}
            className={`px-4 py-2 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
              tab === 'import'
                ? 'bg-white text-black'
                : 'bg-[#242424] text-[#d4d4d4] hover:bg-[#2e2e2e]'
            }`}
          >
            Importer MP3 / Dossier
          </button>
          <button
            type="button"
            onClick={() => setTab('exe')}
            className={`px-4 py-2 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
              tab === 'exe'
                ? 'bg-white text-black'
                : 'bg-[#242424] text-[#d4d4d4] hover:bg-[#2e2e2e]'
            }`}
          >
            Télécharger le .exe
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {tab === 'import' ? (
            <>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="audio/*,.mp3,.flac,.wav,.m4a,.ogg"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.length) {
                    void onImportFiles(e.target.files);
                  }
                  e.target.value = '';
                }}
              />
              <input
                ref={folderInputRef}
                type="file"
                multiple
                {...({ webkitdirectory: '', directory: '' } as Record<string, string>)}
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.length) {
                    void onImportFiles(e.target.files);
                  }
                  e.target.value = '';
                }}
              />

              <div className="p-5 rounded-lg border border-dashed border-white/20 bg-[#121212] text-center space-y-3">
                <FileAudio className="w-10 h-10 text-[#1ED760] mx-auto" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-white">
                    Glissez-déposez vos fichiers audio ou choisissez un dossier
                  </p>
                  <p className="text-xs text-[#b3b3b3]">
                    Formats supportés : MP3, FLAC, WAV, M4A, OGG. Les titres déjà présents dans votre playlist sont automatiquement reliés en version complète.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#1ED760] hover:bg-[#1fdf64] text-black text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Choisir des fichiers</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => folderInputRef.current?.click()}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#242424] hover:bg-[#303030] text-white text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <FolderOpen className="w-4 h-4" />
                    <span>Choisir un dossier</span>
                  </button>
                </div>
              </div>

              {importSummary && (
                <div className="flex items-center gap-2.5 p-3 rounded-md bg-[#1ED760]/10 border border-[#1ED760]/30 text-xs text-[#1ED760]">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{importSummary}</span>
                </div>
              )}

              <div className="flex items-center justify-between gap-4 p-4 rounded-lg bg-[#121212] border border-white/[0.06]">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white">
                    Dossier local scanné par l&apos;application
                  </p>
                  <p className="text-xs text-[#b3b3b3] truncate mt-0.5 font-mono-tabular">
                    {musicDir || './music'} · {localTrackCount}/{totalTrackCount} titres en fichier local
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {isDesktopApp && window.spotlocalDesktop?.openMusicDir && (
                    <button
                      type="button"
                      onClick={() => void window.spotlocalDesktop?.openMusicDir?.()}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-[#242424] hover:bg-[#303030] text-xs font-semibold text-white transition-colors cursor-pointer"
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                      <span>Ouvrir</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleScan}
                    disabled={scanning}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#242424] hover:bg-[#303030] text-xs font-semibold text-white transition-colors cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${scanning ? 'animate-spin' : ''}`} />
                    <span>Rescanner</span>
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-4 text-sm text-[#d4d4d4]">
              <div className="p-5 rounded-lg bg-[#121212] border border-[#1ED760]/30 space-y-3.5">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-white font-bold">
                    <MonitorDown className="w-4 h-4 text-[#1ED760]" />
                    <span>Application Windows autonome (.exe)</span>
                  </div>
                  <p className="text-xs text-[#b3b3b3] leading-relaxed">
                    {loadingExe
                      ? 'Vérification du fichier exécutable…'
                      : exeStatus?.available
                        ? `SpotLocal-Portable.exe prêt (${exeSizeMb} Mo). Téléchargement sécurisé par segments pour contourner la limite de taille des prévisualisations cloud.`
                        : 'Le fichier .exe est compilé via CREER_EXE.bat ou le script serveur.'}
                  </p>
                </div>

                {downloadProgress?.active && (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-white font-medium flex items-center gap-1.5">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-[#1ED760]" />
                        Préparation de {downloadProgress.targetName}…
                      </span>
                      <span className="text-[#1ED760] font-mono-tabular font-semibold">
                        {progressPct}% ({(downloadProgress.loadedBytes / (1024 * 1024)).toFixed(1)} /{' '}
                        {(downloadProgress.totalBytes / (1024 * 1024)).toFixed(1)} Mo)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-[#282828] overflow-hidden">
                      <div
                        className="h-full bg-[#1ED760] transition-all duration-150"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>
                )}

                {readyDownload && (
                  <div className="p-3 rounded-lg bg-[#1ED760]/12 border border-[#1ED760]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs text-[#1ED760] font-medium">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>
                        Fichier prêt en mémoire ({(readyDownload.sizeBytes / (1024 * 1024)).toFixed(1)} Mo) !
                      </span>
                    </div>
                    <a
                      href={readyDownload.url}
                      download={readyDownload.filename}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-[#1ED760] hover:bg-[#1fdf64] text-black text-xs font-bold transition-colors shrink-0"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Enregistrer {readyDownload.filename}</span>
                    </a>
                  </div>
                )}

                {downloadError && (
                  <p className="text-xs text-red-400">{downloadError}</p>
                )}

                <div className="flex flex-wrap items-center gap-2.5 pt-1">
                  {exeStatus?.available && (
                    <button
                      type="button"
                      disabled={Boolean(downloadProgress?.active)}
                      onClick={() =>
                        void startChunkedDownload(
                          '/api/download/exe',
                          exeStatus.sizeBytes,
                          'SpotLocal-Portable.exe',
                          'application/octet-stream'
                        )
                      }
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#1ED760] hover:bg-[#1fdf64] disabled:opacity-50 text-black text-xs font-bold transition-colors cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>Télécharger le .exe ({exeSizeMb} Mo)</span>
                    </button>
                  )}

                  {exeStatus?.zipAvailable && exeStatus.zipSizeBytes && (
                    <button
                      type="button"
                      disabled={Boolean(downloadProgress?.active)}
                      onClick={() =>
                        void startChunkedDownload(
                          '/api/download/exe-zip',
                          exeStatus.zipSizeBytes!,
                          'SpotLocal-Portable-Windows.zip',
                          'application/zip'
                        )
                      }
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#242424] hover:bg-[#303030] disabled:opacity-50 text-white text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <FileArchive className="w-4 h-4 text-[#1ED760]" />
                      <span>Version .zip ({zipSizeMb} Mo)</span>
                    </button>
                  )}

                  {isDesktopApp && window.spotlocalDesktop?.openMusicDir && (
                    <button
                      type="button"
                      onClick={() => void window.spotlocalDesktop?.openMusicDir?.()}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#242424] hover:bg-[#303030] text-white text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <FolderOpen className="w-4 h-4 text-[#1ED760]" />
                      <span>Ouvrir mon dossier Musique</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="p-4 rounded-lg bg-[#121212] border border-white/[0.06] space-y-1.5">
                <p className="text-xs font-semibold text-white">
                  Où mettre vos musiques MP3 dans la version .exe ?
                </p>
                <p className="text-xs text-[#b3b3b3] leading-relaxed">
                  Déposez vos MP3 / FLAC dans{' '}
                  <code className="px-1.5 py-0.5 rounded bg-[#242424] text-white font-mono-tabular">
                    Musique\SpotLocal
                  </code>{' '}
                  ou dans un dossier{' '}
                  <code className="px-1.5 py-0.5 rounded bg-[#242424] text-white font-mono-tabular">
                    music
                  </code>{' '}
                  placé à côté de{' '}
                  <code className="px-1.5 py-0.5 rounded bg-[#242424] text-white font-mono-tabular">
                    SpotLocal-Portable.exe
                  </code>
                  , ou glissez-les directement dans la fenêtre.
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-[#121212] border border-white/[0.06] flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-[#1ED760] shrink-0 mt-0.5" />
                <p className="text-[11px] text-[#9a9a9a] leading-relaxed">
                  <strong className="text-[#d4d4d4]">Conformité légale &amp; Open Source :</strong>{' '}
                  L&apos;application est libre et open-source. Elle intègre le lecteur officiel YouTube (IFrame API) avec redirection directe et attribution aux ayants droit, tout en permettant la lecture de vos fichiers personnels locaux (MP3/FLAC/WAV).
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
