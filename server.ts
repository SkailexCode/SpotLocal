import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const ROOT_DIR = process.env.SPOTLOCAL_APP_ROOT
  ? path.resolve(process.env.SPOTLOCAL_APP_ROOT)
  : process.cwd();

const PORT = Number(process.env.PORT || 3000);
const BIND_HOST =
  process.env.SPOTLOCAL_DESKTOP === '1' ? '127.0.0.1' : '0.0.0.0';
const MUSIC_DIR = process.env.SPOTLOCAL_MUSIC_DIR
  ? path.resolve(process.env.SPOTLOCAL_MUSIC_DIR)
  : path.resolve(ROOT_DIR, 'music');
const EXE_PATH = path.resolve(ROOT_DIR, 'release', 'SpotLocal-Portable.exe');
const EXE_ZIP_PATH = path.resolve(
  ROOT_DIR,
  'release',
  'SpotLocal-Portable-Windows.zip'
);

class TtlCache<T> {
  private store = new Map<string, { value: T; expiresAt: number }>();
  private readonly ttlMs: number;
  private readonly maxEntries: number;

  constructor(ttlMs: number, maxEntries = 300) {
    this.ttlMs = ttlMs;
    this.maxEntries = maxEntries;
  }

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    this.store.delete(key);
    this.store.set(key, entry);
    return entry.value;
  }

  set(key: string, value: T): void {
    if (this.store.has(key)) {
      this.store.delete(key);
    } else if (this.store.size >= this.maxEntries) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey !== undefined) this.store.delete(oldestKey);
    }
    this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }
}

interface CatalogSearchResult {
  externalId: string;
  deezerId?: number;
  itunesId?: number;
  title: string;
  artist: string;
  album: string;
  durationSec: number;
  durationLabel: string;
  explicit: boolean;
  coverUrl: string;
  previewUrl: string;
  fallbackPreviewUrl?: string;
  genre?: string;
  releaseYear?: string;
  source: 'deezer' | 'itunes';
  providerSources?: Array<'deezer' | 'itunes'>;
}

interface SearchApiPayload {
  results: CatalogSearchResult[];
  deezer: CatalogSearchResult[];
  itunes: CatalogSearchResult[];
}

// Keep TTL to 10 minutes so Deezer's signed hdnea= preview tokens remain fresh
const searchApiCache = new TtlCache<SearchApiPayload>(10 * 60 * 1000, 250);
const chartsApiCache = new TtlCache<CatalogSearchResult[]>(15 * 60 * 1000, 4);
const youtubeIdsCache = new TtlCache<string[]>(60 * 60 * 1000, 300);
const youtubeMetaCache = new TtlCache<{
  title: string;
  author_name: string;
  thumbnail_url: string;
}>(60 * 60 * 1000, 300);
const previewCache = new TtlCache<{
  previewUrl: string;
  fallbackPreviewUrl?: string;
  coverUrl: string;
  deezerId?: number;
  itunesId?: number;
  provider: 'itunes' | 'deezer';
}>(10 * 60 * 1000, 300);

const AUDIO_EXTENSIONS = new Set([
  '.mp3',
  '.wav',
  '.flac',
  '.m4a',
  '.ogg',
  '.aac',
  '.opus',
  '.webm',
]);

const MIME_MAP: Record<string, string> = {
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.flac': 'audio/flac',
  '.m4a': 'audio/mp4',
  '.ogg': 'audio/ogg',
  '.aac': 'audio/aac',
  '.opus': 'audio/opus',
  '.webm': 'audio/webm',
};

function formatSec(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const total = Math.floor(seconds);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function normKey(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function mergeServerCatalog(
  itunesList: CatalogSearchResult[],
  deezerList: CatalogSearchResult[]
): CatalogSearchResult[] {
  const bySig = new Map<string, CatalogSearchResult>();
  for (const item of [...itunesList, ...deezerList]) {
    const cleanTitle = normKey(
      item.title.replace(
        /\s*[\(\[](?:feat\.?|ft\.?|with|remaster(?:ed)?|radio edit)[^\)\]]*[\)\]]/gi,
        ''
      )
    );
    const primaryArtist = normKey(item.artist.split(/[,&]/)[0] || item.artist);
    const sig = `${cleanTitle}::${primaryArtist}`;
    const existing = bySig.get(sig);
    if (!existing) {
      bySig.set(sig, { ...item, providerSources: [item.source] });
      continue;
    }

    const providers = Array.from(
      new Set([...(existing.providerSources || []), item.source])
    );
    bySig.set(sig, {
      ...existing,
      deezerId: existing.deezerId ?? item.deezerId,
      itunesId: existing.itunesId ?? item.itunesId,
      genre: existing.genre || item.genre,
      releaseYear: existing.releaseYear || item.releaseYear,
      coverUrl:
        existing.coverUrl.includes('600x600') || !item.coverUrl
          ? existing.coverUrl
          : item.coverUrl,
      previewUrl: existing.previewUrl || item.previewUrl,
      fallbackPreviewUrl:
        existing.fallbackPreviewUrl ||
        (item.previewUrl && item.previewUrl !== existing.previewUrl
          ? item.previewUrl
          : undefined),
      providerSources: providers,
    });
  }
  return Array.from(bySig.values());
}

