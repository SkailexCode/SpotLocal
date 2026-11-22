export type RepeatMode = 'off' | 'all' | 'one';

export type SortKey = 'default' | 'title' | 'artist' | 'album' | 'duration';

export type ActiveView = 'home' | 'liked' | 'search' | 'playlist' | 'all-tracks';

export type AudioSourceKind = 'local-idb' | 'local-folder' | 'youtube' | 'stream' | 'none';

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
  source: 'deezer' | 'itunes';
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
