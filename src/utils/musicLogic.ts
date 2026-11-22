import type {
  RepeatMode,
  SearchResultTrack,
  SortKey,
  Track,
} from '../types/music';

/**
 * Formats seconds as M:SS (e.g., 190 -> "3:10").
 */
export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const total = Math.floor(seconds);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Normalizes strings for accent-insensitive, punctuation-tolerant matching.
 */
export function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Filters a list of tracks by title, artist, album, or genre, plus optional exact genre filter.
 */
export function filterTracks(
  tracks: Track[],
  query: string,
  genre?: string
): Track[] {
  const byGenre =
    genre && genre !== 'all'
      ? tracks.filter((t) => t.genre === genre)
      : tracks;
  const q = normalizeText(query);
  if (!q) return byGenre;
  return byGenre.filter((track) => {
    const haystack = normalizeText(
      `${track.title} ${track.artist} ${track.album} ${track.genre || ''}`
    );
    return haystack.includes(q);
  });
}

/**
 * Sorts a copy of tracks by the selected column without mutating the source array.
 */
export function sortTracks(
  tracks: Track[],
  sortKey: SortKey,
  direction: 'asc' | 'desc' = 'asc'
): Track[] {
  if (sortKey === 'default') {
    return direction === 'asc' ? [...tracks] : [...tracks].reverse();
  }
  const factor = direction === 'asc' ? 1 : -1;
  return [...tracks].sort((a, b) => {
    if (sortKey === 'duration') {
      return (a.durationSec - b.durationSec) * factor;
    }
    const valA = normalizeText(a[sortKey]);
    const valB = normalizeText(b[sortKey]);
    return valA.localeCompare(valB, 'fr') * factor;
  });
}

/**
 * Computes total duration string in French (e.g. "2 h 14 min" or "42 min 10 s").
 */
export function totalDurationLabel(tracks: Track[]): string {
  const totalSec = tracks.reduce((acc, t) => acc + (t.durationSec || 0), 0);
  const hours = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  if (hours > 0) {
    return `${hours} h ${mins.toString().padStart(2, '0')} min`;
  }
  const secs = totalSec % 60;
  return `${mins} min ${secs} s`;
}

/**
 * Computes the next queue index respecting shuffle and repeat modes.
 * Returns -1 when playback should stop at the end of the queue.
 */
export function getNextTrackIndex(
  currentIndex: number,
  queueLength: number,
  shuffle: boolean,
  repeat: RepeatMode,
  rng: () => number = Math.random
): number {
  if (queueLength <= 0) return -1;
  if (repeat === 'one' && currentIndex >= 0 && currentIndex < queueLength) {
    return currentIndex;
  }
  if (shuffle && queueLength > 1) {
    let next = Math.floor(rng() * queueLength);
    if (next === currentIndex) {
      next = (currentIndex + 1) % queueLength;
    }
    return next;
  }
  const next = currentIndex + 1;
  if (next >= queueLength) {
    return repeat === 'all' ? 0 : -1;
  }
  return next;
}

/**
 * Computes the previous queue index respecting repeat mode.
 */
export function getPreviousTrackIndex(
  currentIndex: number,
  queueLength: number,
  repeat: RepeatMode
): number {
  if (queueLength <= 0) return -1;
  if (currentIndex <= 0) {
    return repeat === 'all' ? queueLength - 1 : 0;
  }
  return currentIndex - 1;
}

/**
 * Parses an audio filename like "Bigflo & Oli - Dommage.mp3" into { artist, title }.
 */
export function parseAudioFilename(filename: string): { title: string; artist: string } {
  const withoutExt = filename.replace(/\.[^.]+$/, '').replace(/_/g, ' ').trim();
  const dashSplit = withoutExt.split(/\s+[-–—]\s+/);
  if (dashSplit.length >= 2) {
    return {
      artist: dashSplit[0].trim() || 'Artiste local',
      title: dashSplit.slice(1).join(' - ').trim() || withoutExt,
    };
  }
  return {
    title: withoutExt || 'Piste locale',
    artist: 'Fichier local',
  };
}

/**
 * Attempts to match a dropped/scanned audio filename against existing library tracks.
 */