function scanLocalMusicDir(): Array<{
  filename: string;
  sizeBytes: number;
  url: string;
  addedAt: string;
}> {
  if (!fs.existsSync(MUSIC_DIR)) {
    return [];
  }
  const entries = fs.readdirSync(MUSIC_DIR, { withFileTypes: true });
  const results: Array<{
    filename: string;
    sizeBytes: number;
    url: string;
    addedAt: string;
  }> = [];

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const ext = path.extname(entry.name).toLowerCase();
    if (!AUDIO_EXTENSIONS.has(ext)) continue;
    const fullPath = path.join(MUSIC_DIR, entry.name);
    const stat = fs.statSync(fullPath);
    results.push({
      filename: entry.name,
      sizeBytes: stat.size,
      url: `/api/local-music/stream/${encodeURIComponent(entry.name)}`,
      addedAt: stat.mtime.toISOString(),
    });
  }
  return results;
}

async function searchDeezer(
  query: string,
  limit = 20
): Promise<CatalogSearchResult[]> {
  const res = await fetch(
    `https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=${limit}`,
    { signal: AbortSignal.timeout(4500) }
  );
  if (!res.ok) throw new Error(`Deezer HTTP ${res.status}`);
  const data = (await res.json()) as {
    data?: Array<{
      id: number;
      title: string;
      duration: number;
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
    }>;
  };
  return (data.data || [])
    .filter((item) => item.title && item.artist?.name)
    .map((item) => ({
      externalId: `dz-${item.id}`,
      deezerId: item.id,
      title: item.title,
      artist: item.artist?.name || 'Artiste inconnu',
      album: item.album?.title || item.title,
      durationSec: item.duration || 180,
      durationLabel: formatSec(item.duration || 180),
      explicit: Boolean(item.explicit_lyrics),
      coverUrl:
        item.album?.cover_big ||
        item.album?.cover_xl ||
        item.album?.cover_medium ||
        '',
      previewUrl: item.preview || '',
      releaseYear: item.release_date?.slice(0, 4),
      source: 'deezer' as const,
      providerSources: ['deezer'],
    }));
}

async function fetchDeezerChart(limit = 15): Promise<CatalogSearchResult[]> {
  const res = await fetch(
    `https://api.deezer.com/chart/0/tracks?limit=${limit}`,
    { signal: AbortSignal.timeout(4500) }
  );
  if (!res.ok) throw new Error(`Deezer Chart HTTP ${res.status}`);
  const data = (await res.json()) as {
    data?: Array<{
      id: number;
      title: string;
      duration: number;
      explicit_lyrics?: boolean;
      preview?: string;
      artist?: { name?: string };
      album?: { title?: string; cover_medium?: string; cover_big?: string };
    }>;
  };
  return (data.data || [])
    .filter((item) => item.title && item.artist?.name)
    .map((item) => ({
      externalId: `dz-${item.id}`,
      deezerId: item.id,
      title: item.title,
      artist: item.artist?.name || 'Artiste inconnu',
      album: item.album?.title || item.title,
      durationSec: item.duration || 180,
      durationLabel: formatSec(item.duration || 180),
      explicit: Boolean(item.explicit_lyrics),
      coverUrl: item.album?.cover_big || item.album?.cover_medium || '',
      previewUrl: item.preview || '',
      source: 'deezer' as const,
      providerSources: ['deezer'],
    }));
}

