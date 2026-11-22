import type { SortKey, Track } from '../types/music';
import { SEED_TRACKS } from '../data/initialLibrary';
import { formatTime } from './musicLogic';

export interface GenreMeta {
  index: number;
  name: string;
  subtitle: string;
  accent: string;
  glowClass: string;
}

export interface MoodMeta {
  bit: number;
  index: number;
  name: string;
  shortLabel: string;
  subtitle: string;
  accent: string;
  gradient: string;
}

export const CATALOG_GENRES: GenreMeta[] = [
  {
    index: 0,
    name: 'Scène Française',
    subtitle: 'Stromae, Angèle, Céline Dion, Indochine, Clara Luciani, Pomme…',
    accent: '#10b981',
    glowClass: 'from-emerald-500/25 via-teal-900/20 to-[#11131a]',
  },
  {
    index: 1,
    name: 'Rap FR',
    subtitle: 'Ninho, Damso, Orelsan, PNL, Tiakola, Hamza, Werenoi, Booba, PLK…',
    accent: '#f59e0b',
    glowClass: 'from-amber-500/25 via-orange-950/25 to-[#11131a]',
  },
  {
    index: 2,
    name: 'Pop',
    subtitle: 'The Weeknd, Billie Eilish, Dua Lipa, Taylor Swift, Bruno Mars…',
    accent: '#ec4899',
    glowClass: 'from-pink-500/25 via-fuchsia-950/25 to-[#11131a]',
  },
  {
    index: 3,
    name: 'Hip-Hop & Rap US',
    subtitle: 'Kendrick Lamar, Eminem, Drake, Travis Scott, Future, Kanye West…',
    accent: '#f97316',
    glowClass: 'from-orange-500/25 via-red-950/20 to-[#11131a]',
  },
  {
    index: 4,
    name: 'Rock & Alternative',
    subtitle: 'Queen, Nirvana, Pink Floyd, Arctic Monkeys, Linkin Park, Muse…',
    accent: '#ef4444',
    glowClass: 'from-rose-500/25 via-red-950/25 to-[#11131a]',
  },
  {
    index: 5,
    name: 'Électro & Dance',
    subtitle: 'Daft Punk, Justice, Avicii, Fred again.., David Guetta,Kavinsky…',
    accent: '#06b6d4',
    glowClass: 'from-cyan-500/25 via-sky-950/25 to-[#11131a]',
  },
  {
    index: 6,
    name: 'R&B & Soul',
    subtitle: 'SZA, Frank Ocean, Beyoncé, Alicia Keys, Marvin Gaye, Usher…',
    accent: '#a855f7',
    glowClass: 'from-purple-500/25 via-violet-950/25 to-[#11131a]',
  },
  {
    index: 7,
    name: 'Afro & Reggae',
    subtitle: 'Burna Boy, Rema, Tems, Ayra Starr, Bob Marley, Aya Nakamura…',
    accent: '#84cc16',
    glowClass: 'from-lime-500/25 via-emerald-950/25 to-[#11131a]',
  },
  {
    index: 8,
    name: 'Latino & Brésil',
    subtitle: 'Bad Bunny, Karol G, Shakira, Feid, Rosalía, J Balvin, Anitta…',
    accent: '#eab308',
    glowClass: 'from-yellow-500/25 via-amber-950/25 to-[#11131a]',
  },
  {
    index: 9,
    name: 'K-Pop & J-Pop',
    subtitle: 'BTS, BLACKPINK, NewJeans, Stray Kids, YOASOBI, Ado, Kenshi Yonezu…',
    accent: '#f43f5e',
    glowClass: 'from-rose-400/25 via-indigo-950/25 to-[#11131a]',
  },
  {
    index: 10,
    name: 'Metal & Hard Rock',
    subtitle: 'Metallica, Iron Maiden, System Of A Down, Slipknot, Gojira, Rammstein…',
    accent: '#dc2626',
    glowClass: 'from-red-600/25 via-zinc-900/40 to-[#11131a]',
  },
  {
    index: 11,
    name: 'Jazz, Blues & Folk',
    subtitle: 'Miles Davis, Nina Simone, Norah Jones, Hozier, Johnny Cash, B.B. King…',
    accent: '#d97706',
    glowClass: 'from-amber-600/25 via-stone-900/35 to-[#11131a]',
  },
  {
    index: 12,
    name: 'Classique & Cinéma',
    subtitle: 'Hans Zimmer, Ludovico Einaudi, Yann Tiersen, Chopin, Joe Hisaishi…',
    accent: '#6366f1',
    glowClass: 'from-indigo-500/25 via-slate-900/35 to-[#11131a]',
  },
  {
    index: 13,
    name: 'Oriental & Monde',
    subtitle: 'Fairuz, Amr Diab, Khaled, Rachid Taha, Tinariwen, Soolking…',
    accent: '#14b8a6',
    glowClass: 'from-teal-500/25 via-emerald-950/25 to-[#11131a]',
  },
];

