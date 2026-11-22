import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT_DIR = process.env.SPOTLOCAL_APP_ROOT
  ? path.resolve(process.env.SPOTLOCAL_APP_ROOT)
  : import.meta.url
    ? path.dirname(fileURLToPath(import.meta.url))
    : process.cwd();

const PORT = Number(process.env.PORT || 3000);
const MUSIC_DIR = process.env.SPOTLOCAL_MUSIC_DIR
  ? path.resolve(process.env.SPOTLOCAL_MUSIC_DIR)
  : path.resolve(ROOT_DIR, 'music');
const EXE_PATH = path.resolve(ROOT_DIR, 'release', 'SpotLocal-Portable.exe');
const EXE_ZIP_PATH = path.resolve(ROOT_DIR, 'release', 'SpotLocal-Portable-Windows.zip');

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

interface CatalogSearchResult {
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

async function searchDeezer(query: string): Promise<CatalogSearchResult[]> {
  const res = await fetch(
    `https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=18`
  );
  if (!res.ok) throw new Error(`Deezer HTTP ${res.status}`);
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
      title: item.title,
      artist: item.artist?.name || 'Artiste inconnu',
      album: item.album?.title || item.title,
      durationSec: item.duration || 180,
      durationLabel: formatSec(item.duration || 180),
      explicit: Boolean(item.explicit_lyrics),
      coverUrl: item.album?.cover_medium || item.album?.cover_big || '',
      previewUrl: item.preview || '',
      source: 'deezer' as const,
    }));
}

async function searchItunes(query: string): Promise<CatalogSearchResult[]> {
  const res = await fetch(
    `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&country=FR&limit=18`
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
    }>;
  };
  return (data.results || [])
    .filter((item) => item.trackName && item.artistName)
    .map((item) => {
      const sec = Math.round((item.trackTimeMillis || 180000) / 1000);
      return {
        externalId: `it-${item.trackId}`,
        title: item.trackName || '',
        artist: item.artistName || '',
        album: item.collectionName || item.trackName || '',
        durationSec: sec,
        durationLabel: formatSec(sec),
        explicit: item.trackExplicitness === 'explicit',
        coverUrl: item.artworkUrl100
          ? item.artworkUrl100.replace('100x100bb', '400x400bb')
          : '',
        previewUrl: item.previewUrl || '',
        source: 'itunes' as const,
      };
    });
}

async function findYoutubeVideoIds(query: string): Promise<string[]> {
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
  const candidates = [...new Set(matches)].slice(0, 6);
  const verified = await Promise.all(
    candidates.map(async (id) => {
      try {
        const oe = await fetch(
          `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`,
          { signal: AbortSignal.timeout(3000) }
        );
        return oe.ok ? id : null;
      } catch {
        return null;
      }
    })
  );
  return verified.filter((x): x is string => Boolean(x)).slice(0, 4);
}

const ALLOWED_STREAM_DOMAINS = [
  'dailymotion.com',
  'dmcdn.net',
  'soundcloud.com',
  'soundcloud.cloud',
  'sndcdn.com',
];

function isAllowedStreamUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'https:') return false;
    const host = parsed.hostname.toLowerCase();
    return ALLOWED_STREAM_DOMAINS.some(
      (domain) => host === domain || host.endsWith(`.${domain}`)
    );
  } catch {
    return false;
  }
}

let cachedScClientId = '';
let cachedScClientIdAt = 0;