async function searchItunes(
  query: string,
  limit = 20
): Promise<CatalogSearchResult[]> {
  const res = await fetch(
    `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&entity=song&country=FR&limit=${limit}`,
    { signal: AbortSignal.timeout(4500) }
  );
  if (!res.ok) throw new Error(`iTunes HTTP ${res.status}`);
  const data = (await res.json()) as {
    results?: Array<{
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
    }>;
  };
  return (data.results || [])
    .filter((item) => item.trackName && item.artistName)
    .map((item) => {
      const sec = Math.round((item.trackTimeMillis || 180000) / 1000);
      return {
        externalId: `it-${item.trackId}`,
        itunesId: item.trackId,
        title: item.trackName || '',
        artist: item.artistName || '',
        album: item.collectionName || item.trackName || '',
        durationSec: sec,
        durationLabel: formatSec(sec),
        explicit: item.trackExplicitness === 'explicit',
        coverUrl: item.artworkUrl100
          ? item.artworkUrl100.replace('100x100bb', '600x600bb')
          : '',
        previewUrl: item.previewUrl || '',
        genre: item.primaryGenreName,
        releaseYear: item.releaseDate?.slice(0, 4),
        source: 'itunes' as const,
        providerSources: ['itunes'],
      };
    });
}

async function findYoutubeVideoIds(query: string): Promise<string[]> {
  const res = await fetch(
    'https://www.youtube.com/youtubei/v1/search?prettyPrint=false',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(4500),
      body: JSON.stringify({
        context: {
          client: {
            clientName: 'WEB',
            clientVersion: '2.20240726.00.00',
            hl: 'fr',
            gl: 'FR',
          },
        },
        query,
      }),
    }
  );
  if (!res.ok) return [];
  const text = await res.text();
  const matches = [...text.matchAll(/"videoId":"([a-zA-Z0-9_-]{11})"/g)].map(
    (m) => m[1]
  );
  const candidates = [...new Set(matches)].slice(0, 5);
  const verified = await Promise.all(
    candidates.map(async (id) => {
      try {
        const oe = await fetch(
          `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`,
          { signal: AbortSignal.timeout(2500) }
        );
        return oe.ok ? id : null;
      } catch {
        return null;
      }
    })
  );
  return verified.filter((x): x is string => Boolean(x)).slice(0, 4);
}