export const CATALOG_MOODS: MoodMeta[] = [
  {
    index: 0,
    bit: 1 << 0,
    name: 'Chill & Détente',
    shortLabel: 'Chill',
    subtitle: 'Lo-fi, acoustique doux et vibrations posées',
    accent: '#38bdf8',
    gradient: 'from-sky-500/25 via-indigo-950/30 to-[#10121a]',
  },
  {
    index: 1,
    bit: 1 << 1,
    name: 'Énergie & Boost',
    shortLabel: 'Énergie',
    subtitle: 'Rythmes soutenus et refrains survoltés',
    accent: '#f59e0b',
    gradient: 'from-amber-500/25 via-orange-950/30 to-[#10121a]',
  },
  {
    index: 2,
    bit: 1 << 2,
    name: 'Sport & Workout',
    shortLabel: 'Workout',
    subtitle: 'BPM intenses pour dépasser ses limites',
    accent: '#ef4444',
    gradient: 'from-red-500/25 via-rose-950/30 to-[#10121a]',
  },
  {
    index: 3,
    bit: 1 << 3,
    name: 'Focus & Étude',
    shortLabel: 'Focus',
    subtitle: 'Concentration profonde, piano, ambient & code',
    accent: '#818cf8',
    gradient: 'from-indigo-500/25 via-slate-950/35 to-[#10121a]',
  },
  {
    index: 4,
    bit: 1 << 4,
    name: 'Soirée & Club',
    shortLabel: 'Soirée',
    subtitle: 'Hymnes dancefloor, house, afrobeats & bangers',
    accent: '#e879f9',
    gradient: 'from-fuchsia-500/25 via-purple-950/30 to-[#10121a]',
  },
  {
    index: 5,
    bit: 1 << 5,
    name: 'Bonne Humeur',
    shortLabel: 'Feel Good',
    subtitle: 'Soleil, groove positif et sourires immédiats',
    accent: '#22c55e',
    gradient: 'from-emerald-500/25 via-teal-950/30 to-[#10121a]',
  },
  {
    index: 6,
    bit: 1 << 6,
    name: 'Route & Trajet',
    shortLabel: 'Roadtrip',
    subtitle: 'Classiques à chanter et sons d’autoroute',
    accent: '#06b6d4',
    gradient: 'from-cyan-500/25 via-blue-950/30 to-[#10121a]',
  },
  {
    index: 7,
    bit: 1 << 7,
    name: 'Romance',
    shortLabel: 'Romance',
    subtitle: 'Ballades soul, R&B feutré et duos intemporels',
    accent: '#fb7185',
    gradient: 'from-rose-500/25 via-pink-950/30 to-[#10121a]',
  },
  {
    index: 8,
    bit: 1 << 8,
    name: 'Gaming',
    shortLabel: 'Gaming',
    subtitle: 'Synthwave, phonk, drum & bass et bandes-son épiques',
    accent: '#a855f7',
    gradient: 'from-violet-500/25 via-purple-950/30 to-[#10121a]',
  },
  {
    index: 9,
    bit: 1 << 9,
    name: 'Nuit & Mélancolie',
    shortLabel: 'Late Night',
    subtitle: 'Écoutes nocturnes, émotions brutes et calme',
    accent: '#64748b',
    gradient: 'from-slate-500/25 via-zinc-950/40 to-[#10121a]',
  },
];

