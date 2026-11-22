import test from 'node:test';
import assert from 'node:assert/strict';
import {
  extractMultipleYouTubeVideoIds,
  extractYouTubeVideoId,
  filterTracks,
  formatTime,
  getNextTrackIndex,
  getPreviousTrackIndex,
  getTrackYouTubeWatchUrl,
  matchLocalFilenameToTrack,
  parseAudioFilename,
  parseYouTubeTitleAndChannel,
  searchRankedTracks,
  sortTracks,
  totalDurationLabel,
} from './musicLogic';
import { DEFAULT_PLAYLISTS, SEED_TRACKS } from '../data/initialLibrary';
import type { Track } from '../types/music';

const sampleTracks: Track[] = [
  {
    id: '1',
    title: 'The Sound of Silence - Electric Version',
    artist: 'Simon & Garfunkel',
    album: 'Sounds Of Silence',
    addedAt: 'Catalogue YouTube',
    durationLabel: '3:10',
    durationSec: 190,
    liked: false,
    coverUrl: 'https://i.ytimg.com/vi/4zLfCnGVeL4/hqdefault.jpg',
    previewUrl: '',
    youtubeVideoIds: ['4zLfCnGVeL4'],
    genre: 'Rock & Légendes',
  },
  {
    id: '2',
    title: 'La Quête',
    artist: 'Orelsan',
    album: 'Civilisation',
    addedAt: 'Catalogue YouTube',
    durationLabel: '4:04',
    durationSec: 244,
    liked: false,
    coverUrl: 'https://i.ytimg.com/vi/Aq1c1tG7hRU/hqdefault.jpg',
    previewUrl: '',
    youtubeVideoIds: ['Aq1c1tG7hRU'],
    genre: 'Rap FR',
  },
  {
    id: '3',
    title: 'Dream Is Collapsing',
    artist: 'Hans Zimmer',
    album: 'Inception',
    addedAt: 'Catalogue YouTube',
    durationLabel: '2:24',
    durationSec: 144,
    liked: false,
    coverUrl: 'https://i.ytimg.com/vi/imkpO12cR3s/hqdefault.jpg',
    previewUrl: '',
    youtubeVideoIds: ['imkpO12cR3s'],
    genre: 'Cinéma & Instrumental',
  },
];

test('formatTime formats seconds cleanly', () => {
  assert.equal(formatTime(0), '0:00');
  assert.equal(formatTime(65), '1:05');
  assert.equal(formatTime(190), '3:10');
  assert.equal(formatTime(-4), '0:00');
});

test('filterTracks matches multi-word, title, artist, genre, and accented text', () => {
  assert.equal(filterTracks(sampleTracks, 'orelsan quete').length, 1);
  assert.equal(filterTracks(sampleTracks, 'zimmer')[0]?.id, '3');
  assert.equal(filterTracks(sampleTracks, 'cinema')[0]?.id, '3');
  assert.equal(filterTracks(sampleTracks, '').length, 3);
});

test('searchRankedTracks ranks exact artist/title match first', () => {
  const ranked = searchRankedTracks(sampleTracks, 'Orelsan La Quête');
  assert.equal(ranked[0]?.id, '2');
});

test('sortTracks sorts by duration without mutating original array', () => {
  const sorted = sortTracks(sampleTracks, 'duration', 'asc');
  assert.deepEqual(
    sorted.map((t) => t.id),
    ['3', '1', '2']
  );
  assert.equal(sampleTracks[0].id, '1');
});

test('totalDurationLabel sums track durations accurately', () => {
  assert.equal(totalDurationLabel(sampleTracks), '9 min 38 s');
});

test('getNextTrackIndex handles repeat modes and shuffle', () => {
  assert.equal(getNextTrackIndex(0, 3, false, 'off'), 1);
  assert.equal(getNextTrackIndex(2, 3, false, 'off'), -1);
  assert.equal(getNextTrackIndex(2, 3, false, 'all'), 0);
  assert.equal(getNextTrackIndex(1, 3, false, 'one'), 1);
  const shuffled = getNextTrackIndex(1, 3, true, 'off', () => 0.4);
  assert.notEqual(shuffled, 1);
});

test('getPreviousTrackIndex respects wrap around on repeat all', () => {
  assert.equal(getPreviousTrackIndex(0, 3, 'off'), 0);
  assert.equal(getPreviousTrackIndex(0, 3, 'all'), 2);
  assert.equal(getPreviousTrackIndex(2, 3, 'off'), 1);
});

test('parseAudioFilename splits artist and title', () => {
  assert.deepEqual(parseAudioFilename('Bigflo & Oli - Dommage.mp3'), {
    artist: 'Bigflo & Oli',
    title: 'Dommage',
  });
  assert.deepEqual(parseAudioFilename('Starry_Night.wav'), {
    artist: 'Fichier local',
    title: 'Starry Night',
  });
});