async function getSoundCloudClientId(): Promise<string> {
  if (cachedScClientId && Date.now() - cachedScClientIdAt < 1000 * 60 * 60) {
    return cachedScClientId;
  }
  try {
    const pageRes = await fetch('https://soundcloud.com/search/sounds?q=music', {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      signal: AbortSignal.timeout(6000),
    });
    if (!pageRes.ok) return cachedScClientId;
    const html = await pageRes.text();
    const scripts = [
      ...html.matchAll(/https:\/\/a-v2\.sndcdn\.com\/assets\/[^"]+\.js/g),
    ].map((m) => m[0]);
    for (const sUrl of scripts.reverse()) {
      const jsRes = await fetch(sUrl, { signal: AbortSignal.timeout(5000) });
      if (!jsRes.ok) continue;
      const js = await jsRes.text();
      const match = js.match(/client_id:"([a-zA-Z0-9]{20,40})"/);
      if (match) {
        cachedScClientId = match[1];
        cachedScClientIdAt = Date.now();
        return cachedScClientId;
      }
    }
  } catch {
    // Ignore client_id extraction failure
  }
  return cachedScClientId;
}

interface ResolvedFullStream {
  kind: 'hls' | 'audio';
  url: string;
  durationSec?: number;
  source: 'dailymotion' | 'soundcloud';
}

async function resolveDailymotionStream(
  dmId: string
): Promise<ResolvedFullStream | null> {
  try {
    const res = await fetch(
      `https://www.dailymotion.com/player/metadata/video/${encodeURIComponent(dmId)}`,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        signal: AbortSignal.timeout(6000),
      }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      duration?: number;
      error?: unknown;
      qualities?: Record<string, Array<{ type?: string; url?: string }>>;
    };
    if (data.error || !data.qualities) return null;
    const autoList = data.qualities.auto || [];
    const m3u8Entry = autoList.find((q) => q.url);
    if (!m3u8Entry?.url || !isAllowedStreamUrl(m3u8Entry.url)) return null;
    return {
      kind: 'hls',
      url: `/api/music/hls-proxy?url=${encodeURIComponent(m3u8Entry.url)}`,
      durationSec: data.duration,
      source: 'dailymotion',
    };
  } catch {
    return null;
  }
}

async function resolveSoundCloudStream(
  scId: number
): Promise<ResolvedFullStream | null> {
  try {
    const clientId = await getSoundCloudClientId();
    if (!clientId) return null;
    const res = await fetch(
      `https://api-v2.soundcloud.com/tracks/${scId}?client_id=${encodeURIComponent(clientId)}`,
      { signal: AbortSignal.timeout(6000) }
    );
    if (!res.ok) return null;
    const track = (await res.json()) as {
      duration?: number;
      policy?: string;
      media?: {
        transcodings?: Array<{
          url?: string;
          snipped?: boolean;
          format?: { protocol?: string; mime_type?: string };
        }>;
      };
    };
    if (track.policy === 'SNIP') return null;
    const transcodings = track.media?.transcodings || [];
    const progressive = transcodings.find(
      (c) => !c.snipped && c.format?.protocol === 'progressive' && c.url
    );
    const hls = transcodings.find(
      (c) => !c.snipped && c.format?.protocol === 'hls' && c.url
    );
    const chosen = progressive || hls;
    if (!chosen?.url) return null;

    const streamRes = await fetch(
      `${chosen.url}?client_id=${encodeURIComponent(clientId)}`,
      { signal: AbortSignal.timeout(6000) }
    );
    if (!streamRes.ok) return null;
    const streamData = (await streamRes.json()) as { url?: string };
    if (!streamData.url || !isAllowedStreamUrl(streamData.url)) return null;

    const isHls = chosen.format?.protocol === 'hls';
    return {
      kind: isHls ? 'hls' : 'audio',
      url: `/api/music/hls-proxy?url=${encodeURIComponent(streamData.url)}`,
      durationSec: track.duration ? Math.round(track.duration / 1000) : undefined,
      source: 'soundcloud',
    };
  } catch {
    return null;
  }
}

function normMatchText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const BANNED_STREAM_RE =
  /\b(karaoke|instrumental|playback|backing track|piano tutorial|guitar lesson|reacts?|reaction|interview|teaser|trailer|parody|parodie|tutoriel|episode)\b/i;

async function searchFullStreamDynamic(
  title: string,
  artist: string,
  expectedDurationSec: number
): Promise<ResolvedFullStream | null> {
  const firstArtist = artist.split(',')[0].trim();
  const cleanTitle = title
    .replace(/\s*[\(\[](?:feat\.?|ft\.?|with|remaster(?:ed)?|live|deluxe|bonus track)[^\)\]]*[\)\]]/gi, '')
    .replace(/\s*-\s*(?:Electric Version|Remaster(?:ed)?(?:\s*\d{4})?|\d{4}\s*Remaster(?:ed)?)/gi, '')
    .replace(/\s*\(1\)/g, '')
    .replace(/\s+(?:feat\.?|ft\.?)\s+.+$/i, '')
    .trim();
  const titleWords = normMatchText(cleanTitle)
    .split(' ')
    .filter((w) => w.length >= 3);
  const artistWords = normMatchText(firstArtist)
    .split(' ')
    .filter((w) => w.length >= 3);

  try {
    const dmRes = await fetch(
      `https://api.dailymotion.com/videos?search=${encodeURIComponent(
        `${firstArtist} ${cleanTitle}`
      )}&fields=id,title,duration&limit=12`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (dmRes.ok) {
      const dmData = (await dmRes.json()) as {
        list?: Array<{ id: string; title: string; duration: number }>;
      };
      const hits = (dmData.list || []).filter((v) => {
        if (BANNED_STREAM_RE.test(v.title)) return false;
        if (v.duration < 60) return false;
        if (
          expectedDurationSec > 60 &&
          Math.abs(v.duration - expectedDurationSec) > 75
        ) {
          return false;
        }
        const n = normMatchText(v.title);
        const hasTitle =
          titleWords.length > 0 && titleWords.every((w) => n.includes(w));
        const hasArtist =
          n.includes(normMatchText(firstArtist)) ||
          (artistWords.length > 0 && artistWords.every((w) => n.includes(w)));
        return hasTitle && hasArtist;
      });
      hits.sort(
        (a, b) =>
          Math.abs(a.duration - expectedDurationSec) -
          Math.abs(b.duration - expectedDurationSec)
      );
      if (hits[0]) {
        const resolved = await resolveDailymotionStream(hits[0].id);
        if (resolved) return resolved;
      }
    }
  } catch {
    // Continue to SoundCloud
  }

  try {
    const clientId = await getSoundCloudClientId();
    if (clientId) {
      const scRes = await fetch(
        `https://api-v2.soundcloud.com/search/tracks?q=${encodeURIComponent(
          `${cleanTitle} ${firstArtist}`
        )}&client_id=${encodeURIComponent(clientId)}&limit=12`,
        { signal: AbortSignal.timeout(5000) }
      );
      if (scRes.ok) {
        const scData = (await scRes.json()) as {
          collection?: Array<{
            id: number;
            title?: string;
            duration?: number;
            policy?: string;
            user?: { username?: string };
            media?: {
              transcodings?: Array<{
                snipped?: boolean;
                format?: { protocol?: string };
              }>;
            };
          }>;
        };
        const hits = (scData.collection || []).filter((item) => {
          const dur = Math.round((item.duration || 0) / 1000);
          if (item.policy === 'SNIP' || dur < 60) return false;
          if (
            expectedDurationSec > 60 &&
            Math.abs(dur - expectedDurationSec) > 90
          ) {
            return false;
          }
          const openTc = (item.media?.transcodings || []).some(
            (tc) =>
              !tc.snipped &&
              (tc.format?.protocol === 'progressive' ||
                tc.format?.protocol === 'hls')
          );
          if (!openTc || BANNED_STREAM_RE.test(item.title || '')) return false;
          const blob = normMatchText(
            `${item.title || ''} ${item.user?.username || ''}`
          );
          const hasTitle =
            titleWords.length > 0 && titleWords.every((w) => blob.includes(w));
          const hasArtist =
            blob.includes(normMatchText(firstArtist)) ||
            (artistWords.length > 0 &&
              artistWords.every((w) => blob.includes(w)));
          return hasTitle && hasArtist;
        });
        hits.sort(
          (a, b) =>
            Math.abs((a.duration || 0) / 1000 - expectedDurationSec) -
            Math.abs((b.duration || 0) / 1000 - expectedDurationSec)
        );
        if (hits[0]) {
          const resolved = await resolveSoundCloudStream(hits[0].id);
          if (resolved) return resolved;
        }
      }
    }
  } catch {
    // Fallback
  }

  return null;
}

