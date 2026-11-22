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

const youtubeIdsCache = new TtlCache<string[]>(60 * 60 * 1000, 300);
const youtubeSearchCache = new TtlCache<
  Array<{
    videoId: string;
    title: string;
    artist: string;
    durationSec: number;
    durationLabel: string;
    coverUrl: string;
  }>
>(30 * 60 * 1000, 400);
const youtubeMetaCache = new TtlCache<{
  title: string;
  author_name: string;
  thumbnail_url: string;
}>(60 * 60 * 1000, 300);

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

function parseDurationTextToSec(text?: string): number {
  if (!text) return 0;
  const parts = text
    .trim()
    .split(':')
    .map((p) => Number.parseInt(p, 10));
  if (parts.some((n) => !Number.isFinite(n))) return 0;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
}

async function searchYouTubeCatalogRich(query: string) {
  const res = await fetch(
    'https://www.youtube.com/youtubei/v1/search?prettyPrint=false',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(5000),
      body: JSON.stringify({
        context: {
          client: {
            clientName: 'WEB',
            clientVersion: '2.20250201.00.00',
            hl: 'fr',
            gl: 'FR',
          },
        },
        query,
      }),
    }
  );
  if (!res.ok) return [];
  const data = (await res.json()) as Record<string, unknown>;

  const results: Array<{
    videoId: string;
    title: string;
    artist: string;
    durationSec: number;
    durationLabel: string;
    coverUrl: string;
  }> = [];
  const seen = new Set<string>();

  const walk = (node: unknown) => {
    if (!node || typeof node !== 'object' || results.length >= 24) return;
    if (Array.isArray(node)) {
      for (const child of node) walk(child);
      return;
    }
    const obj = node as Record<string, unknown>;
    if (obj.videoRenderer && typeof obj.videoRenderer === 'object') {
      const vr = obj.videoRenderer as Record<string, unknown>;
      const vid = typeof vr.videoId === 'string' ? vr.videoId : '';
      if (/^[A-Za-z0-9_-]{11}$/.test(vid) && !seen.has(vid)) {
        const titleRuns = (
          vr.title as { runs?: Array<{ text?: string }> } | undefined
        )?.runs;
        const rawTitle = titleRuns?.map((r) => r.text || '').join('') || '';
        const ownerRuns = (
          (vr.ownerText || vr.longBylineText) as
            | { runs?: Array<{ text?: string }> }
            | undefined
        )?.runs;
        const rawArtist = (ownerRuns?.[0]?.text || 'YouTube').replace(
          / - Topic$/i,
          ''
        );
        const lenStr =
          (vr.lengthText as { simpleText?: string } | undefined)?.simpleText ||
          '';
        const durSec = parseDurationTextToSec(lenStr);
        if (rawTitle && durSec >= 30 && durSec <= 1800) {
          seen.add(vid);
          results.push({
            videoId: vid,
            title: rawTitle,
            artist: rawArtist,
            durationSec: durSec,
            durationLabel: lenStr,
            coverUrl: `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
          });
        }
      }
    }
    for (const val of Object.values(obj)) {
      walk(val);
    }
  };

  walk(data);
  return results;
}

async function createServer() {
  const app = express();
  app.disable('x-powered-by');

  app.use('/api', (req, res, next) => {
    const acceptEnc = String(req.headers['accept-encoding'] || '');
    if (!acceptEnc.includes('gzip')) {
      next();
      return;
    }
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
      apis: ['youtube-iframe', 'youtube-oembed', 'local-mp3'],
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

  app.get('/api/youtube/search', async (req, res) => {
    const q = String(req.query.q || '').trim();
    if (q.length < 2) {
      res.json({ items: [] });
      return;
    }
    const key = q.toLowerCase();
    const cached = youtubeSearchCache.get(key);
    if (cached) {
      res.json({ items: cached, cached: true });
      return;
    }
    try {
      const items = await searchYouTubeCatalogRich(q);
      if (items.length > 0) {
        youtubeSearchCache.set(key, items);
      }
      res.json({ items });
    } catch {
      res.json({ items: [] });
    }
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