test('matchLocalFilenameToTrack matches filenames to catalog tracks', () => {
  const m1 = matchLocalFilenameToTrack(
    'Hans Zimmer - Dream Is Collapsing.mp3',
    sampleTracks
  );
  assert.equal(m1?.id, '3');
  const m2 = matchLocalFilenameToTrack(
    'Orelsan - La Quete.flac',
    sampleTracks
  );
  assert.equal(m2?.id, '2');
  const m3 = matchLocalFilenameToTrack('Unknown_Track_XYZ.mp3', sampleTracks);
  assert.equal(m3, null);
});

test('YouTube URL helpers format official watch and search links', () => {
  const trackWithYt: Track = {
    ...sampleTracks[0]!,
    youtubeVideoIds: ['G_0d_voVayg'],
  };
  const trackWithoutYt: Track = {
    ...sampleTracks[1]!,
    youtubeVideoIds: [],
    searchQuery: 'Orelsan La Quete',
  };

  assert.equal(
    getTrackYouTubeWatchUrl(trackWithYt),
    'https://www.youtube.com/watch?v=G_0d_voVayg'
  );
  assert.equal(
    getTrackYouTubeWatchUrl(trackWithYt, 'custom12345'),
    'https://www.youtube.com/watch?v=custom12345'
  );
  assert.equal(
    getTrackYouTubeWatchUrl(trackWithoutYt),
    'https://www.youtube.com/results?search_query=Orelsan%20La%20Quete'
  );
});

test('extractYouTubeVideoId parses share links, watch URLs, YT Music, Shorts, and ignores plain search words', () => {
  assert.equal(
    extractYouTubeVideoId('https://youtu.be/4NRXx6U8ABQ?si=9xYzAbCdEf'),
    '4NRXx6U8ABQ'
  );
  assert.equal(extractYouTubeVideoId('youtu.be/oiKj0Z_Xnjc'), 'oiKj0Z_Xnjc');
  assert.equal(
    extractYouTubeVideoId(
      'https://www.youtube.com/watch?v=fJ9rUzIMcZQ&list=RDfJ9rUzIMcZQ'
    ),
    'fJ9rUzIMcZQ'
  );
  assert.equal(
    extractYouTubeVideoId(
      'https://music.youtube.com/watch?v=5NV6Rdv1a3I&feature=share'
    ),
    '5NV6Rdv1a3I'
  );
  assert.equal(
    extractYouTubeVideoId('https://www.youtube.com/shorts/V9PVRfjEBTI'),
    'V9PVRfjEBTI'
  );
  assert.equal(extractYouTubeVideoId('Californica'), null);
  assert.equal(
    extractYouTubeVideoId('4NRXx6U8ABQ', { allowRawId: true }),
    '4NRXx6U8ABQ'
  );
  assert.equal(extractYouTubeVideoId('yt:4NRXx6U8ABQ'), '4NRXx6U8ABQ');
});

test('extractMultipleYouTubeVideoIds deduplicates batch pasted links', () => {
  const input = `
    https://youtu.be/4NRXx6U8ABQ?si=123
    https://www.youtube.com/watch?v=oiKj0Z_Xnjc
    https://youtu.be/4NRXx6U8ABQ
  `;
  assert.deepEqual(extractMultipleYouTubeVideoIds(input), [
    '4NRXx6U8ABQ',
    'oiKj0Z_Xnjc',
  ]);
});

test('parseYouTubeTitleAndChannel cleans official tags and splits Artist - Title', () => {
  assert.deepEqual(
    parseYouTubeTitleAndChannel(
      'Stromae - Papaoutai (Clip Officiel)',
      'StromaeVEVO'
    ),
    { artist: 'Stromae', title: 'Papaoutai' }
  );
  assert.deepEqual(
    parseYouTubeTitleAndChannel(
      'Blinding Lights (Official Audio)',
      'The Weeknd - Topic'
    ),
    { artist: 'The Weeknd', title: 'Blinding Lights' }
  );
});

test('Initial catalog has 5000+ YouTube tracks, 0 pre-saved playlists, and 0 pre-liked tracks', () => {
  assert.equal(DEFAULT_PLAYLISTS.length, 0);
  assert.ok(SEED_TRACKS.length >= 5000);
  assert.equal(SEED_TRACKS.filter((t) => t.liked).length, 0);
  for (const t of SEED_TRACKS) {
    assert.ok(t.youtubeVideoIds && t.youtubeVideoIds.length >= 1);
    assert.match(t.youtubeVideoIds[0]!, /^[A-Za-z0-9_-]{11}$/);
  }
});
