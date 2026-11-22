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
 * Filters a list of tracks by title, artist, or album.
 */
export function filterTracks(tracks: Track[], query: string): Track[] {
  const q = normalizeText(query);
  if (!q) return tracks;
  return tracks.filter((track) => {
    const haystack = normalizeText(`${track.title} ${track.artist} ${track.album}`);
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

