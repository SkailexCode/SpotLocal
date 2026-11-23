import type { Playlist, Track } from '../types/music';
import rawSeedTuples from './seedTracks.json';

type SeedTuple = [
  id: string,
  title: string,
  artist: string,
  album: string,
  durationSec: number,
  genre: string,
  videoIds: string | string[],
  moodMask?: number,
];

function formatDurationLabel(sec: number): string {
  const safe = Math.max(0, Math.floor(sec || 0));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export const SEED_TRACKS: Track[] = (rawSeedTuples as SeedTuple[]).map(
  ([id, title, artist, album, durationSec, genre, videoIds, moodMask]) => {
    const vids = Array.isArray(videoIds) ? videoIds : [videoIds];
    const primaryVid = vids[0];
    return {
      id,
      title,
      artist,
      album: album || genre,
      genre,
      moodMask: moodMask || 0,
      addedAt: 'Catalogue YouTube',
      durationSec,
      durationLabel: formatDurationLabel(durationSec),
      coverUrl: `https://i.ytimg.com/vi/${primaryVid}/mqdefault.jpg`,
      previewUrl: '',
      explicit: false,
      liked: false,
      youtubeVideoIds: vids,
      sourceKind: 'youtube',
    };
  }
);

/**
 * Clean first-visit state: zero pre-recorded user playlists.
 * Users create their own playlists as if visiting for the first time.
 */
export const DEFAULT_PLAYLISTS: Playlist[] = [];
