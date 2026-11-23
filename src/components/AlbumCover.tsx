import React, { useMemo, useState } from 'react';
import { Disc3 } from 'lucide-react';

interface AlbumCoverProps {
  src?: string;
  alt: string;
  className?: string;
  sizeClass?: string;
  roundedClass?: string;
  size?: 'sm' | 'md' | 'lg';
  videoIds?: string[];
}

const YT_THUMB_RE = /i\.ytimg\.com\/vi\/([A-Za-z0-9_-]{11})\//;

export function resolvePublicAssetUrl(url?: string): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('/covers/') || url.startsWith('/assets/')) {
    const base = import.meta.env.BASE_URL || '/';
    const normalizedBase = base.endsWith('/') ? base : `${base}/`;
    return `${normalizedBase}${url.slice(1)}`;
  }
  return url;
}

function buildCandidateUrls(
  src: string | undefined,
  videoIds: string[] | undefined,
  highRes: boolean
): string[] {
  const candidates: string[] = [];
  const pushUnique = (u?: string) => {
    if (u && !candidates.includes(u)) candidates.push(u);
  };

  const resolvedSrc = resolvePublicAssetUrl(src);
  const match = resolvedSrc ? resolvedSrc.match(YT_THUMB_RE) : null;
  if (resolvedSrc && !match) {
    pushUnique(resolvedSrc);
  }

  const allVids: string[] = [];
  if (match?.[1]) allVids.push(match[1]);
  if (videoIds) {
    for (const v of videoIds) {
      if (v && !allVids.includes(v)) allVids.push(v);
    }
  }

  for (let i = 0; i < allVids.length; i++) {
    const vid = allVids[i];
    if (i === 0 && highRes) {
      pushUnique(`https://i.ytimg.com/vi/${vid}/maxresdefault.jpg`);
    }
    pushUnique(`https://i.ytimg.com/vi/${vid}/mqdefault.jpg`);
    pushUnique(`https://i.ytimg.com/vi/${vid}/hqdefault.jpg`);
  }

  return candidates;
}

export const AlbumCover: React.FC<AlbumCoverProps> = ({
  src,
  alt,
  className = '',
  sizeClass = '',
  roundedClass = '',
  size = 'md',
  videoIds,
}) => {
  const mergedClass = [sizeClass, roundedClass, className]
    .filter(Boolean)
    .join(' ');
  const candidates = useMemo(
    () => buildCandidateUrls(src, videoIds, size === 'lg'),
    [src, videoIds, size]
  );

  const candidateKey = candidates.join('|');
  const [attemptState, setAttemptState] = useState<{
    key: string;
    idx: number;
  }>({ key: candidateKey, idx: 0 });

  const idx = attemptState.key === candidateKey ? attemptState.idx : 0;
  const activeUrl = candidates[idx];

  const advance = () => {
    setAttemptState((prev) => {
      const currentIdx = prev.key === candidateKey ? prev.idx : 0;
      return { key: candidateKey, idx: currentIdx + 1 };
    });
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-10 h-10',
  };

  if (!activeUrl) {
    return (
      <div
        aria-label={alt}
        className={`bg-[var(--bg-hover)] border border-[var(--border-subtle)] flex items-center justify-center select-none overflow-hidden shrink-0 ${mergedClass}`}
      >
        <Disc3 className={`${iconSizes[size]} text-[var(--text-muted)]`} />
      </div>
    );
  }

  return (
    <img
      src={activeUrl}
      alt={alt}
      referrerPolicy="no-referrer"
      loading="lazy"
      decoding="async"
      onLoad={(e) => {
        // YouTube serves a 120x90 grey 3-dots image when a video's thumbnail/quality doesn't exist
        if (
          e.currentTarget.naturalWidth > 0 &&
          e.currentTarget.naturalWidth <= 120 &&
          idx + 1 < candidates.length
        ) {
          advance();
        }
      }}
      onError={advance}
      className={`object-cover bg-[var(--bg-hover)] select-none shrink-0 ${mergedClass}`}
    />
  );
};

interface MosaicCoverProps {
  urls: string[];
  alt: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const MosaicCover: React.FC<MosaicCoverProps> = ({
  urls,
  alt,
  className = '',
  size = 'md',
}) => {
  const uniqueUrls = useMemo(() => {
    const out: string[] = [];
    for (const u of urls) {
      if (u && !out.includes(u)) out.push(u);
      if (out.length === 4) break;
    }
    return out;
  }, [urls]);

  if (uniqueUrls.length >= 4) {
    return (
      <div
        aria-label={alt}
        className={`grid grid-cols-2 grid-rows-2 gap-[1px] bg-[var(--border-subtle)] overflow-hidden select-none shrink-0 ${className}`}
      >
        {uniqueUrls.slice(0, 4).map((u, i) => (
          <AlbumCover
            key={`${u}-${i}`}
            src={u}
            alt=""
            size={size === 'lg' ? 'md' : 'sm'}
            className="w-full h-full"
          />
        ))}
      </div>
    );
  }

  return (
    <AlbumCover
      src={uniqueUrls[0]}
      alt={alt}
      size={size}
      className={className}
    />
  );
};

export function getPlaylistCoverUrls(pl: {
  coverUrl?: string;
  trackIds: string[];
}): string[] {
  const urls: string[] = [];
  for (const id of pl.trackIds) {
    if (id.startsWith('yt-') && id.length >= 14) {
      const vid = id.slice(3);
      const u = `https://i.ytimg.com/vi/${vid}/mqdefault.jpg`;
      if (!urls.includes(u)) urls.push(u);
      if (urls.length === 4) break;
    }
  }
  if (urls.length === 0 && pl.coverUrl) {
    urls.push(pl.coverUrl);
  }
  return urls;
}

