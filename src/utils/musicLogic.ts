import type { RepeatMode, SortKey, Track } from '../types/music';

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
 * Filters a list of tracks by multi-word accent-insensitive query across title, artist, album, and genre,
 * plus optional exact genre filter.
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
  const words = q.split(' ').filter(Boolean);
  return byGenre.filter((track) => {
    const haystack = normalizeText(
      `${track.title} ${track.artist} ${track.album} ${track.genre || ''}`
    );
    return words.every((w) => haystack.includes(w));
  });
}

/**
 * Searches and ranks tracks from the catalog by relevance against a user query.
 */
export function searchRankedTracks(
  tracks: Track[],
  query: string,
  limit = 120
): Track[] {
  const q = normalizeText(query);
  if (!q) return [];
  const words = q.split(' ').filter(Boolean);

  const scored: Array<{ track: Track; score: number }> = [];

  for (const track of tracks) {
    const normTitle = normalizeText(track.title);
    const normArtist = normalizeText(track.artist);
    const normAlbum = normalizeText(track.album);
    const normGenre = normalizeText(track.genre || '');
    const haystack = `${normTitle} ${normArtist} ${normAlbum} ${normGenre}`;

    // Require all words (or at least 1 if OR-style multi-artist topic pill)
    const matchedWords = words.filter((w) => haystack.includes(w)).length;
    if (matchedWords === 0) continue;
    if (words.length <= 3 && matchedWords < words.length) continue;

    let score = matchedWords * 20;
    if (
      `${normArtist} ${normTitle}` === q ||
      `${normTitle} ${normArtist}` === q
    ) {
      score += 120;
    } else if (normTitle === q) {
      score += 90;
    } else if (normArtist === q) {
      score += 85;
    } else if (normTitle.startsWith(q)) {
      score += 55;
    } else if (normArtist.startsWith(q)) {
      score += 50;
    } else if (normTitle.includes(q)) {
      score += 35;
    } else if (normArtist.includes(q)) {
      score += 30;
    }

    if (track.liked) score += 10;
    if (track.localFileKey || track.localServerUrl) score += 15;

    scored.push({ track, score });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.track);
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
    return `${hours.toLocaleString('fr-FR')} h ${mins.toString().padStart(2, '0')} min`;
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
export function parseAudioFilename(filename: string): {
  title: string;
  artist: string;
} {
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
export function matchLocalFilenameToTrack(
  filename: string,
  tracks: Track[]
): Track | null {
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
    } else if (
      normFile.includes(normTitle) &&
      firstArtist &&
      normFile.includes(firstArtist)
    ) {
      score = 95;
    } else if (normFile.includes(normTitle) && normTitle.length >= 5) {
      score = 70;
    } else {
      const titleWords = normTitle.split(' ').filter((w) => w.length >= 3);
      if (titleWords.length > 0) {
        const hits = titleWords.filter((w) => normFile.includes(w)).length;
        const ratio = hits / titleWords.length;
        if (ratio >= 0.75) {
          score = Math.round(
            ratio * 60 +
              (firstArtist && normFile.includes(firstArtist) ? 25 : 0)
          );
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
 * Extracts an 11-character YouTube video ID from any share link, watch URL,
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

  const withProto = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : /^(?:www\.|m\.|music\.)?(?:youtube\.com|youtube-nocookie\.com|youtu\.be)\//i.test(
          trimmed
        )
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
 * Returns clean 16:9 zero-letterbox YouTube thumbnail URL for a video ID.
 */
export function getYouTubeThumbnailUrl(videoId: string): string {
  return `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/mqdefault.jpg`;
}

/**
 * Returns standard YouTube watch URL for a video ID.
 */
export function getYouTubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
}

/**
 * Returns standard YouTube search URL.
 */
export function getYouTubeSearchUrl(query: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}

/**
 * Resolves the official YouTube destination URL for a track.
 */
export function getTrackYouTubeWatchUrl(
  track: Track,
  activeVideoId?: string | null
): string {
  if (activeVideoId) {
    return getYouTubeWatchUrl(activeVideoId);
  }
  const firstId = track.youtubeVideoIds?.[0];
  if (firstId) {
    return getYouTubeWatchUrl(firstId);
  }
  return getYouTubeSearchUrl(
    track.searchQuery || `${track.title} ${track.artist}`
  );
}