function rewriteM3u8Content(content: string, baseUrl: string): string {
  const lines = content.split(/\r?\n/);
  return lines
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return line;
      if (trimmed.startsWith('#')) {
        return line.replace(/URI="([^"]+)"/g, (_m, uri: string) => {
          try {
            const abs = new URL(uri, baseUrl).href;
            return `URI="/api/music/hls-proxy?url=${encodeURIComponent(abs)}"`;
          } catch {
            return `URI="${uri}"`;
          }
        });
      }
      try {
        const abs = new URL(trimmed, baseUrl).href;
        return `/api/music/hls-proxy?url=${encodeURIComponent(abs)}`;
      } catch {
        return line;
      }
    })
    .join('\n');
}

async function createServer() {
  const app = express();

  app.get('/api/health', (_req, res) => {
    const localFiles = scanLocalMusicDir();
    res.json({
      ok: true,
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

  const streamDownloadFile = (
    req: express.Request,
    res: express.Response,
    filePath: string,
    downloadName: string,
    contentType: string
  ) => {
    if (!fs.existsSync(filePath)) {
      res.status(404).send(`Fichier ${downloadName} introuvable.`);
      return;
    }
    const stat = fs.statSync(filePath);
    const total = stat.size;
    const startParam = req.query.start !== undefined ? Number(req.query.start) : null;
    const endParam = req.query.end !== undefined ? Number(req.query.end) : null;

    if (
      startParam !== null &&
      endParam !== null &&
      Number.isInteger(startParam) &&
      Number.isInteger(endParam) &&
      startParam >= 0 &&
      endParam >= startParam &&
      startParam < total
    ) {
      const clampedEnd = Math.min(endParam, total - 1);
      const len = clampedEnd - startParam + 1;
      res.writeHead(200, {
        'Content-Type': 'application/octet-stream',
        'Content-Length': len,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'no-store',
      });
      fs.createReadStream(filePath, { start: startParam, end: clampedEnd }).pipe(res);
      return;
    }

    const range = req.headers.range;
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = Number.parseInt(parts[0], 10);
      const end = parts[1] ? Math.min(Number.parseInt(parts[1], 10), total - 1) : total - 1;
      if (!Number.isFinite(start) || start < 0 || start >= total || end < start) {
        res.status(416).setHeader('Content-Range', `bytes */${total}`).end();
        return;
      }
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${total}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': end - start + 1,
        'Content-Type': contentType,
        'Cache-Control': 'no-store',
      });
      fs.createReadStream(filePath, { start, end }).pipe(res);
      return;
    }

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${downloadName}"`,
      'Content-Length': total,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'no-store',
    });
    fs.createReadStream(filePath).pipe(res);
  };

  app.get('/api/download/exe', (req, res) => {
    streamDownloadFile(
      req,
      res,
      EXE_PATH,
      'SpotLocal-Portable.exe',
      'application/octet-stream'
    );
  });

  app.get('/api/download/exe-zip', (req, res) => {
    streamDownloadFile(
      req,
      res,
      EXE_ZIP_PATH,
      'SpotLocal-Portable-Windows.zip',
      'application/zip'
    );
  });

  app.get('/api/music/full-stream', async (req, res) => {
    const dmId = String(req.query.dmId || '').trim();
    const scIdRaw = String(req.query.scId || '').trim();
    const scId = scIdRaw ? Number.parseInt(scIdRaw, 10) : 0;
    const title = String(req.query.title || '').trim();
    const artist = String(req.query.artist || '').trim();
    const durationSec = Number.parseInt(String(req.query.durationSec || '180'), 10) || 180;

    let result: ResolvedFullStream | null = null;
    if (dmId) {
      result = await resolveDailymotionStream(dmId);
    }
    if (!result && scId > 0) {
      result = await resolveSoundCloudStream(scId);
    }
    if (!result && title && artist) {
      result = await searchFullStreamDynamic(title, artist, durationSec);
    }

    if (!result) {
      res.status(404).json({ error: 'Flux complet introuvable' });
      return;
    }
    res.json(result);
  });

  app.get('/api/music/hls-proxy', async (req, res) => {
    const targetUrl = String(req.query.url || '').trim();
    if (!targetUrl || !isAllowedStreamUrl(targetUrl)) {
      res.status(400).send('URL de flux non autorisée');
      return;
    }
    try {
      const upstreamHeaders: Record<string, string> = {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      };
      const rangeHeader = req.headers.range;
      if (rangeHeader && !targetUrl.includes('.m3u8')) {
        upstreamHeaders.Range = rangeHeader;
      }

      const upstream = await fetch(targetUrl, {
        headers: upstreamHeaders,
        signal: AbortSignal.timeout(15000),
      });
      if (!upstream.ok && upstream.status !== 206) {
        res.status(upstream.status).send('Flux amont indisponible');
        return;
      }

      const contentType = upstream.headers.get('content-type') || '';
      const isPlaylist =
        contentType.includes('mpegurl') ||
        targetUrl.includes('.m3u8');

      if (isPlaylist) {
        const text = await upstream.text();
        if (text.trimStart().startsWith('#EXTM3U')) {
          const rewritten = rewriteM3u8Content(text, upstream.url || targetUrl);
          res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
          res.setHeader('Cache-Control', 'no-cache');
          res.send(rewritten);
          return;
        }
        res.setHeader('Content-Type', contentType || 'text/plain');
        res.send(text);
        return;
      }

      const arrayBuf = await upstream.arrayBuffer();
      const buf = Buffer.from(arrayBuf);
      if (contentType) {
        res.setHeader('Content-Type', contentType);
      }
      const acceptRanges = upstream.headers.get('accept-ranges');
      const contentRange = upstream.headers.get('content-range');
      if (acceptRanges) res.setHeader('Accept-Ranges', acceptRanges);
      if (contentRange) res.setHeader('Content-Range', contentRange);
      res.setHeader('Content-Length', buf.length);
      res.setHeader('Cache-Control', 'public, max-age=300');
      res.status(upstream.status).send(buf);
    } catch {
      res.status(502).send('Erreur proxy flux audio');
    }
  });

  app.get('/api/music/youtube', async (req, res) => {
    const q = String(req.query.q || '').trim();
    if (!q) {
      res.json({ videoIds: [] });
      return;
    }
    try {
      const videoIds = await findYoutubeVideoIds(`${q} audio`);
      res.json({ videoIds });
    } catch {
      res.json({ videoIds: [] });
    }
  });

  app.get('/api/music/search', async (req, res) => {
    const q = String(req.query.q || '').trim();
    if (!q) {
      res.json({ results: [] });
      return;
    }
    try {
      let results = await searchDeezer(q);
      if (results.length === 0) {
        results = await searchItunes(q);
      }
      res.json({ results });
    } catch {
      try {
        const fallback = await searchItunes(q);
        res.json({ results: fallback });
      } catch (err) {
        res.status(502).json({
          results: [],
          error: err instanceof Error ? err.message : 'Erreur de recherche musicale',
        });
      }
    }
  });

  app.get('/api/music/resolve', async (req, res) => {
    const q = String(req.query.q || '').trim();
    if (!q) {
      res.status(400).json({ error: 'Paramètre q manquant' });
      return;
    }
    try {
      const deezer = await searchDeezer(q);
      const hit = deezer.find((item) => item.previewUrl);
      if (hit) {
        res.json({ previewUrl: hit.previewUrl, coverUrl: hit.coverUrl });
        return;
      }
      const itunes = await searchItunes(q);
      const itHit = itunes.find((item) => item.previewUrl);
      res.json({
        previewUrl: itHit?.previewUrl || '',
        coverUrl: itHit?.coverUrl || '',
      });
    } catch {
      res.status(502).json({ previewUrl: '', coverUrl: '' });
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
          error: err instanceof Error ? err.message : 'Erreur sauvegarde locale',
        });
      }
    }
  );

  app.get('/api/local-music/stream/:filename', (req, res) => {
    const safeName = path.basename(req.params.filename);
    const fullPath = path.join(MUSIC_DIR, safeName);
    if (!fs.existsSync(fullPath)) {
      res.status(404).send('Fichier introuvable');
      return;
    }

    const stat = fs.statSync(fullPath);
    const ext = path.extname(safeName).toLowerCase();
    const contentType = MIME_MAP[ext] || 'application/octet-stream';
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = Number.parseInt(parts[0], 10);
      const end = parts[1] ? Number.parseInt(parts[1], 10) : stat.size - 1;
      const chunkSize = end - start + 1;
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${stat.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': contentType,
      });
      fs.createReadStream(fullPath, { start, end }).pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': stat.size,
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes',
      });
      fs.createReadStream(fullPath).pipe(res);
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(ROOT_DIR, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SpotLocal server running on http://localhost:${PORT}`);
  });
}

createServer().catch((err) => {
  console.error('Failed to start SpotLocal server:', err);
  process.exit(1);
});