async function createServer() {
  const app = express();
  app.disable('x-powered-by');

  // Lightweight zero-dependency Gzip compression for JSON API payloads > 1 KB
  app.use('/api', (req, res, next) => {
    const acceptEnc = String(req.headers['accept-encoding'] || '');
    if (!acceptEnc.includes('gzip')) {
      next();
      return;
    }
    const origJson = res.json.bind(res);
    res.json = ((body: unknown) => {
      const serialized = JSON.stringify(body);
      if (serialized.length < 1024) {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        return res.send(serialized);
      }
      const compressed = zlib.gzipSync(Buffer.from(serialized, 'utf-8'));
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Encoding', 'gzip');
      res.setHeader('Vary', 'Accept-Encoding');
      res.setHeader('Content-Length', compressed.length);
      return res.send(compressed);
    }) as typeof res.json;
    next();
  });

  app.get('/api/health', (_req, res) => {
    const localFiles = scanLocalMusicDir();
    res.json({
      ok: true,
      mode: process.env.SPOTLOCAL_DESKTOP === '1' ? 'desktop' : 'web',
      apis: ['apple-itunes', 'deezer', 'youtube-oembed'],
      musicDir: MUSIC_DIR,
      localCount: localFiles.length,
    });
  });

  app.get('/api/download/exe-status', (_req, res) => {
    const exeExists = fs.existsSync(EXE_PATH);
    const zipExists = fs.existsSync(EXE_ZIP_PATH);
    if (!exeExists) {
      res.json({
        available: false,
        filename: 'SpotLocal-Portable.exe',
        sizeBytes: 0,
        zipAvailable: false,
        zipSizeBytes: 0,
        updatedAt: null,
      });
      return;
    }
    const stat = fs.statSync(EXE_PATH);
    const zipStat = zipExists ? fs.statSync(EXE_ZIP_PATH) : null;
    res.json({
      available: true,
      filename: 'SpotLocal-Portable.exe',
      sizeBytes: stat.size,
      zipAvailable: zipExists,
      zipSizeBytes: zipStat ? zipStat.size : 0,
      updatedAt: stat.mtime.toISOString(),
    });
  });

  const streamStaticFileWithRange = (
    req: express.Request,
    res: express.Response,
    filePath: string,
    contentType: string,
    downloadName?: string
  ) => {
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: 'Fichier introuvable' });
      return;
    }
    const stat = fs.statSync(filePath);
    const total = stat.size;
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = Number.parseInt(parts[0], 10);
      const end = parts[1]
        ? Math.min(Number.parseInt(parts[1], 10), total - 1)
        : total - 1;
      if (
        !Number.isFinite(start) ||
        !Number.isFinite(end) ||
        start < 0 ||
        start >= total ||
        end < start
      ) {
        res.status(416).setHeader('Content-Range', `bytes */${total}`).end();
        return;
      }
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${total}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': end - start + 1,
        'Content-Type': contentType,
      });
      fs.createReadStream(filePath, { start, end }).pipe(res);
      return;
    }

    const headers: Record<string, string | number> = {
      'Content-Type': contentType,
      'Content-Length': total,
      'Accept-Ranges': 'bytes',
    };
    if (downloadName) {
      headers['Content-Disposition'] = `attachment; filename="${downloadName}"`;
    }
    res.writeHead(200, headers);
    fs.createReadStream(filePath).pipe(res);
  };

  app.get('/api/download/exe', (req, res) => {
    streamStaticFileWithRange(
      req,
      res,
      EXE_PATH,
      'application/octet-stream',
      'SpotLocal-Portable.exe'
    );
  });

  app.get('/api/download/exe-zip', (req, res) => {
    streamStaticFileWithRange(
      req,
      res,
      EXE_ZIP_PATH,
      'application/zip',
      'SpotLocal-Portable-Windows.zip'
    );
  });

  app.get('/api/music/youtube', async (req, res) => {
    const q = String(req.query.q || '').trim();
    if (!q) {
      res.json({ videoIds: [] });
      return;
    }
    const cacheKey = q.toLowerCase();
    const cached = youtubeIdsCache.get(cacheKey);
    if (cached) {
      res.json({ videoIds: cached, cached: true });
      return;
    }
    try {
      const videoIds = await findYoutubeVideoIds(`${q} audio`);
      if (videoIds.length > 0) {
        youtubeIdsCache.set(cacheKey, videoIds);
      }
      res.json({ videoIds });
    } catch {
      res.json({ videoIds: [] });
    }
  });

  app.get('/api/music/youtube-meta', async (req, res) => {
    const id = String(req.query.id || '').trim();
    if (!/^[a-zA-Z0-9_-]{11}$/.test(id)) {
      res.status(400).json({ error: 'Identifiant YouTube invalide' });
      return;
    }
    const cached = youtubeMetaCache.get(id);
    if (cached) {
      res.json(cached);
      return;
    }
    try {
      const oe = await fetch(
        `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${encodeURIComponent(id)}&format=json`,
        { signal: AbortSignal.timeout(4000) }
      );
      if (!oe.ok) {
        res.status(404).json({ error: 'Métadonnées YouTube introuvables' });
        return;
      }
      const data = (await oe.json()) as {
        title?: string;
        author_name?: string;
        thumbnail_url?: string;
      };
      const payload = {
        title: data.title || `Vidéo YouTube (${id})`,
        author_name: data.author_name || 'YouTube',
        thumbnail_url:
          data.thumbnail_url || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      };
      youtubeMetaCache.set(id, payload);
      res.json(payload);
    } catch {
      res
        .status(502)
        .json({ error: 'Impossible de résoudre la vidéo YouTube' });
    }
  });

  // Parallel Apple iTunes + Deezer Search
  app.get('/api/music/search', async (req, res) => {
    const q = String(req.query.q || '').trim();
    if (!q) {
      res.json({ results: [], deezer: [], itunes: [] });
      return;
    }
    const cacheKey = normKey(q);
    const cached = searchApiCache.get(cacheKey);
    if (cached) {
      res.json({ ...cached, cached: true });
      return;
    }

    const [dzSettled, itSettled] = await Promise.allSettled([
      searchDeezer(q, 20),
      searchItunes(q, 20),
    ]);

    const deezer = dzSettled.status === 'fulfilled' ? dzSettled.value : [];
    const itunes = itSettled.status === 'fulfilled' ? itSettled.value : [];

    if (deezer.length === 0 && itunes.length === 0) {
      res.status(502).json({
        results: [],
        deezer: [],
        itunes: [],
        error: 'Catalogues Apple et Deezer momentanément indisponibles',
      });
      return;
    }

    const results = mergeServerCatalog(itunes, deezer);
    const payload: SearchApiPayload = { results, deezer, itunes };
    searchApiCache.set(cacheKey, payload);
    res.json(payload);
  });

  // Parallel Apple iTunes + Deezer Live Charts
  app.get('/api/music/charts', async (_req, res) => {
    const cached = chartsApiCache.get('top-fr');
    if (cached) {
      res.json({ results: cached, cached: true });
      return;
    }

    const [dzChart, itTop] = await Promise.allSettled([
      fetchDeezerChart(15),
      searchItunes('Stromae Angèle The Weeknd Dua Lipa Billie Eilish', 15),
    ]);

    const dzList = dzChart.status === 'fulfilled' ? dzChart.value : [];
    const itList = itTop.status === 'fulfilled' ? itTop.value : [];
    const merged = mergeServerCatalog(itList, dzList).slice(0, 18);

    if (merged.length > 0) {
      chartsApiCache.set('top-fr', merged);
    }
    res.json({ results: merged });
  });

  // Parallel Apple iTunes + Deezer Preview Stream Resolver
  app.get('/api/music/resolve', async (req, res) => {
    const q = String(req.query.q || '').trim();
    if (!q) {
      res.status(400).json({ error: 'Paramètre q manquant' });
      return;
    }
    const cacheKey = normKey(q);
    const cached = previewCache.get(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }

    const [itSettled, dzSettled] = await Promise.allSettled([
      searchItunes(q, 6),
      searchDeezer(q, 6),
    ]);

    const itHit =
      itSettled.status === 'fulfilled'
        ? itSettled.value.find((x) => x.previewUrl)
        : undefined;
    const dzHit =
      dzSettled.status === 'fulfilled'
        ? dzSettled.value.find((x) => x.previewUrl)
        : undefined;

    if (!itHit && !dzHit) {
      res.status(502).json({ previewUrl: '', coverUrl: '' });
      return;
    }

    const primary = itHit || dzHit!;
    const secondary = itHit && dzHit ? dzHit : undefined;
    const payload = {
      previewUrl: primary.previewUrl,
      fallbackPreviewUrl: secondary?.previewUrl,
      coverUrl: primary.coverUrl || secondary?.coverUrl || '',
      deezerId: dzHit?.deezerId,
      itunesId: itHit?.itunesId,
      provider: (itHit ? 'itunes' : 'deezer') as 'itunes' | 'deezer',
    };
    previewCache.set(cacheKey, payload);
    res.json(payload);
  });

  app.get('/api/local-music', (_req, res) => {
    res.json({
      musicDir: MUSIC_DIR,
      files: scanLocalMusicDir(),
    });
  });

  app.post(
    '/api/local-music/upload',
    express.raw({ limit: '100mb', type: '*/*' }),
    (req, res) => {
      try {
        const rawName = String(req.query.filename || 'piste-locale.mp3');
        const safeName = path.basename(rawName).replace(/[<>:"/\\|?*]+/g, '_');
        const ext = path.extname(safeName).toLowerCase();
        if (!AUDIO_EXTENSIONS.has(ext)) {
          res.status(400).json({ error: 'Format audio non pris en charge' });
          return;
        }
        if (!fs.existsSync(MUSIC_DIR)) {
          fs.mkdirSync(MUSIC_DIR, { recursive: true });
        }
        const dest = path.join(MUSIC_DIR, safeName);
        const body = req.body;
        if (!Buffer.isBuffer(body) || body.length === 0) {
          res.status(400).json({ error: 'Fichier vide' });
          return;
        }
        fs.writeFileSync(dest, body);
        res.json({
          filename: safeName,
          sizeBytes: body.length,
          url: `/api/local-music/stream/${encodeURIComponent(safeName)}`,
        });
      } catch (err) {
        res.status(500).json({
          error:
            err instanceof Error ? err.message : 'Erreur sauvegarde locale',
        });
      }
    }
  );

  app.get('/api/local-music/stream/:filename', (req, res) => {
    const safeName = path.basename(req.params.filename);
    const fullPath = path.join(MUSIC_DIR, safeName);
    const ext = path.extname(safeName).toLowerCase();
    const contentType = MIME_MAP[ext] || 'application/octet-stream';
    streamStaticFileWithRange(req, res, fullPath, contentType);
  });

  // Ensure unmatched /api/* routes always return JSON 404 instead of SPA HTML
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Endpoint API introuvable' });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        allowedHosts: true,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(ROOT_DIR, 'dist');
    app.use(
      express.static(distDir, {
        maxAge: '1d',
        setHeaders: (res, filePath) => {
          if (filePath.endsWith('index.html')) {
            res.setHeader('Cache-Control', 'no-cache');
          }
        },
      })
    );
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, BIND_HOST, () => {
    console.log(`SpotLocal server running on http://${BIND_HOST}:${PORT}`);
  });
}

createServer().catch((err) => {
  console.error('Failed to start SpotLocal server:', err);
  process.exit(1);
});
