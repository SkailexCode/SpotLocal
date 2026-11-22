import {
  CheckCircle2,
  Code2,
  FileAudio,
  Scale,
  ShieldCheck,
  X,
} from 'lucide-react';

interface LegalOpenSourceModalProps {
  open: boolean;
  onClose: () => void;
}

export function LegalOpenSourceModal({
  open,
  onClose,
}: LegalOpenSourceModalProps) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="legal-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
    >
      <div className="w-full max-w-2xl rounded-xl bg-[#1e1e1e] border border-white/10 shadow-2xl overflow-hidden text-white">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <Scale className="w-5 h-5 text-[#1ED760]" />
            <h2 id="legal-modal-title" className="font-display font-bold text-lg">
              Mentions Légales, Conformité YouTube &amp; Licence MIT
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

        <div className="p-6 space-y-4 max-h-[78vh] overflow-y-auto text-xs leading-relaxed text-[#cfcfcf]">
          <div className="p-4 rounded-lg bg-[#141414] border border-white/[0.08] space-y-2">
            <h3 className="font-semibold text-sm text-white flex items-center gap-2">
              <Code2 className="w-4 h-4 text-[#1ED760]" />
              1. Projet Open Source Indépendant (Licence MIT) &amp; Marques
            </h3>
            <p>
              Le code source de <strong className="text-white">SpotLocal</strong> est distribué gratuitement à but éducatif et non commercial sous{' '}
              <strong className="text-white">Licence MIT</strong> (voir le fichier <code className="text-white">LICENSE</code>).
              SpotLocal est un lecteur web indépendant, <strong className="text-white">non affilié, ni sponsorisé, ni approuvé</strong> par Spotify AB ou Google LLC / YouTube. Toutes les marques citées appartiennent à leurs propriétaires respectifs.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-[#141414] border border-white/[0.08] space-y-2">
            <h3 className="font-semibold text-sm text-white flex items-center gap-2">
              <FileAudio className="w-4 h-4 text-[#1ED760]" />
              2. Lecture Intégrale 100 % Légale (YouTube IFrame &amp; MP3 Local)
            </h3>
            <ul className="space-y-1.5 pt-1">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#1ED760] shrink-0 mt-0.5" />
                <span>
                  <strong className="text-white">Aucun fichier musical hébergé :</strong> SpotLocal n&apos;héberge, ne stocke et ne redistribue aucun fichier audio protégé par le droit d&apos;auteur sur ses serveurs.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#1ED760] shrink-0 mt-0.5" />
                <span>
                  <strong className="text-white">Lecteur officiel YouTube IFrame Player API :</strong> tous les clips et titres du catalogue sont lus en intégralité via le lecteur intégré officiel de YouTube dans une fenêtre vidéo visible (&ge; 200 px), sans téléchargement, sans extraction de flux et dans le respect des droits d&apos;intégration des ayants droit.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#1ED760] shrink-0 mt-0.5" />
                <span>
                  <strong className="text-white">Fichiers audio personnels (Copie privée locale) :</strong> les fichiers <code className="text-white">.mp3, .flac, .wav, .m4a</code> importés par l&apos;utilisateur sont lus localement dans la mémoire de son propre navigateur (<code className="text-white">IndexedDB</code>) et ne quittent jamais son appareil.
                </span>
              </li>
            </ul>
          </div>

          <div className="p-4 rounded-lg bg-[#141414] border border-white/[0.08] space-y-2">
            <h3 className="font-semibold text-sm text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#1ED760]" />
              3. Vie Privée (RGPD) &amp; Hébergement
            </h3>
            <p>
              Aucune création de compte, aucune collecte de données personnelles, aucun traceur publicitaire : vos playlists, favoris et préférences restent stockés localement dans votre navigateur (<code className="text-white">localStorage</code> / <code className="text-white">IndexedDB</code>). Démo statique hébergée via <strong className="text-white">GitHub Pages</strong>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
