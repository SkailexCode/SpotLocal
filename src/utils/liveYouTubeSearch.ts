import type { Track } from '../types/music';
import { formatTime, parseYouTubeTitleAndChannel } from './musicLogic';
import { hasLocalBackend, markLocalBackendAbsent } from './webCatalogSearch';

export interface LiveYouTubeTrackItem {
  videoId: string;
  title: string;
  artist: string;
  durationSec: number;
  durationLabel: string;
  coverUrl: string;
}

const liveSearchCache = new Map<string, Track[]>();

const PIPED_SEARCH_BASES = [
  'https://api.piped.private.coffee',
  'https://pipedapi.kavin.rocks',
  'https://pipedapi-libre.kavin.rocks',
  'https://pipedapi.adminforge.de',
];

const INVIDIOUS_SEARCH_BASES = [
  'https://inv.nadeko.net',
  'https://invidious.nerdvpn.de',
  'https://invidious.jing.rocks',
];

const YT_ID_RE = /^[A-Za-z0-9_-]{11}$/;

function extractVidFromUrl(url?: string): string | null {
  if (!url) return null;
  if (YT_ID_RE.test(url)) return url;
  const m = url.match(/(?:[?&]v=|\/watch\/|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

function toTrack(item: LiveYouTubeTrackItem): Track {
  const clean = parseYouTubeTitleAndChannel(item.title, item.artist);
  const dur =
    item.durationSec >= 30 && item.durationSec <= 3600 ? item.durationSec : 210;
  return {
    id: `yt-${item.videoId}`,
    title: clean.title || item.title,
    artist: clean.artist || item.artist || 'YouTube Music',
    album: 'YouTube Live (100M+)',
    genre: 'YouTube Live',
    addedAt: 'En direct',
    durationSec: dur,
    durationLabel: formatTime(dur),
    coverUrl: `https://i.ytimg.com/vi/${item.videoId}/mqdefault.jpg`,
    previewUrl: '',
    explicit: false,
    liked: false,
    youtubeVideoIds: [item.videoId],
    sourceKind: 'youtube',
  };
}

async function fetchPipedInstance(
  baseUrl: string,
  query: string,
  filter: 'music_songs' | 'videos',
  parentSignal?: AbortSignal
): Promise<LiveYouTubeTrackItem[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3800);
  const onAbort = () => controller.abort();
  parentSignal?.addEventListener('abort', onAbort, { once: true });

  try {
    const res = await fetch(
      `${baseUrl}/search?q=${encodeURIComponent(query)}&filter=${filter}`,
      { signal: controller.signal }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as {
      items?: Array<{
        url?: string;
        title?: string;
        uploaderName?: string;
        duration?: number;
      }>;
    };
    const items: LiveYouTubeTrackItem[] = [];
    for (const raw of data.items || []) {
      const vid = extractVidFromUrl(raw.url);
      if (!vid || !raw.title) continue;
      const dur = Number(raw.duration) || 0;
      if (dur > 0 && (dur < 30 || dur > 1800)) continue;
      items.push({
        videoId: vid,
        title: raw.title,
        artist: (raw.uploaderName || 'YouTube Music').replace(/ - Topic$/i, ''),
        durationSec: dur || 210,
        durationLabel: formatTime(dur || 210),
        coverUrl: `https://i.ytimg.com/vi/${vid}/mqdefault.jpg`,
      });
    }
    if (items.length === 0) throw new Error('Empty Piped response');
    return items;
  } finally {
    clearTimeout(timer);
    parentSignal?.removeEventListener('abort', onAbort);
  }
}

async function fetchInvidiousInstance(
  baseUrl: string,
  query: string,
  parentSignal?: AbortSignal
): Promise<LiveYouTubeTrackItem[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3800);
  const onAbort = () => controller.abort();
  parentSignal?.addEventListener('abort', onAbort, { once: true });

  try {
    const res = await fetch(
      `${baseUrl}/api/v1/search?q=${encodeURIComponent(`${query} music`)}&type=video`,
      { signal: controller.signal }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const rows = (await res.json()) as Array<{
      videoId?: string;
      title?: string;
      author?: string;
      lengthSeconds?: number;
      liveNow?: boolean;
    }>;
    const items: LiveYouTubeTrackItem[] = [];
    for (const r of Array.isArray(rows) ? rows : []) {
      if (!r.videoId || !YT_ID_RE.test(r.videoId) || !r.title || r.liveNow) {
        continue;
      }
      const dur = Number(r.lengthSeconds) || 0;
      if (dur > 0 && (dur < 30 || dur > 1800)) continue;
      items.push({
        videoId: r.videoId,
        title: r.title,
        artist: (r.author || 'YouTube').replace(/ - Topic$/i, ''),
        durationSec: dur || 210,
        durationLabel: formatTime(dur || 210),
        coverUrl: `https://i.ytimg.com/vi/${r.videoId}/mqdefault.jpg`,
      });
    }
    if (items.length === 0) throw new Error('Empty Invidious response');
    return items;
  } finally {
    clearTimeout(timer);
    parentSignal?.removeEventListener('abort', onAbort);
  }
}

/**
 * Searches the global 100M+ YouTube / YouTube Music catalog in real time with ZERO API key.
 * - Uses `/api/youtube/search` when the local/hosted Express backend is active.
 * - Automatically races public CORS-enabled Piped YouTube Music & Invidious instances
 *   directly in the browser when hosted statically (e.g. GitHub Pages).
 */
export async function searchLiveYouTubeGlobal(
  query: string,
  signal?: AbortSignal
): Promise<Track[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const cacheKey = trimmed.toLowerCase();
  const cached = liveSearchCache.get(cacheKey);
  if (cached) return cached;

  // 1. Try local/hosted Express InnerTube relay first if present
  if (hasLocalBackend()) {
    try {
      const res = await fetch(
        `/api/youtube/search?q=${encodeURIComponent(trimmed)}`,
        { signal }
      );
      const ct = res.headers.get('content-type') || '';
      if (res.ok && ct.includes('application/json')) {
        const data = (await res.json()) as { items?: LiveYouTubeTrackItem[] };
        if (Array.isArray(data.items) && data.items.length > 0) {
          const tracks = data.items.map(toTrack);
          liveSearchCache.set(cacheKey, tracks);
          return tracks;
        }
      } else if (!ct.includes('application/json')) {
        markLocalBackendAbsent();
      }
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return [];
    }
  }

  // 2. Pure Client-Side Browser CORS Race (works on GitHub Pages without any backend!)
  try {
    const tasks: Array<Promise<LiveYouTubeTrackItem[]>> = [
      ...PIPED_SEARCH_BASES.map((b) =>
        fetchPipedInstance(b, trimmed, 'music_songs', signal)
      ),
      ...PIPED_SEARCH_BASES.slice(0, 2).map((b) =>
        fetchPipedInstance(b, trimmed, 'videos', signal)
      ),
      ...INVIDIOUS_SEARCH_BASES.map((b) =>
        fetchInvidiousInstance(b, trimmed, signal)
      ),
    ];

    const winner = await Promise.any(tasks);
    const seen = new Set<string>();
    const tracks: Track[] = [];
    for (const item of winner) {
      if (seen.has(item.videoId)) continue;
      seen.add(item.videoId);
      tracks.push(toTrack(item));
      if (tracks.length >= 24) break;
    }

    if (tracks.length > 0) {
      liveSearchCache.set(cacheKey, tracks);
    }
    return tracks;
  } catch {
    return [];
  }
}
