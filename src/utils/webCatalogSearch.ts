import type { ResolvedYouTubeMeta } from '../types/music';
import {
  getYouTubeThumbnailUrl,
  getYouTubeWatchUrl,
  parseYouTubeTitleAndChannel,
} from './musicLogic';

class BoundedTtlCache<T> {
  private map = new Map<string, { at: number; value: T }>();
  private readonly ttlMs: number;
  private readonly maxSize: number;

  constructor(ttlMs: number, maxSize = 200) {
    this.ttlMs = ttlMs;
    this.maxSize = maxSize;
  }

  get(key: string): T | undefined {
    const entry = this.map.get(key);
    if (!entry) return undefined;
    if (Date.now() - entry.at > this.ttlMs) {
      this.map.delete(key);
      return undefined;
    }
    this.map.delete(key);
    this.map.set(key, entry);
    return entry.value;
  }

  set(key: string, value: T): void {
    if (this.map.has(key)) {
      this.map.delete(key);
    } else if (this.map.size >= this.maxSize) {
      const oldestKey = this.map.keys().next().value;
      if (oldestKey !== undefined) this.map.delete(oldestKey);
    }
    this.map.set(key, { at: Date.now(), value });
  }
}

const ytMetaCache = new BoundedTtlCache<ResolvedYouTubeMeta>(
  60 * 60 * 1000,
  250
);

let backendAvailable: boolean =
  typeof window === 'undefined'
    ? false
    : !/\.github\.io$|\.pages\.dev$|\.netlify\.app$/i.test(
        window.location.hostname
      );

export function hasLocalBackend(): boolean {
  return backendAvailable;
}

export function markLocalBackendAbsent(): void {
  backendAvailable = false;
}

/**
 * Resolves YouTube video metadata (title, artist, thumbnail) directly from the browser
 * without any API key using public CORS-friendly oEmbed endpoints, with graceful fallback.
 */
export async function resolveYouTubeMetadataClient(
  videoId: string
): Promise<ResolvedYouTubeMeta> {
  const cached = ytMetaCache.get(videoId);
  if (cached) return cached;

  const watchUrl = getYouTubeWatchUrl(videoId);
  const defaultCover = getYouTubeThumbnailUrl(videoId);

  const tryEndpoints = [
    `https://www.youtube.com/oembed?url=${encodeURIComponent(watchUrl)}&format=json`,
    `https://noembed.com/embed?url=${encodeURIComponent(watchUrl)}`,
    ...(hasLocalBackend()
      ? [`/api/music/youtube-meta?id=${encodeURIComponent(videoId)}`]
      : []),
  ];

  for (const endpoint of tryEndpoints) {
    try {
      const res = await fetch(endpoint, {
        signal: AbortSignal.timeout(4000),
      });
      if (!res.ok) continue;
      const data = (await res.json()) as {
        title?: string;
        author_name?: string;
        thumbnail_url?: string;
        error?: string;
      };
      if (data.error || !data.title) continue;

      const parsed = parseYouTubeTitleAndChannel(
        data.title,
        data.author_name || ''
      );
      const resolved: ResolvedYouTubeMeta = {
        videoId,
        title: parsed.title,
        artist: parsed.artist,
        rawTitle: data.title,
        authorName: data.author_name || parsed.artist,
        coverUrl: data.thumbnail_url || defaultCover,
      };
      ytMetaCache.set(videoId, resolved);
      return resolved;
    } catch {
      // Try next endpoint
    }
  }

  return {
    videoId,
    title: `Vidéo YouTube (${videoId})`,
    artist: 'YouTube',
    rawTitle: '',
    authorName: 'YouTube',
    coverUrl: defaultCover,
  };
}