export function matchLocalFilenameToTrack(filename: string, tracks: Track[]): Track | null {
  const normFile = normalizeText(filename.replace(/\.[^.]+$/, ''));
  if (!normFile) return null;

  let bestTrack: Track | null = null;
  let bestScore = 0;

  for (const track of tracks) {
    const normTitle = normalizeText(track.title);
    const firstArtist = normalizeText(track.artist.split(',')[0] || '');

    let score = 0;
    if (normFile === normTitle) {
      score = 100;
    } else if (normFile.includes(normTitle) && firstArtist && normFile.includes(firstArtist)) {
      score = 95;
    } else if (normFile.includes(normTitle) && normTitle.length >= 5) {
      score = 70;
    } else {
      const titleWords = normTitle.split(' ').filter((w) => w.length >= 3);
      if (titleWords.length > 0) {
        const hits = titleWords.filter((w) => normFile.includes(w)).length;
        const ratio = hits / titleWords.length;
        if (ratio >= 0.75) {
          score = Math.round(ratio * 60 + (firstArtist && normFile.includes(firstArtist) ? 25 : 0));
        }
      }
    }

    if (score > bestScore && score >= 60) {
      bestScore = score;
      bestTrack = track;
    }
  }

  return bestTrack;
}

const YT_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

/**
 * Extracts a 11-character YouTube video ID from any share link, watch URL,
 * YouTube Music link, Shorts URL, embed URL, "yt:ID" prefix, or (optionally) raw ID.
 */
export function extractYouTubeVideoId(
  rawInput: string,
  options?: { allowRawId?: boolean }
): string | null {
  const trimmed = rawInput.trim();
  if (!trimmed) return null;

  if (trimmed.toLowerCase().startsWith('yt:')) {
    const candidate = trimmed.slice(3).trim();
    return YT_ID_REGEX.test(candidate) ? candidate : null;
  }

  if (options?.allowRawId && YT_ID_REGEX.test(trimmed)) {
    return trimmed;
  }

  // Handle URLs with or without protocol (e.g. "youtu.be/xyz" or "https://youtu.be/xyz?si=...")
  const withProto = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : /^(?:www\.|m\.|music\.)?(?:youtube\.com|youtube-nocookie\.com|youtu\.be)\//i.test(trimmed)
      ? `https://${trimmed}`
      : null;

  if (!withProto) return null;

  try {
    const parsed = new URL(withProto);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');

    if (host === 'youtu.be') {
      const firstSeg = parsed.pathname.split('/').filter(Boolean)[0] || '';
      return YT_ID_REGEX.test(firstSeg) ? firstSeg : null;
    }

    if (
      host === 'youtube.com' ||
      host === 'm.youtube.com' ||
      host === 'music.youtube.com' ||
      host === 'youtube-nocookie.com'
    ) {
      const vParam = parsed.searchParams.get('v');
      if (vParam && YT_ID_REGEX.test(vParam)) {
        return vParam;
      }
      const segments = parsed.pathname.split('/').filter(Boolean);
      if (
        segments.length >= 2 &&
        ['embed', 'shorts', 'live', 'v'].includes(segments[0]) &&
        YT_ID_REGEX.test(segments[1])
      ) {
        return segments[1];
      }
    }
  } catch {
    return null;
  }

  return null;
}

/**
 * Extracts all unique YouTube video IDs from multi-line or whitespace-separated text.
 */
export function extractMultipleYouTubeVideoIds(
  rawText: string,
  options?: { allowRawId?: boolean }
): string[] {
  const tokens = rawText
    .split(/[\r\n\s,;]+/)
    .map((t) => t.trim())
    .filter(Boolean);

  const ids: string[] = [];
  const seen = new Set<string>();
  for (const token of tokens) {
    const id = extractYouTubeVideoId(token, options);
    if (id && !seen.has(id)) {
      seen.add(id);
      ids.push(id);
    }
  }
  return ids;
}

/**
 * Cleans YouTube video title and channel name into clean { title, artist }.
 */
