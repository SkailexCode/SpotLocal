export type AudioSourceKind = 'local-idb' | 'local-folder' | 'youtube' | 'none';

export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  genre?: string;
  moodMask?: number;
  addedAt: string;
  durationSec: number;
  durationLabel: string;
  coverUrl: string;
  previewUrl: string;
  explicit?: boolean;
  liked: boolean;
  /**Local browser IndexedDB file key (persists across page reloads) */
  localFileKey?: string;
  /**Local disk /music server URL when running locally */
  localServerUrl?: string;
  /**Verified YouTube video IDs (primary + optional backup failover) */
  youtubeVideoIds?: string[];
  searchQuery?: string;
  sourceKind?: AudioSourceKind;
}

export interface Playlist {
  id: string;
  name: string;
  description: string;
  coverUrl?: string;
  trackIds: string[];
  createdAt?: string;
}

export type ActiveView =
  | 'home'
  | 'explore'
  | 'moods'
  | 'search'
  | 'liked'
  | 'all-tracks'
  | 'artist'
  | 'playlist';

export type RepeatMode = 'off' | 'all' | 'one';

export type SortKey = 'default' | 'title' | 'artist' | 'album' | 'duration';

export type SleepTimerOption = 0 | 15 | 30 | 45 | 60 | 'end-of-track';

export interface ResolvedYouTubeMeta {
  videoId: string;
  title: string;
  artist: string;
  coverUrl: string;
  rawTitle?: string;
  authorName?: string;
}

export interface SpotLocalBackupData {
  version: 3;
  exportedAt: string;
  customTracks: Track[];
  likedIds?: string[];
  trackOverrides: Record<string, Partial<Track>>;
  playlists: Playlist[];
  recentTrackIds: string[];
}
