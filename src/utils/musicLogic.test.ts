import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  extractMultipleYouTubeVideoIds,
  extractYouTubeVideoId,
  filterTracks,
  formatTime,
  getNextTrackIndex,
  getPreviousTrackIndex,
  getYouTubeSearchUrl,
  getYouTubeWatchUrl,
  matchLocalFilenameToTrack,
  parseAudioFilename,
  parseYouTubeTitleAndChannel,
  searchRankedTracks,
  sortTracks,
  totalDurationLabel,
} from './musicLogic';
import { DEFAULT_PLAYLISTS, SEED_TRACKS } from '../data/initialLibrary';
import { catalogStore } from './catalogEngine';
import type { Track } from '../types/music';

const SAMPLE: Track[] = [
  {
    id: '1',
    title: 'Tout oublier',
    artist: 'Angèle',
    album: 'Brol',
    genre: 'Scène Française',
    addedAt: 'Catalogue YouTube',
    durationSec: 202,
    durationLabel: '3:22',
    coverUrl: '',
    previewUrl: '',
    liked: false,
    youtubeVideoIds: ['Fy1xQSiLx8U'],
  },
  {
    id: '2',
    title: 'Papaoutai',
    artist: 'Stromae',
    album: 'Racine carrée',
    genre: 'Scène Française',
    addedAt: 'Catalogue YouTube',
    durationSec: 232,
    durationLabel: '3:52',
    coverUrl: '',
    previewUrl: '',
    liked: false,
    youtubeVideoIds: ['oiKj0Z_Xnjc'],
  },
  {
    id: '3',
    title: 'Basique',
    artist: 'Orelsan',
    album: 'La fête est finie',
    genre: 'Rap FR',
    addedAt: 'Catalogue YouTube',
    durationSec: 245,
    durationLabel: '4:05',
    coverUrl: '',
    previewUrl: '',
    liked: false,
    youtubeVideoIds: ['2bjk26RwjyU'],
  },
];

test('formatTime formats seconds cleanly', () => {
  assert.equal(formatTime(0), '0:00');
  assert.equal(formatTime(65), '1:05');
  assert.equal(formatTime(232.9), '3:52');
  assert.equal(formatTime(-10), '0:00');
});

test('filterTracks matches multi-word, title, artist, genre, and accented text', () => {
  assert.equal(filterTracks(SAMPLE, 'angele').length, 1);
  assert.equal(filterTracks(SAMPLE, 'stromae papaoutai').length, 1);
  assert.equal(filterTracks(SAMPLE, 'Racine').length, 1);
  assert.equal(filterTracks(SAMPLE, '', 'Rap FR').length, 1);
  assert.equal(filterTracks(SAMPLE, '   ').length, 3);
});

test('searchRankedTracks ranks exact artist/title match first', () => {
  const ranked = searchRankedTracks(SAMPLE, 'Stromae', 10);
  assert.equal(ranked[0]?.artist, 'Stromae');
});

test('sortTracks sorts by duration without mutating original array', () => {
  const sorted = sortTracks(SAMPLE, 'duration', 'desc');
  assert.equal(sorted[0].id, '3');
  assert.equal(sorted[2].id, '1');
  assert.equal(SAMPLE[0].id, '1');
});

test('totalDurationLabel sums track durations accurately', () => {
  assert.equal(totalDurationLabel(SAMPLE), '11 min 19 s');
});

test('getNextTrackIndex handles repeat modes and shuffle', () => {
  assert.equal(getNextTrackIndex(2, 3, false, 'off'), -1);
  assert.equal(getNextTrackIndex(2, 3, false, 'all'), 0);
  assert.equal(getNextTrackIndex(1, 3, false, 'one'), 1);
});

test('getPreviousTrackIndex respects wrap around on repeat all', () => {
  assert.equal(getPreviousTrackIndex(0, 3, 'off'), 0);
  assert.equal(getPreviousTrackIndex(0, 3, 'all'), 2);
});

test('parseAudioFilename splits artist and title', () => {
  assert.deepEqual(parseAudioFilename('Stromae - Papaoutai.mp3'), {
    artist: 'Stromae',
    title: 'Papaoutai',
  });
  assert.deepEqual(parseAudioFilename('ma_chanson_perso.flac'), {
    artist: 'Fichier local',
    title: 'ma chanson perso',
  });
});