export function parseYouTubeTitleAndChannel(
  rawVideoTitle: string,
  rawChannelName = ''
): { title: string; artist: string } {
  const cleanedChannel = rawChannelName
    .replace(/\s*-\s*Topic$/i, '')
    .replace(/VEVO$/i, '')
    .replace(/\s*Official$/i, '')
    .trim();

  const cleanedTitle = rawVideoTitle
    .replace(
      /\s*[\(\[](?:official\s*(?:music\s*)?(?:video|audio|lyric\s*video|visualizer)|clip\s*officiel|vid[eé]o\s*officielle|audio\s*officiel|lyrics?|paroles|visualizer|hd|hq|4k|remaster(?:ed)?(?:\s*\d{4})?)[^\)\]]*[\)\]]/gi,
      ''
    )
    .replace(/\s*\|\s*.*$/, '')
    .replace(/\s+/g, ' ')
    .trim();

  const dashParts = cleanedTitle.split(/\s+[-–—]\s+/);
  if (dashParts.length >= 2) {
    const candidateArtist = dashParts[0].trim();
    const candidateTitle = dashParts
      .slice(1)
      .join(' - ')
      .replace(/^["«]|["»]$/g, '')
      .trim();
    if (candidateArtist && candidateTitle) {
      return {
        artist: candidateArtist,
        title: candidateTitle,
      };
    }
  }

  return {
    title: cleanedTitle || rawVideoTitle.trim() || 'Titre YouTube',
    artist: cleanedChannel || 'YouTube',
  };
}

/**
 * Returns high-quality YouTube thumbnail URL for a video ID.
 */
export function getYouTubeThumbnailUrl(videoId: string): string {
  return `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg`;
}

/**
 * Returns standard YouTube watch URL for a video ID.
 */
export function getYouTubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
}

/**
 * Returns standard YouTube search URL as fallback.
 */
export function getYouTubeSearchUrl(query: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}

/**
 * Resolves the official YouTube destination URL for a track.
 */
export function getTrackYouTubeWatchUrl(track: Track, activeVideoId?: string | null): string {
  if (activeVideoId) {
    return getYouTubeWatchUrl(activeVideoId);
  }
  const firstId = track.youtubeVideoIds?.[0];
  if (firstId) {
    return getYouTubeWatchUrl(firstId);
  }
  return getYouTubeSearchUrl(track.searchQuery || `${track.title} ${track.artist}`);
}

/**
 * Returns true if a preview URL uses a short-lived signed token (such as Deezer's hdnea=exp=...)
 * that should NOT be saved permanently into localStorage.
 */
export function isTransientSignedStreamUrl(url?: string | null): boolean {
  if (!url) return false;
  return /dzcdn\.net|hdnea=exp=/i.test(url);
}

/**
 * Checks whether a signed Deezer preview URL (hdnea=exp=<unix_seconds>) is expired
 * or within 60 seconds of expiring.
 */
export function isExpiredDeezerPreviewUrl(
  url?: string | null,
  nowMs: number = Date.now()
): boolean {
  if (!url) return true;
  const match = url.match(/exp=(\d{9,12})/i);
  if (!match) return false;
  const expSeconds = Number.parseInt(match[1], 10);
  if (!Number.isFinite(expSeconds)) return false;
  return expSeconds * 1000 <= nowMs + 60_000;
}

const KARAOKE_RE =
  /\b(karaoke|tribute|in the style of|8-bit|ringtone|lullaby|made famous by|cover version|backing track)\b/i;

/**
 * Computes a relevance score (higher is better) for a catalog search result against a user query.
 */