const GENRE_NAME_TO_IDX = new Map(CATALOG_GENRES.map((g) => [g.name, g.index]));

export interface UserLibraryOverlay {
  customTracks: Track[];
  likedIds: Set<string>;
  trackOverrides: Record<string, Partial<Track>>;
}

type ShardTuple = [
  videoId: string,
  title: string,
  artistIdx: number,
  durationSec: number,
  genreIdx: number,
  moodMask: number,
  backupVideoId?: string,
];

interface CatalogManifest {
  version: number;
  totalTracks: number;
  genres: string[];
  moods: string[];
  artists: string[];
  shards: string[];
}

const NON_ASCII_RE = /[^\x00-\x7f]/;

export function foldSearchText(str: string): string {
  const lower = str.toLowerCase();
  if (!NON_ASCII_RE.test(lower)) return lower.trim();
  return lower
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function resolveCatalogUrl(relPath: string): string {
  const base =
    typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL
      ? import.meta.env.BASE_URL
      : '/';
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  return `${normalizedBase}${relPath.replace(/^\//, '')}`;
}

const MAX_CAPACITY = 360_000;

class CatalogStore {
  private count = 0;
  private videoIds: string[] = [];
  private backupIds: (string | undefined)[] = [];
  private titles: string[] = [];
  private normTitles: string[] = [];

  private artistNames: string[] = [];
  private normArtists: string[] = [];
  private artistCounts: number[] = [];
  private artistNameMap = new Map<string, number>();

  private artistIdxCol = new Uint32Array(MAX_CAPACITY);
  private durationCol = new Uint16Array(MAX_CAPACITY);
  private genreIdxCol = new Uint8Array(MAX_CAPACITY);
  private moodMaskCol = new Uint16Array(MAX_CAPACITY);

  private idToIndex = new Map<string, number>();
  private genreCounts = new Array<number>(CATALOG_GENRES.length).fill(0);
  private moodCounts = new Array<number>(CATALOG_MOODS.length).fill(0);
  private totalDurationSec = 0;

  private shardsLoaded = false;
  private loadingPromise: Promise<void> | null = null;

  constructor() {
    this.ingestCoreTracks(SEED_TRACKS);
  }

  private internArtist(name: string): number {
    const clean = name.trim() || 'Artiste inconnu';
    let idx = this.artistNameMap.get(clean);
    if (idx === undefined) {
      idx = this.artistNames.length;
      this.artistNameMap.set(clean, idx);
      this.artistNames.push(clean);
      this.normArtists.push(foldSearchText(clean));
      this.artistCounts.push(0);
    }
    return idx;
  }

  private ingestCoreTracks(seeds: Track[]): void {
    for (const t of seeds) {
      const vids = t.youtubeVideoIds || [];
      const primary = vids[0];
      if (!primary || this.count >= MAX_CAPACITY) continue;
      const id = `yt-${primary}`;
      if (this.idToIndex.has(id)) continue;

      const idx = this.count++;
      const aIdx = this.internArtist(t.artist);
      const gIdx = GENRE_NAME_TO_IDX.get(t.genre || 'Pop') ?? 2;
      const mMask = t.moodMask || 0;
      const dur = Math.min(65535, Math.max(1, t.durationSec || 210));

      this.videoIds.push(primary);
      this.backupIds.push(vids[1]);
      this.titles.push(t.title);
      this.normTitles.push(foldSearchText(t.title));

      this.artistIdxCol[idx] = aIdx;
      this.durationCol[idx] = dur;
      this.genreIdxCol[idx] = gIdx;
      this.moodMaskCol[idx] = mMask;

      this.idToIndex.set(id, idx);
      this.artistCounts[aIdx]++;
      this.genreCounts[gIdx]++;
      this.totalDurationSec += dur;
      if (mMask) {
        for (let b = 0; b < CATALOG_MOODS.length; b++) {
          if (mMask & (1 << b)) this.moodCounts[b]++;
        }
      }
    }
  }

  private appendShard(
    tuples: ShardTuple[],
    manifestArtistMap: Uint32Array
  ): void {
    for (let i = 0; i < tuples.length; i++) {
      if (this.count >= MAX_CAPACITY) break;
      const row = tuples[i];
      const videoId = row[0];
      const id = `yt-${videoId}`;
      if (this.idToIndex.has(id)) continue;

      const idx = this.count++;
      const aIdx = manifestArtistMap[row[2]] ?? 0;
      const dur = Math.min(65535, Math.max(1, row[3] || 210));
      const gIdx = row[4] < CATALOG_GENRES.length ? row[4] : 2;
      const mMask = row[5] || 0;

      this.videoIds.push(videoId);
      this.backupIds.push(row[6]);
      this.titles.push(row[1]);
      this.normTitles.push(foldSearchText(row[1]));

      this.artistIdxCol[idx] = aIdx;
      this.durationCol[idx] = dur;
      this.genreIdxCol[idx] = gIdx;
      this.moodMaskCol[idx] = mMask;

      this.idToIndex.set(id, idx);
      this.artistCounts[aIdx]++;
      this.genreCounts[gIdx]++;
      this.totalDurationSec += dur;

      if (mMask) {
        for (let b = 0; b < CATALOG_MOODS.length; b++) {
          if (mMask & (1 << b)) this.moodCounts[b]++;
        }
      }
    }
  }

  public isFullyLoaded(): boolean {
    return this.shardsLoaded;
  }

  public async loadExtendedShards(
    onShardAppended?: (loadedCount: number, expectedTotal: number) => void
  ): Promise<void> {
    if (this.shardsLoaded) return;
    if (this.loadingPromise) return this.loadingPromise;
    if (typeof fetch === 'undefined') return;

    this.loadingPromise = (async () => {
      try {
        const manifestRes = await fetch(
          resolveCatalogUrl('catalog/manifest.json')
        );
        if (!manifestRes.ok) return;
        const manifest = (await manifestRes.json()) as CatalogManifest;
        if (!manifest || !Array.isArray(manifest.shards)) return;

        // Pre-map manifest artist dictionary once
        const manifestArtistMap = new Uint32Array(manifest.artists.length);
        for (let i = 0; i < manifest.artists.length; i++) {
          manifestArtistMap[i] = this.internArtist(manifest.artists[i]);
        }

        // Fetch shards in small parallel batches of 2 and ingest with frame yields
        for (let s = 0; s < manifest.shards.length; s += 2) {
          const batchNames = manifest.shards.slice(s, s + 2);
          const batchData = await Promise.all(
            batchNames.map((fname) =>
              fetch(resolveCatalogUrl(`catalog/${fname}`)).then((r) =>
                r.ok ? (r.json() as Promise<ShardTuple[]>) : []
              )
            )
          );

          for (const tuples of batchData) {
            if (tuples.length > 0) {
              this.appendShard(tuples, manifestArtistMap);
              onShardAppended?.(this.count, manifest.totalTracks);
              // Yield to browser main thread so animations & input stay at locked 60 FPS
              await new Promise((resolve) => setTimeout(resolve, 10));
            }
          }
        }

        this.shardsLoaded = true;
        onShardAppended?.(this.count, this.count);
      } catch {
        // Gracefully remain on core catalog if offline
      } finally {
        this.loadingPromise = null;
      }
    })();

    return this.loadingPromise;
  }

  public getCatalogCount(): number {
    return this.count;
  }

  public getArtistCount(): number {
    return this.artistNames.length;
  }

  public getTotalDurationHours(): number {
    return Math.round(this.totalDurationSec / 3600);
  }

  public getGenreCounts(): Record<string, number> {
    const out: Record<string, number> = {};
    for (let i = 0; i < CATALOG_GENRES.length; i++) {
      out[CATALOG_GENRES[i].name] = this.genreCounts[i];
    }
    return out;
  }

  public getMoodCounts(): Record<number, number> {
    const out: Record<number, number> = {};
    for (let i = 0; i < CATALOG_MOODS.length; i++) {
      out[CATALOG_MOODS[i].bit] = this.moodCounts[i];
    }
    return out;
  }

  public hasCatalogId(id: string): boolean {
    return this.idToIndex.has(id);
  }

  public hydrateIndex(idx: number, overlay: UserLibraryOverlay): Track {
    const videoId = this.videoIds[idx];
    const backup = this.backupIds[idx];
    const id = `yt-${videoId}`;
    const dur = this.durationCol[idx];
    const genreName = CATALOG_GENRES[this.genreIdxCol[idx]]?.name || 'Pop';
    const base: Track = {
      id,
      title: this.titles[idx],
      artist: this.artistNames[this.artistIdxCol[idx]] || 'Artiste',
      album: genreName,
      genre: genreName,
      moodMask: this.moodMaskCol[idx],
      addedAt: 'Catalogue YouTube',
      durationSec: dur,
      durationLabel: formatTime(dur),
      coverUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      previewUrl: '',
      explicit: false,
      liked: overlay.likedIds.has(id),
      youtubeVideoIds: backup ? [videoId, backup] : [videoId],
      sourceKind: 'youtube',
    };

    const ov = overlay.trackOverrides[id];
    return ov ? { ...base, ...ov, liked: overlay.likedIds.has(id) } : base;
  }

  public getTrackById(id: string, overlay: UserLibraryOverlay): Track | null {
    const custom = overlay.customTracks.find((t) => t.id === id);
    if (custom) {
      return { ...custom, liked: overlay.likedIds.has(id) };
    }
    const idx = this.idToIndex.get(id);
    if (idx === undefined) return null;
    return this.hydrateIndex(idx, overlay);
  }

  public findTrackByVideoId(
    videoId: string,
    overlay: UserLibraryOverlay
  ): Track | null {
    const custom = overlay.customTracks.find((t) =>
      t.youtubeVideoIds?.includes(videoId)
    );
    if (custom) return { ...custom, liked: overlay.likedIds.has(custom.id) };
    const idx = this.idToIndex.get(`yt-${videoId}`);
    if (idx !== undefined) return this.hydrateIndex(idx, overlay);
    return null;
  }

  public getTracksByIds(ids: string[], overlay: UserLibraryOverlay): Track[] {
    const customMap = new Map(overlay.customTracks.map((t) => [t.id, t]));
    const out: Track[] = [];
    for (const id of ids) {
      const c = customMap.get(id);
      if (c) {
        out.push({ ...c, liked: overlay.likedIds.has(id) });
        continue;
      }
      const idx = this.idToIndex.get(id);
      if (idx !== undefined) {
        out.push(this.hydrateIndex(idx, overlay));
      }
    }
    return out;
  }

  public getLikedTracks(overlay: UserLibraryOverlay): Track[] {
    const ids = Array.from(overlay.likedIds);
    return this.getTracksByIds(ids, overlay);
  }

  public getShelfTracks(
    genreName: string,
    limit: number,
    overlay: UserLibraryOverlay
  ): Track[] {
    const gIdx = GENRE_NAME_TO_IDX.get(genreName);
    if (gIdx === undefined) return [];
    const out: Track[] = [];
    for (let i = 0; i < this.count && out.length < limit; i++) {
      if (this.genreIdxCol[i] === gIdx) {
        out.push(this.hydrateIndex(i, overlay));
      }
    }
    return out;
  }

  public sampleRandomMix(
    options: { genre?: string; moodBit?: number; count?: number },
    overlay: UserLibraryOverlay
  ): Track[] {
    const count = options.count ?? 60;
    const gIdx =
      options.genre && options.genre !== 'all'
        ? GENRE_NAME_TO_IDX.get(options.genre)
        : undefined;
    const mBit = options.moodBit || 0;

    const matchingIndices: number[] = [];
    for (let i = 0; i < this.count; i++) {
      if (gIdx !== undefined && this.genreIdxCol[i] !== gIdx) continue;
      if (mBit !== 0 && (this.moodMaskCol[i] & mBit) === 0) continue;
      matchingIndices.push(i);
    }

    if (matchingIndices.length === 0) return [];

    // Partial Fisher-Yates sample of `count` tracks (O(count) swaps!)
    const take = Math.min(count, matchingIndices.length);
    const out: Track[] = [];
    for (let k = 0; k < take; k++) {
      const randIdx =
        k + Math.floor(Math.random() * (matchingIndices.length - k));
      const tmp = matchingIndices[k];
      matchingIndices[k] = matchingIndices[randIdx];
      matchingIndices[randIdx] = tmp;
      out.push(this.hydrateIndex(matchingIndices[k], overlay));
    }
    return out;
  }

  public queryArtists(
    query: string,
    limit = 80
  ): { totalArtists: number; items: Array<{ name: string; count: number }> } {
    const q = foldSearchText(query);
    const matches: Array<{ name: string; count: number }> = [];

    for (let i = 0; i < this.artistNames.length; i++) {
      const cnt = this.artistCounts[i];
      if (cnt === 0) continue;
      if (!q || this.normArtists[i].includes(q)) {
        matches.push({ name: this.artistNames[i], count: cnt });
      }
    }

    matches.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'fr'));
    return {
      totalArtists: matches.length,
      items: matches.slice(0, limit),
    };
  }

  public queryCatalog(
    params: {
      query?: string;
      genre?: string;
      moodBit?: number;
      artist?: string;
      sourceFilter?: 'all' | 'local' | 'youtube';
      sortField?: SortKey;
      sortAsc?: boolean;
      limit?: number;
    },
    overlay: UserLibraryOverlay
  ): {
    totalMatches: number;
    totalDurationSec: number;
    tracks: Track[];
  } {
    const limit = params.limit ?? 120;
    const rawQ = (params.query || '').trim();
    const qNorm = foldSearchText(rawQ);
    const tokens = qNorm ? qNorm.split(/\s+/).filter(Boolean) : [];
    const gIdx =
      params.genre && params.genre !== 'all'
        ? GENRE_NAME_TO_IDX.get(params.genre)
        : undefined;
    const mBit = params.moodBit || 0;
    const targetArtistNorm = params.artist
      ? foldSearchText(params.artist)
      : '';
    const sourceFilter = params.sourceFilter || 'all';
    const sortField = params.sortField || 'default';
    const sortAsc = params.sortAsc !== false;

    const customResults: Track[] = [];
    for (const c of overlay.customTracks) {
      const isLocal = Boolean(c.localFileKey || c.localServerUrl);
      if (sourceFilter === 'local' && !isLocal) continue;
      if (sourceFilter === 'youtube' && isLocal && !c.youtubeVideoIds?.length) {
        continue;
      }
      if (params.genre && params.genre !== 'all' && c.genre !== params.genre) {
        continue;
      }
      if (mBit !== 0 && ((c.moodMask || 0) & mBit) === 0) continue;
      if (
        targetArtistNorm &&
        !foldSearchText(c.artist).includes(targetArtistNorm)
      ) {
        continue;
      }
      if (tokens.length > 0) {
        const hay = foldSearchText(`${c.title} ${c.artist} ${c.album}`);
        if (!tokens.every((tok) => hay.includes(tok))) continue;
      }
      customResults.push({ ...c, liked: overlay.likedIds.has(c.id) });
    }

    if (sourceFilter === 'local') {
      // Check any seed track with a local override
      for (const [id, ov] of Object.entries(overlay.trackOverrides)) {
        if (!ov.localFileKey && !ov.localServerUrl) continue;
        const idx = this.idToIndex.get(id);
        if (idx !== undefined) {
          customResults.push(this.hydrateIndex(idx, overlay));
        }
      }
      const totalDur = customResults.reduce((acc, t) => acc + t.durationSec, 0);
      return {
        totalMatches: customResults.length,
        totalDurationSec: totalDur,
        tracks: customResults.slice(0, limit),
      };
    }

    // Fast path when no text query and default sort: O(limit) hydration, instant scan!
    if (tokens.length === 0 && sortField === 'default' && sortAsc) {
      let totalMatches = customResults.length;
      let totalDur = customResults.reduce((acc, t) => acc + t.durationSec, 0);
      const out: Track[] = [...customResults.slice(0, limit)];

      for (let i = 0; i < this.count; i++) {
        if (gIdx !== undefined && this.genreIdxCol[i] !== gIdx) continue;
        if (mBit !== 0 && (this.moodMaskCol[i] & mBit) === 0) continue;
        if (targetArtistNorm) {
          const aNorm = this.normArtists[this.artistIdxCol[i]];
          if (aNorm !== targetArtistNorm && !aNorm.includes(targetArtistNorm)) {
            continue;
          }
        }
        totalMatches++;
        totalDur += this.durationCol[i];
        if (out.length < limit) {
          out.push(this.hydrateIndex(i, overlay));
        }
      }

      return {
        totalMatches,
        totalDurationSec: totalDur,
        tracks: out,
      };
    }

    // Ranked search or custom column sort across all 112k tracks
    const matchedIndices: number[] = [];
    const scores: number[] = [];
    let totalDur = customResults.reduce((acc, t) => acc + t.durationSec, 0);

    for (let i = 0; i < this.count; i++) {
      if (gIdx !== undefined && this.genreIdxCol[i] !== gIdx) continue;
      if (mBit !== 0 && (this.moodMaskCol[i] & mBit) === 0) continue;

      const aNorm = this.normArtists[this.artistIdxCol[i]];
      if (
        targetArtistNorm &&
        aNorm !== targetArtistNorm &&
        !aNorm.includes(targetArtistNorm)
      ) {
        continue;
      }

      if (tokens.length > 0) {
        const tNorm = this.normTitles[i];
        let allFound = true;
        for (let k = 0; k < tokens.length; k++) {
          const tok = tokens[k];
          if (!tNorm.includes(tok) && !aNorm.includes(tok)) {
            allFound = false;
            break;
          }
        }
        if (!allFound) continue;

        if (sortField === 'default') {
          let sc = 0;
          if (tNorm === qNorm) sc += 140;
          else if (tNorm.startsWith(qNorm)) sc += 85;
          if (aNorm === qNorm) sc += 120;
          else if (aNorm.startsWith(qNorm)) sc += 75;
          for (let k = 0; k < tokens.length; k++) {
            if (aNorm.includes(tokens[k])) sc += 20;
            if (tNorm.includes(tokens[k])) sc += 15;
          }
          // Slight boost for core hits (lower index)
          if (i < 1600) sc += 18;
          scores.push(sc);
        }
      }

      matchedIndices.push(i);
      totalDur += this.durationCol[i];
    }

    const dir = sortAsc ? 1 : -1;
    const order = matchedIndices.map((_, pos) => pos);

    if (sortField === 'default' && tokens.length > 0) {
      order.sort((pA, pB) => scores[pB] - scores[pA] || matchedIndices[pA] - matchedIndices[pB]);
    } else if (sortField === 'title') {
      order.sort(
        (pA, pB) =>
          dir *
          this.normTitles[matchedIndices[pA]].localeCompare(
            this.normTitles[matchedIndices[pB]]
          )
      );
    } else if (sortField === 'artist') {
      order.sort(
        (pA, pB) =>
          dir *
          this.normArtists[this.artistIdxCol[matchedIndices[pA]]].localeCompare(
            this.normArtists[this.artistIdxCol[matchedIndices[pB]]]
          )
      );
    } else if (sortField === 'duration') {
      order.sort(
        (pA, pB) =>
          dir *
          (this.durationCol[matchedIndices[pA]] -
            this.durationCol[matchedIndices[pB]])
      );
    } else if (!sortAsc) {
      order.reverse();
    }

    const hydrated: Track[] = [...customResults.slice(0, limit)];
    for (let k = 0; k < order.length && hydrated.length < limit; k++) {
      hydrated.push(this.hydrateIndex(matchedIndices[order[k]], overlay));
    }

    return {
      totalMatches: customResults.length + matchedIndices.length,
      totalDurationSec: totalDur,
      tracks: hydrated,
    };
  }
}

export const catalogStore = new CatalogStore();