test('matchLocalFilenameToTrack matches filenames to catalog tracks', () => {
  const matched = matchLocalFilenameToTrack('Stromae - Papaoutai.mp3', SAMPLE);
  assert.equal(matched?.id, '2');
});

test('YouTube URL helpers format official watch and search links', () => {
  assert.equal(
    getYouTubeWatchUrl('oiKj0Z_Xnjc'),
    'https://www.youtube.com/watch?v=oiKj0Z_Xnjc'
  );
  assert.equal(
    getYouTubeSearchUrl('Stromae Papaoutai'),
    'https://www.youtube.com/results?search_query=Stromae%20Papaoutai'
  );
});

test('extractYouTubeVideoId parses share links, watch URLs, YT Music, Shorts, and ignores plain search words', () => {
  assert.equal(
    extractYouTubeVideoId('https://youtu.be/oiKj0Z_Xnjc?si=abc123XYZ'),
    'oiKj0Z_Xnjc'
  );
  assert.equal(
    extractYouTubeVideoId('https://www.youtube.com/watch?v=Fy1xQSiLx8U&t=42s'),
    'Fy1xQSiLx8U'
  );
  assert.equal(extractYouTubeVideoId('Stromae Papaoutai'), null);
});

test('extractMultipleYouTubeVideoIds deduplicates batch pasted links', () => {
  const pasted = `
    https://youtu.be/oiKj0Z_Xnjc?si=123
    https://www.youtube.com/watch?v=Fy1xQSiLx8U
    https://music.youtube.com/watch?v=oiKj0Z_Xnjc
  `;
  assert.deepEqual(extractMultipleYouTubeVideoIds(pasted), [
    'oiKj0Z_Xnjc',
    'Fy1xQSiLx8U',
  ]);
});

test('parseYouTubeTitleAndChannel cleans official tags and splits Artist - Title', () => {
  assert.deepEqual(
    parseYouTubeTitleAndChannel(
      'Stromae - Papaoutai (Official Music Video)',
      'StromaeVEVO'
    ),
    { artist: 'Stromae', title: 'Papaoutai' }
  );
});

test('332k+ embedded catalog integrity, clean first-visit state, and instant CatalogStore queries', () => {
  assert.equal(DEFAULT_PLAYLISTS.length, 0);
  assert.equal(SEED_TRACKS.length, 1600);
  assert.ok(SEED_TRACKS.every((t) => t.liked === false));

  const catalogDir = path.resolve(process.cwd(), 'public/catalog');
  const manifest = JSON.parse(
    fs.readFileSync(path.join(catalogDir, 'manifest.json'), 'utf8')
  ) as { totalTracks: number; shards: string[] };

  assert.ok(manifest.totalTracks >= 330000);
  let shardRowSum = 0;
  for (const shardFile of manifest.shards) {
    const rows = JSON.parse(
      fs.readFileSync(path.join(catalogDir, shardFile), 'utf8')
    ) as unknown[];
    shardRowSum += rows.length;
  }
  assert.equal(SEED_TRACKS.length + shardRowSum, manifest.totalTracks);

  // Verify CatalogStore fast query on core
  const res = catalogStore.queryCatalog(
    { query: 'Stromae', limit: 20 },
    { customTracks: [], likedIds: new Set(), trackOverrides: {} }
  );
  assert.ok(res.totalMatches >= 1);
  assert.equal(res.tracks[0]?.sourceKind, 'youtube');
  assert.ok(res.tracks[0]?.coverUrl.includes('/mqdefault.jpg'));

  // Verify real artwork & mosaic cover helpers
  const stromaeCover = catalogStore.getArtistCoverUrl('Stromae');
  assert.ok(stromaeCover && stromaeCover.startsWith('https://i.ytimg.com/vi/'));
  assert.equal(catalogStore.getCatalogSampleCovers(4).length, 4);
  assert.equal(catalogStore.getGenreSampleCovers('Pop', 4).length, 4);
  assert.equal(catalogStore.getMoodSampleCovers(1, 4).length, 4);

  const artistsRes = catalogStore.queryArtists('Stromae', 5);
  assert.ok(artistsRes.items[0]?.coverUrl?.startsWith('https://i.ytimg.com/vi/'));
});