export function scoreSearchMatch(
  item: Pick<SearchResultTrack, 'title' | 'artist' | 'album' | 'previewUrl'>,
  query = ''
): number {
  let score = item.previewUrl ? 20 : 0;
  const rawBlob = `${item.title} ${item.artist} ${item.album}`;

  if (KARAOKE_RE.test(rawBlob) && !KARAOKE_RE.test(query)) {
    score -= 60;
  }

  const normQuery = normalizeText(query);
  if (!normQuery) return score;

  const normTitle = normalizeText(item.title);
  const normArtist = normalizeText(item.artist);
  const combined = `${normArtist} ${normTitle}`;

  if (combined === normQuery || `${normTitle} ${normArtist}` === normQuery) {
    score += 100;
  } else {
    if (normTitle === normQuery) score += 70;
    else if (normTitle.startsWith(normQuery)) score += 45;
    else if (normTitle.includes(normQuery)) score += 30;

    if (normArtist === normQuery) score += 60;
    else if (normArtist.includes(normQuery)) score += 35;

    const words = normQuery.split(' ').filter((w) => w.length >= 2);
    if (words.length > 0) {
      const matchedWords = words.filter((w) => combined.includes(w)).length;
      score += Math.round((matchedWords / words.length) * 45);
    }
  }

  return score;
}

/**
 * Deduplicates, enriches, and ranks catalog tracks coming from Apple iTunes and Deezer.
 * When the same song is returned by both APIs, merges metadata & keeps both preview URLs
 * (`previewUrl` + `fallbackPreviewUrl`) for instant failover.
 */
export function mergeAndScoreCatalogResults(
  items: SearchResultTrack[],
  query = ''
): SearchResultTrack[] {
  const bySignature = new Map<string, SearchResultTrack>();

  const cleanCoreTitle = (t: string) =>
    normalizeText(
      t.replace(
        /\s*[\(\[](?:feat\.?|ft\.?|with|remaster(?:ed)?|radio edit|album version|single version)[^\)\]]*[\)\]]/gi,
        ''
      )
    );

  for (const item of items) {
    const primaryArtist = normalizeText(item.artist.split(/[,&]/)[0] || item.artist);
    const sig = `${cleanCoreTitle(item.title)}::${primaryArtist}`;
    const itemProviders: Array<'deezer' | 'itunes'> = item.providerSources
      ? [...item.providerSources]
      : item.source === 'deezer' || item.source === 'itunes'
        ? [item.source]
        : [];

    const existing = bySignature.get(sig);
    if (!existing) {
      bySignature.set(sig, {
        ...item,
        providerSources: itemProviders,
      });
      continue;
    }

    // Merge rich fields from both Apple iTunes & Deezer
    const mergedProviders = Array.from(
      new Set([...(existing.providerSources || []), ...itemProviders])
    );

    // Prefer Apple's stable CDN URL as primary if available, and keep the other as fallback
    let primaryPreview = existing.previewUrl;
    let fallbackPreview = existing.fallbackPreviewUrl;
    if (!primaryPreview && item.previewUrl) {
      primaryPreview = item.previewUrl;
    } else if (
      item.previewUrl &&
      item.previewUrl !== primaryPreview &&
      !fallbackPreview
    ) {
      if (isTransientSignedStreamUrl(primaryPreview) && !isTransientSignedStreamUrl(item.previewUrl)) {
        fallbackPreview = primaryPreview;
        primaryPreview = item.previewUrl;
      } else {
        fallbackPreview = item.previewUrl;
      }
    }

    // Prefer 600x600 Apple artwork or Deezer cover_big over smaller thumbnails
    const preferNewCover =
      (!existing.coverUrl && Boolean(item.coverUrl)) ||
      (item.coverUrl.includes('600x600') && !existing.coverUrl.includes('600x600'));

    bySignature.set(sig, {
      ...existing,
      coverUrl: preferNewCover ? item.coverUrl : existing.coverUrl,
      previewUrl: primaryPreview,
      fallbackPreviewUrl: fallbackPreview,
      deezerId: existing.deezerId ?? item.deezerId,
      itunesId: existing.itunesId ?? item.itunesId,
      genre: existing.genre || item.genre,
      releaseYear: existing.releaseYear || item.releaseYear,
      explicit: existing.explicit || item.explicit,
      providerSources: mergedProviders,
    });
  }

  const mergedList = Array.from(bySignature.values());
  if (!query.trim()) return mergedList;

  return mergedList
    .map((item, idx) => ({
      item,
      idx,
      score:
        scoreSearchMatch(item, query) +
        ((item.providerSources?.length || 0) > 1 ? 8 : 0),
    }))
    .sort((a, b) => b.score - a.score || a.idx - b.idx)
    .map((entry) => entry.item);
}

