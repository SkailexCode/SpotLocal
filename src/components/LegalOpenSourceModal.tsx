import {
  ExternalLink,
  FileCode2,
  Lock,
  Scale,
  ShieldCheck,
  X,
  Youtube,
} from 'lucide-react';

interface LegalOpenSourceModalProps {
  onClose: () => void;
}

export function LegalOpenSourceModal({ onClose }: LegalOpenSourceModalProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="legal-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-[#181818] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-[#e5e5e5]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 shrink-0 bg-[#121212]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#1ED760]/15 border border-[#1ED760]/30 flex items-center justify-center text-[#1ED760]">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="legal-modal-title"
                className="font-display font-bold text-lg text-white"
              >
                Conformité Légale & Open Source
              </h2>
              <p className="text-xs text-[#a0a0a0]">
                Transparence, droits d&apos;auteur et règles d&apos;intégration
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer la fenêtre"
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#b3b3b3] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm leading-relaxed">
          {/* Card 1: YouTube Official API & Compliance */}
          <div className="p-4 rounded-xl bg-[#222222] border border-white/[0.08] space-y-2.5">
            <div className="flex items-center gap-2 text-white font-semibold">
              <Youtube className="w-5 h-5 text-red-500 fill-red-500" />
              <h3>Diffusion légale via le lecteur officiel YouTube (IFrame API)</h3>
            </div>
            <p className="text-xs text-[#cfcfcf]">
              Pour les titres écoutés en ligne, SpotLocal utilise exclusivement
              l&apos;API officielle <strong>YouTube IFrame Embed</strong>.
            </p>
            <ul className="text-xs text-[#b3b3b3] space-y-1.5 list-disc pl-5">
              <li>
                <strong>Aucun téléchargement ni extraction :</strong> Les flux vidéo
                et audio ne sont ni convertis, ni aspirés, ni stockés sur un
                serveur tiers.
              </li>
              <li>
                <strong>Respect de la rémunération des artistes :</strong> Chaque
                écoute compte comme une vue officielle sur YouTube et déclenche
                normalement les publicités prévues par les ayants droit.
              </li>
              <li>
                <strong>Redirection transparente :</strong> Chaque titre dispose
                d&apos;un lien direct « Regarder sur YouTube » pour ouvrir le clip
                officiel sur la plateforme d&apos;origine.
              </li>
            </ul>
            <div className="pt-2">
              <a
                href="https://developers.google.com/youtube/terms/api-services-terms-of-service"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-[#1ED760] hover:underline"
              >
                <span>Consulter les Conditions de Service de l&apos;API YouTube</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Card 2: Open Source License MIT */}
          <div className="p-4 rounded-xl bg-[#222222] border border-white/[0.08] space-y-2.5">
            <div className="flex items-center gap-2 text-white font-semibold">
              <FileCode2 className="w-5 h-5 text-[#1ED760]" />
              <h3>Logiciel Libre & Licence MIT</h3>
            </div>
            <p className="text-xs text-[#cfcfcf]">
              SpotLocal est un projet libre et open-source. Le code source de
              l&apos;interface et du serveur est librement accessible et modifiable
              sous licence MIT.
            </p>
            <div className="p-3 rounded-lg bg-black/50 border border-white/5 text-[11px] text-[#9a9a9a]">
              Projet distribué sous licence open-source libre. Le code source est mis à disposition gratuitement pour l&apos;apprentissage, l&apos;audit et l&apos;utilisation personnelle.
            </div>
          </div>

          {/* Card 3: Local Offline Music */}
          <div className="p-4 rounded-xl bg-[#222222] border border-white/[0.08] space-y-2.5">
            <div className="flex items-center gap-2 text-white font-semibold">
              <Lock className="w-5 h-5 text-blue-400" />
              <h3>Usage personnel & Fichiers musicaux locaux</h3>
            </div>
            <p className="text-xs text-[#cfcfcf]">
              L&apos;application intègre un lecteur multimédia local (MP3, FLAC, WAV,
              AAC) permettant à chaque utilisateur de lire ses propres fichiers
              stockés sur son disque dur en toute confidentialité et sans dépendre
              d&apos;Internet.
            </p>
          </div>

          {/* Card 4: Disclaimer & Trademarks */}
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-2 text-xs text-amber-200/90">
            <div className="flex items-center gap-2 font-semibold text-amber-300">
              <ShieldCheck className="w-4 h-4" />
              <span>Avis de non-affiliation et marques déposées</span>
            </div>
            <p>
              SpotLocal est une création indépendante à visée éducative et
              personnelle. Ce projet n&apos;est ni affilié, ni certifié, ni
              sponsorisé par <strong>Spotify AB</strong> ou <strong>Google LLC / YouTube</strong>.
              Toutes les marques et droits d&apos;auteur appartiennent à leurs
              détenteurs respectifs.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-[#121212] border-t border-white/10 flex items-center justify-between shrink-0">
          <p className="text-xs text-[#8f8f8f]">
            SpotLocal Open Source · Conforme IFrame Player
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-full bg-[#1ED760] hover:bg-[#1fdf64] text-black text-xs font-bold transition-colors cursor-pointer"
          >
            J&apos;ai compris
          </button>
        </div>
      </div>
    </div>
  );
}
