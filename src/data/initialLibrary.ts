import seedTracksRaw from './seedTracks.json';
import type { Playlist, Track } from '../types/music';
import { formatTime } from '../utils/musicLogic';

type CompactSeedTuple = [
  id: string,
  title: string,
  artist: string,
  album: string,
  durationSec: number,
  genre: string,
  videoIds: string | string[],
];

export const SEED_TRACKS: Track[] = (
  seedTracksRaw as unknown as CompactSeedTuple[]
).map(([id, title, artist, album, durationSec, genre, videoIds]) => {
  const ids = Array.isArray(videoIds) ? videoIds : [videoIds];
  const primaryId = ids[0] || '';
  return {
    id,
    title,
    artist,
    album: album || title,
    addedAt: 'Catalogue YouTube',
    durationSec,
    durationLabel: formatTime(durationSec),
    liked: false,
    explicit: false,
    hasClip: true,
    coverUrl: primaryId
      ? `https://i.ytimg.com/vi/${primaryId}/hqdefault.jpg`
      : '',
    previewUrl: '',
    youtubeVideoIds: ids,
    genre,
    sourceKind: 'youtube',
  };
});

// Clean first-time visitor state: no pre-saved playlists until the user creates one
export const DEFAULT_PLAYLISTS: Playlist[] = [];
