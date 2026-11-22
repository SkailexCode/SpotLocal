import test from 'node:test';
import assert from 'node:assert/strict';
import {
  filterTracks,
  formatTime,
  getNextTrackIndex,
  getPreviousTrackIndex,
  matchLocalFilenameToTrack,
  parseAudioFilename,
  sortTracks,
  totalDurationLabel,
  getTrackYouTubeWatchUrl,
} from './musicLogic';
import type { Track } from '../types/music';

const sampleTracks: Track[] = [
  {
    id: '1',
    title: 'The Sound of Silence - Electric Version',
    artist: 'Simon & Garfunkel',
    album: 'Sounds Of Silence',
    addedAt: 'il y a 6 jours',
    durationLabel: '3:10',
    durationSec: 190,
    liked: true,
    coverUrl: '/covers/track-1.jpg',
    previewUrl: '',
  },
  {
    id: '2',
    title: 'Été avec toi',
    artist: 'Adèle Castillon',
    album: 'Été avec toi',
    addedAt: 'il y a 3 semaines',
    durationLabel: '3:07',
    durationSec: 187,
    liked: true,
    coverUrl: '/covers/track-11.jpg',
    previewUrl: '',
  },
  {
    id: '3',
    title: 'Dream Is Collapsing',
    artist: 'Hans Zimmer',
    album: 'Inception',
    addedAt: '29 août 2026',
    durationLabel: '2:24',
    durationSec: 144,
    liked: true,
    coverUrl: '/covers/track-26.jpg',
    previewUrl: '',
  },
];

test('formatTime formats seconds cleanly', () => {
  assert.equal(formatTime(0), '0:00');
  assert.equal(formatTime(65), '1:05');
  assert.equal(formatTime(190), '3:10');
  assert.equal(formatTime(-4), '0:00');
});

test('filterTracks matches title, artist, and accented text', () => {
  assert.equal(filterTracks(sampleTracks, 'ete avec').length, 1);
  assert.equal(filterTracks(sampleTracks, 'zimmer')[0]?.id, '3');
  assert.equal(filterTracks(sampleTracks, '').length, 3);
});

test('sortTracks sorts by duration without mutating original array', () => {
  const sorted = sortTracks(sampleTracks, 'duration', 'asc');
  assert.deepEqual(
    sorted.map((t) => t.id),
    ['3', '2', '1']
  );
  assert.equal(sampleTracks[0].id, '1');
});

test('totalDurationLabel sums track durations accurately', () => {
  assert.equal(totalDurationLabel(sampleTracks), '8 min 41 s');
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
  const m1 = matchLocalFilenameToTrack('Hans Zimmer - Dream Is Collapsing.mp3', sampleTracks);
  assert.equal(m1?.id, '3');
  const m2 = matchLocalFilenameToTrack('Adele Castillon - Ete avec toi.flac', sampleTracks);
  assert.equal(m2?.id, '2');
  const m3 = matchLocalFilenameToTrack('Unknown_Track_XYZ.mp3', sampleTracks);
  assert.equal(m3, null);
});

test('YouTube URL helpers format official watch and search links', () => {
  assert.equal(
    sampleTracks[0] ? sampleTracks[0].title : '',
    'The Sound of Silence - Electric Version'
  );
  const trackWithYt: Track = {
    ...sampleTracks[0]!,
    youtubeVideoIds: ['G_0d_voVayg'],
  };
  const trackWithoutYt: Track = {
    ...sampleTracks[1]!,
    youtubeVideoIds: [],
    searchQuery: 'Adele Castillon Ete avec toi',
  };

  assert.equal(
    getTrackYouTubeWatchUrl(trackWithYt),
    'https://www.youtube.com/watch?v=G_0d_voVayg'
  );
  assert.equal(
    getTrackYouTubeWatchUrl(trackWithYt, 'custom123'),
    'https://www.youtube.com/watch?v=custom123'
  );
  assert.equal(
    getTrackYouTubeWatchUrl(trackWithoutYt),
    'https://www.youtube.com/results?search_query=Adele%20Castillon%20Ete%20avec%20toi'
  );
});

