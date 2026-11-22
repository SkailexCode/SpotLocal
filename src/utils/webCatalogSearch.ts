import type { ResolvedYouTubeMeta, SearchResultTrack } from '../types/music';
import {
  formatTime,
  getYouTubeThumbnailUrl,
  getYouTubeWatchUrl,
  mergeAndScoreCatalogResults,
  normalizeText,
  parseYouTubeTitleAndChannel,
} from './musicLogic';

class BoundedTtlCache<T> {
  private map = new Map<string, { at: number; value: T }>();
  private readonly ttlMs: number;
  private readonly maxSize: number;

  constructor(ttlMs: number, maxSize = 120) {
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
    // Refresh LRU order
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

export interface CatalogSearchBundle {
  merged: SearchResultTrack[];
  deezer: SearchResultTrack[];
  itunes: SearchResultTrack[];
}

export interface ResolvedStreamInfo {
  previewUrl: string;
  fallbackPreviewUrl?: string;
  coverUrl: string;
  deezerId?: number;
  itunesId?: number;
  provider: 'itunes' | 'deezer' | 'none';
}

const ytMetaCache = new BoundedTtlCache<ResolvedYouTubeMeta>(60 * 60 * 1000, 200);
const searchBundleCache = new BoundedTtlCache<CatalogSearchBundle>(12 * 60 * 1000, 100);
const chartsCache = new BoundedTtlCache<SearchResultTrack[]>(20 * 60 * 1000, 4);
const inflightSearches = new Map<string, Promise<CatalogSearchBundle>>();

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

let jsonpCounter = 0;

/**
 * Executes a zero-CORS browser JSONP request against Deezer's official public API (`output=jsonp`).
 * Automatically cleans up the injected <script> tag and window callback on completion, error, or abort.
 */
function fetchDeezerJsonp<T>(
  endpointPath: string,
  params: Record<string, string | number> = {},
  signal?: AbortSignal,
  timeoutMs = 4500
): Promise<T> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.reject(new Error('JSONP requires a browser environment'));
  }
  if (signal?.aborted) {
    return Promise.reject(new DOMException('Aborted', 'AbortError'));
  }

  return new Promise<T>((resolve, reject) => {
    const cbName = `__spotlocal_dz_jsonp_${Date.now()}_${++jsonpCounter}`;
    const url = new URL(`https://api.deezer.com/${endpointPath.replace(/^\//, '')}`);
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, String(v));
    }
    url.searchParams.set('output', 'jsonp');
    url.searchParams.set('callback', cbName);

    const script = document.createElement('script');
    script.src = url.toString();
    script.async = true;

    let settled = false;
    const win = window as unknown as Record<string, unknown>;

    const cleanup = () => {
      window.clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      delete win[cbName];
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };

    const onAbort = () => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new DOMException('Aborted', 'AbortError'));
    };

    const timer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error('Deezer JSONP timeout'));
    }, timeoutMs);

    signal?.addEventListener('abort', onAbort, { once: true });

    win[cbName] = (payload: T) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(payload);
    };

    script.onerror = () => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error('Deezer JSONP network error'));
    };

    document.head.appendChild(script);
  });
}

interface RawDeezerItem {
  id: number;
  title?: string;
  title_short?: string;
  duration?: number;
  explicit_lyrics?: boolean;
  preview?: string;
  release_date?: string;
  artist?: { name?: string };
  album?: {
    title?: string;
    cover_medium?: string;
    cover_big?: string;
    cover_xl?: string;
  };
}

function mapDeezerItem(item: RawDeezerItem): SearchResultTrack | null {
  const title = item.title || item.title_short;
  const artist = item.artist?.name;
  if (!title || !artist || !item.id) return null;
  const sec = item.duration && item.duration > 0 ? item.duration : 180;
  const year = item.release_date ? item.release_date.slice(0, 4) : undefined;

  return {
    externalId: `dz-${item.id}`,
    deezerId: item.id,
    title,
    artist,
    album: item.album?.title || title,
    durationSec: sec,
    durationLabel: formatTime(sec),
    explicit: Boolean(item.explicit_lyrics),
    coverUrl:
      item.album?.cover_big ||
      item.album?.cover_xl ||
      item.album?.cover_medium ||
      '',
    previewUrl: item.preview || '',
    releaseYear: year && /^\d{4}$/.test(year) ? year : undefined,
    source: 'deezer',
    providerSources: ['deezer'],
  };
}

