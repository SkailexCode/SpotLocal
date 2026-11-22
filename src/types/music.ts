export type RepeatMode = 'off' | 'all' | 'one';

export type SortKey = 'default' | 'title' | 'artist' | 'album' | 'duration';

export type ActiveView =
  | 'home'
  | 'liked'
  | 'search'
  | 'playlist'
  | 'all-tracks'
  | 'artist';

export type AudioSourceKind =
  | 'local-idb'
  | 'local-folder'
  | 'youtube'
  | 'deezer'
  | 'itunes'
  | 'stream'
  | 'none';

export type CatalogProviderFilter = 'all' | 'deezer' | 'itunes' | 'local';

export type SleepTimerOption = 0 | 15 | 30 | 45 | 60 | 'end-of-track';

export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  addedAt: string;
  durationLabel: string;
  durationSec: number;
  liked: boolean;
  explicit?: boolean;
  hasClip?: boolean;
  coverUrl: string;
  previewUrl: string;
  fallbackPreviewUrl?: string;
  deezerId?: number;
  itunesId?: number;
  releaseYear?: string;
  dailymotionId?: string;
  soundcloudTrackId?: number;
  youtubeVideoIds?: string[];
  searchQuery?: string;
  matchedName?: string;
  localFileKey?: string;
  localServerUrl?: string;
  sourceKind?: AudioSourceKind;
  genre?: string;
}

export interface Playlist {
  id: string;
  name: string;
  description: string;
  coverUrl?: string;
  trackIds: string[];
  createdAt: string;
  isSystem?: boolean;
}

export interface SearchResultTrack {
  externalId: string;
  title: string;
  artist: string;
  album: string;
  durationSec: number;
  durationLabel: string;
  explicit: boolean;
  coverUrl: string;
  previewUrl: string;
  fallbackPreviewUrl?: string;
  deezerId?: number;
  itunesId?: number;
  genre?: string;
  releaseYear?: string;
  youtubeVideoId?: string;
  source: 'deezer' | 'itunes' | 'youtube';
  providerSources?: Array<'deezer' | 'itunes'>;
}

export interface ResolvedYouTubeMeta {
  videoId: string;
  title: string;
  artist: string;
  rawTitle: string;
  authorName: string;
  coverUrl: string;
}

export interface SpotLocalBackupData {
  version: 2;
  exportedAt: string;
  customTracks: Track[];
  trackOverrides: Record<string, Partial<Track>>;
  playlists: Playlist[];
  recentTrackIds: string[];
}

declare global {
  interface Window {
    spotlocalDesktop?: {
      isDesktop?: boolean;
      getMusicDir?: () => Promise<string>;
      openMusicDir?: () => Promise<string>;
      pickAudioFiles?: () => Promise<string[]>;
    };
  }
}
