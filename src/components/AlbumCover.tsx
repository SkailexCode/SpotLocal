import { useState } from 'react';
import { Disc3 } from 'lucide-react';

interface AlbumCoverProps {
  src?: string;
  alt: string;
  sizeClass?: string;
  roundedClass?: string;
}

const FALLBACK_GRADIENTS = [
  'from-emerald-900 via-zinc-900 to-zinc-950',
  'from-indigo-900 via-zinc-900 to-zinc-950',
  'from-rose-900 via-zinc-900 to-zinc-950',
  'from-amber-900 via-zinc-900 to-zinc-950',
  'from-cyan-900 via-zinc-900 to-zinc-950',
];

function pickGradient(label: string): string {
  let hash = 0;
  for (let i = 0; i < label.length; i++) {
    hash = (hash * 31 + label.charCodeAt(i)) | 0;
  }
  return FALLBACK_GRADIENTS[Math.abs(hash) % FALLBACK_GRADIENTS.length];
}

export function AlbumCover({
  src,
  alt,
  sizeClass = 'w-10 h-10',
  roundedClass = 'rounded-[4px]',
}: AlbumCoverProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`${sizeClass} ${roundedClass} bg-gradient-to-br ${pickGradient(alt)} flex items-center justify-center shrink-0 border border-white/10`}
        aria-label={alt}
      >
        <Disc3 className="w-1/2 h-1/2 text-white/60" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      loading="lazy"
      onError={() => setFailed(true)}
      className={`${sizeClass} ${roundedClass} object-cover shrink-0 bg-[#282828]`}
    />
  );
}