/**
 * Queries Deezer Public API directly from the browser via official JSONP (0 API key, 0 CORS issue).
 */
export async function searchDeezerBrowserJsonp(
  query: string,
  signal?: AbortSignal,
  limit = 22
): Promise<SearchResultTrack[]> {
  const payload = await fetchDeezerJsonp<{ data?: RawDeezerItem[]; error?: unknown }>(
    '/search',
    { q: query, limit },
    signal
  );
  if (!payload || payload.error || !Array.isArray(payload.data)) {
    return [];
  }
  return payload.data
    .map(mapDeezerItem)
    .filter((x): x is SearchResultTrack => Boolean(x));
}

/**
 * Refreshes a fresh signed 30s MP3 preview URL for a Deezer track ID (fixes expired hdnea= tokens).
 */
export async function refreshDeezerTrackPreview(
  deezerId: number
): Promise<string | null> {
  try {
    const item = await fetchDeezerJsonp<RawDeezerItem & { error?: unknown }>(
      `/track/${deezerId}`,
      {},
      undefined,
      3500
    );
    if (item && !item.error && item.preview) {
      return item.preview;
    }
  } catch {
    // Ignore JSONP failure
  }
  return null;
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

interface RawItunesItem {
  trackId: number;
  trackName?: string;
  artistName?: string;
  collectionName?: string;
  trackTimeMillis?: number;
  trackExplicitness?: string;
  artworkUrl100?: string;
  previewUrl?: string;
  primaryGenreName?: string;
  releaseDate?: string;
}

function mapItunesItem(item: RawItunesItem): SearchResultTrack | null {
  if (!item.trackName || !item.artistName || !item.trackId) return null;
  const sec = Math.round((item.trackTimeMillis || 180000) / 1000);
  const year = item.releaseDate ? item.releaseDate.slice(0, 4) : undefined;
  return {
    externalId: `it-${item.trackId}`,
    itunesId: item.trackId,
    title: item.trackName,
    artist: item.artistName,
    album: item.collectionName || item.trackName,
    durationSec: sec,
    durationLabel: formatTime(sec),
    explicit: item.trackExplicitness === 'explicit',
    coverUrl: item.artworkUrl100
      ? item.artworkUrl100.replace('100x100bb', '600x600bb')
      : '',
    previewUrl: item.previewUrl || '',
    genre: item.primaryGenreName,
    releaseYear: year && /^\d{4}$/.test(year) ? year : undefined,
    source: 'itunes',
    providerSources: ['itunes'],
  };
}

/**
 * Queries Apple iTunes Search API directly from the browser (CORS-enabled, zero API key).
 */
export async function searchItunesBrowserDirect(
  query: string,
  signal?: AbortSignal,
  limit = 22
): Promise<SearchResultTrack[]> {
  const res = await fetch(
    `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&entity=song&country=FR&limit=${limit}`,
    { signal }
  );
  if (!res.ok) throw new Error(`iTunes HTTP ${res.status}`);
  const data = (await res.json()) as { results?: RawItunesItem[] };

  return (data.results || [])
    .map(mapItunesItem)
    .filter((x): x is SearchResultTrack => Boolean(x));
}

/**
 * Looks up a specific Apple iTunes track ID directly via CORS.
 */
export async function lookupItunesTrackPreview(
  itunesId: number
): Promise<string | null> {
  try {
    const res = await fetch(
      `https://itunes.apple.com/lookup?id=${encodeURIComponent(String(itunesId))}&country=FR`,
      { signal: AbortSignal.timeout(3500) }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { results?: RawItunesItem[] };
    const hit = data.results?.find((r) => r.previewUrl);
    return hit?.previewUrl || null;
  } catch {
    return null;
  }
}

/**
 * Queries BOTH Apple iTunes (CORS) and Deezer (JSONP) + optional local server concurrently,
 * returning deduplicated merged results as well as per-provider lists, with in-flight sharing & caching.
 */
export async function searchCatalogDetailed(
  query: string,
  signal?: AbortSignal
): Promise<CatalogSearchBundle> {
  const normKey = normalizeText(query);
  if (!normKey) {
    return { merged: [], deezer: [], itunes: [] };
  }

  const cached = searchBundleCache.get(normKey);
  if (cached) return cached;

  if (!signal) {
    const existing = inflightSearches.get(normKey);
    if (existing) return existing;
  }

  const task = (async (): Promise<CatalogSearchBundle> => {
    const serverPromise = hasLocalBackend()
      ? fetch(`/api/music/search?q=${encodeURIComponent(query)}`, { signal })
          .then(async (r) => {
            if (!r.ok) return null;
            const d = (await r.json()) as {
              results?: SearchResultTrack[];
              deezer?: SearchResultTrack[];
              itunes?: SearchResultTrack[];
            };
            return d;
          })
          .catch(() => null)
      : Promise.resolve(null);

    const browserItunesPromise = searchItunesBrowserDirect(query, signal).catch(
      () => [] as SearchResultTrack[]
    );

    const browserDeezerPromise = searchDeezerBrowserJsonp(query, signal).catch(
      () => [] as SearchResultTrack[]
    );

    const [serverData, browserItunes, browserDeezer] = await Promise.all([
      serverPromise,
      browserItunesPromise,
      browserDeezerPromise,
    ]);

    if (signal?.aborted) {
      return { merged: [], deezer: [], itunes: [] };
    }

    const deezerRaw = [
      ...(browserDeezer || []),
      ...(serverData?.deezer ||
        (serverData?.results || []).filter((r) => r.source === 'deezer')),
    ];
    const itunesRaw = [
      ...(browserItunes || []),
      ...(serverData?.itunes ||
        (serverData?.results || []).filter((r) => r.source === 'itunes')),
    ];

    const deezerDeduped = mergeAndScoreCatalogResults(deezerRaw, query);
    const itunesDeduped = mergeAndScoreCatalogResults(itunesRaw, query);
    const merged = mergeAndScoreCatalogResults(
      [...itunesDeduped, ...deezerDeduped],
      query
    );

    const bundle: CatalogSearchBundle = {
      merged,
      deezer: deezerDeduped,
      itunes: itunesDeduped,
    };

    if (merged.length > 0) {
      searchBundleCache.set(normKey, bundle);
    }
    return bundle;
  })();

  if (!signal) {
    inflightSearches.set(normKey, task);
    task.finally(() => inflightSearches.delete(normKey));
  }

  return task;
}

/**
 * Convenience wrapper returning merged Apple + Deezer results.
 */
export async function searchCatalogHybrid(
  query: string,
  signal?: AbortSignal
): Promise<SearchResultTrack[]> {
  const bundle = await searchCatalogDetailed(query, signal);
  return bundle.merged;
}

/**
 * Fetches live trending tracks in France/World from Deezer Charts (JSONP) + Apple Music/iTunes (CORS)
 * with graceful server fallback and 20-minute client cache.
 */
export async function fetchLiveChartsHybrid(
  signal?: AbortSignal
): Promise<SearchResultTrack[]> {
  const cached = chartsCache.get('fr-top');
  if (cached) return cached;

  const deezerChartPromise = fetchDeezerJsonp<{ data?: RawDeezerItem[] }>(
    '/chart/0/tracks',
    { limit: 12 },
    signal,
    4500
  )
    .then((res) =>
      (res.data || [])
        .map(mapDeezerItem)
        .filter((x): x is SearchResultTrack => Boolean(x))
    )
    .catch(() => [] as SearchResultTrack[]);

  const appleTrendingPromise = searchItunesBrowserDirect(
    'Stromae The Weeknd Billie Eilish Dua Lipa Angèle Daft Punk',
    signal,
    12
  ).catch(() => [] as SearchResultTrack[]);

  const serverChartPromise = hasLocalBackend()
    ? fetch('/api/music/charts', { signal })
        .then(async (r) => {
          if (!r.ok) return [] as SearchResultTrack[];
          const d = (await r.json()) as { results?: SearchResultTrack[] };
          return d.results || [];
        })
        .catch(() => [] as SearchResultTrack[])
    : Promise.resolve([] as SearchResultTrack[]);

  const [dzTracks, itTracks, srvTracks] = await Promise.all([
    deezerChartPromise,
    appleTrendingPromise,
    serverChartPromise,
  ]);

  // Prioritize official Deezer Chart order, enriched with Apple iTunes metadata/previews
  const combined = mergeAndScoreCatalogResults([
    ...dzTracks,
    ...srvTracks,
    ...itTracks,
  ]).slice(0, 15);

  if (combined.length > 0) {
    chartsCache.set('fr-top', combined);
  }
  return combined;
}

/**
 * Resolves a playable 30s audio stream (plus backup stream) using Apple iTunes + Deezer in parallel.
 * Handles direct ID refresh if `deezerId` or `itunesId` is already known.
 */
export async function resolvePreviewHybrid(options: {
  query: string;
  deezerId?: number;
  itunesId?: number;
}): Promise<ResolvedStreamInfo> {
  const { query, deezerId, itunesId } = options;

  // Fast path 1: Known Apple iTunes ID + Known Deezer ID in parallel
  if (itunesId || deezerId) {
    const [itUrl, dzUrl] = await Promise.all([
      itunesId ? lookupItunesTrackPreview(itunesId) : Promise.resolve(null),
      deezerId ? refreshDeezerTrackPreview(deezerId) : Promise.resolve(null),
    ]);
    if (itUrl || dzUrl) {
      return {
        previewUrl: itUrl || dzUrl || '',
        fallbackPreviewUrl: itUrl && dzUrl ? dzUrl : undefined,
        coverUrl: '',
        deezerId,
        itunesId,
        provider: itUrl ? 'itunes' : 'deezer',
      };
    }
  }

  // Fast path 2: Parallel search across Apple iTunes + Deezer + optional Server
  const [bundle, serverResolve] = await Promise.all([
    searchCatalogDetailed(query).catch(
      (): CatalogSearchBundle => ({ merged: [], deezer: [], itunes: [] })
    ),
    hasLocalBackend()
      ? fetch(`/api/music/resolve?q=${encodeURIComponent(query)}`, {
          signal: AbortSignal.timeout(3000),
        })
          .then(async (r) =>
            r.ok
              ? ((await r.json()) as {
                  previewUrl?: string;
                  fallbackPreviewUrl?: string;
                  coverUrl?: string;
                  deezerId?: number;
                  itunesId?: number;
                  provider?: 'itunes' | 'deezer';
                })
              : null
          )
          .catch(() => null)
      : Promise.resolve(null),
  ]);

  const bestHit = bundle.merged.find((item) => item.previewUrl);
  if (bestHit) {
    const isDzPrimary = bestHit.previewUrl.includes('dzcdn.net');
    return {
      previewUrl: bestHit.previewUrl,
      fallbackPreviewUrl:
        bestHit.fallbackPreviewUrl || serverResolve?.previewUrl || undefined,
      coverUrl: bestHit.coverUrl || serverResolve?.coverUrl || '',
      deezerId: bestHit.deezerId,
      itunesId: bestHit.itunesId,
      provider: isDzPrimary ? 'deezer' : 'itunes',
    };
  }

  if (serverResolve?.previewUrl) {
    return {
      previewUrl: serverResolve.previewUrl,
      fallbackPreviewUrl: serverResolve.fallbackPreviewUrl,
      coverUrl: serverResolve.coverUrl || '',
      deezerId: serverResolve.deezerId,
      itunesId: serverResolve.itunesId,
      provider: serverResolve.provider || 'itunes',
    };
  }

  return { previewUrl: '', coverUrl: '', provider: 'none' };
}
