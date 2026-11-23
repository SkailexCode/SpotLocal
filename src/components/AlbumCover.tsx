import { memo, useState } from 'react';
import { Disc3 } from 'lucide-react';

interface AlbumCoverProps {
  src?: string;
  alt: string;
  sizeClass?: string;
  roundedClass?: string;
}

const FALLBACK_GRADIENTS = [
  'from-orange-700 via-amber-800 to-stone-900',
  'from-amber-700 via-orange-900 to-stone-950',
  'from-rose-800 via-orange-900 to-stone-900',
  'from-yellow-700 via-amber-900 to-stone-900',
  'from-orange-600 via-red-900 to-stone-950',
];

function pickGradient(label: string): string {
  let hash = 0;
  for (let i = 0; i < label.length; i++) {
    hash = (hash * 31 + label.charCodeAt(i)) | 0;
  }
  return FALLBACK_GRADIENTS[Math.abs(hash) % FALLBACK_GRADIENTS.length];
}

export function resolvePublicAssetUrl(url?: string): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('/covers/')) {
    const base = import.meta.env.BASE_URL || '/';
    const normalizedBase = base.endsWith('/') ? base : `${base}/`;
    return `${normalizedBase}${url.slice(1)}`;
  }
  return url;
}

export const AlbumCover = memo(function AlbumCover({
  src,
  alt,
  sizeClass = 'w-10 h-10',
  roundedClass = 'rounded-[4px]',
}: AlbumCoverProps) {
  const resolvedSrc = resolvePublicAssetUrl(src);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const failed = Boolean(resolvedSrc && failedSrc === resolvedSrc);

  if (!resolvedSrc || failed) {
    return (
      <div
        className={`${sizeClass} ${roundedClass} bg-gradient-to-br ${pickGradient(alt)} flex items-center justify-center shrink-0 border border-white/10`}
        aria-label={alt}
      >
        <Disc3 className="w-1/2 h-1/2 text-white/75" />
      </div>
    );
  }

  return (
    <img
      src={resolvedSrc}
      alt={alt}
      referrerPolicy="no-referrer"
      loading="lazy"
      decoding="async"
      onError={() => setFailedSrc(resolvedSrc)}
      className={`${sizeClass} ${roundedClass} object-cover shrink-0 bg-[#2a211b]`}
    />
  );
});
