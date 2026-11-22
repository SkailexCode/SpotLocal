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
  isExpiredDeezerPreviewUrl,
  isTransientSignedStreamUrl,
  matchLocalFilenameToTrack,
  mergeAndScoreCatalogResults,
  parseAudioFilename,
  parseYouTubeTitleAndChannel,
  sortTracks,
  totalDurationLabel,
} from './musicLogic';
import type { SearchResultTrack, Track } from '../types/music';

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
    genre: 'Rock',
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
    genre: 'Scène Française',
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
    genre: 'Cinéma',
  },
];

test('formatTime formats seconds cleanly', () => {
  assert.equal(formatTime(0), '0:00');
  assert.equal(formatTime(65), '1:05');
  assert.equal(formatTime(190), '3:10');
  assert.equal(formatTime(-4), '0:00');
});

test('filterTracks matches title, artist, genre, and accented text', () => {
  assert.equal(filterTracks(sampleTracks, 'ete avec').length, 1);
  assert.equal(filterTracks(sampleTracks, 'zimmer')[0]?.id, '3');
  assert.equal(filterTracks(sampleTracks, 'cinema')[0]?.id, '3');
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
    getTrackYouTubeWatchUrl(trackWithYt, 'custom12345'),
    'https://www.youtube.com/watch?v=custom12345'
  );
  assert.equal(
    getTrackYouTubeWatchUrl(trackWithoutYt),
    'https://www.youtube.com/results?search_query=Adele%20Castillon%20Ete%20avec%20toi'
  );
});

test('extractYouTubeVideoId parses share links, watch URLs, YT Music, Shorts, and ignores plain search words', () => {
  assert.equal(
    extractYouTubeVideoId('https://youtu.be/4NRXx6U8ABQ?si=9xYzAbCdEf'),
    '4NRXx6U8ABQ'
  );
  assert.equal(
    extractYouTubeVideoId('youtu.be/oiKj0Z_Xnjc'),
    'oiKj0Z_Xnjc'
  );
  assert.equal(
    extractYouTubeVideoId('https://www.youtube.com/watch?v=fJ9rUzIMcZQ&list=RDfJ9rUzIMcZQ'),
    'fJ9rUzIMcZQ'
  );
  assert.equal(
    extractYouTubeVideoId('https://music.youtube.com/watch?v=5NV6Rdv1a3I&feature=share'),
    '5NV6Rdv1a3I'
  );
  assert.equal(
    extractYouTubeVideoId('https://www.youtube.com/shorts/V9PVRfjEBTI'),
    'V9PVRfjEBTI'
  );
  // Plain 11-char word in search bar should NOT be mistaken for YT ID unless allowRawId is true
  assert.equal(extractYouTubeVideoId('Californica'), null);
  assert.equal(extractYouTubeVideoId('4NRXx6U8ABQ', { allowRawId: true }), '4NRXx6U8ABQ');
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

test('isTransientSignedStreamUrl and isExpiredDeezerPreviewUrl detect expiring dzcdn tokens', () => {
  const nowMs = 1_800_000_000_000; // exp = 1800000000
  const expiredDzUrl =
    'https://cdnt-preview.dzcdn.net/stream/c-abc123.mp3?hdnea=exp=1799999000~acl=/stream/*~hmac=xyz';
  const validDzUrl =
    'https://cdnt-preview.dzcdn.net/stream/c-abc123.mp3?hdnea=exp=1800003600~acl=/stream/*~hmac=xyz';
  const appleUrl =
    'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview115/v4/track.m4a';

  assert.equal(isTransientSignedStreamUrl(expiredDzUrl), true);
  assert.equal(isTransientSignedStreamUrl(appleUrl), false);

  assert.equal(isExpiredDeezerPreviewUrl(expiredDzUrl, nowMs), true);
  assert.equal(isExpiredDeezerPreviewUrl(validDzUrl, nowMs), false);
  assert.equal(isExpiredDeezerPreviewUrl(appleUrl, nowMs), false);
});

test('mergeAndScoreCatalogResults fuses Apple + Deezer duplicates and demotes karaoke covers', () => {
  const rawItems: SearchResultTrack[] = [
    {
      externalId: 'dz-999',
      deezerId: 999,
      title: 'Papaoutai (Karaoke Version)',
      artist: 'Karaoke Stars',
      album: 'Hits Karaoke',
      durationSec: 230,
      durationLabel: '3:50',
      explicit: false,
      coverUrl: 'https://e-cdns-images.dzcdn.net/images/cover/250x250.jpg',
      previewUrl: 'https://cdnt-preview.dzcdn.net/stream/karaoke.mp3?hdnea=exp=1999999999',
      source: 'deezer',
    },
    {
      externalId: 'dz-101',
      deezerId: 101,
      title: 'Papaoutai',
      artist: 'Stromae',
      album: 'Racine carrée',
      durationSec: 232,
      durationLabel: '3:52',
      explicit: false,
      coverUrl: 'https://e-cdns-images.dzcdn.net/images/cover/500x500.jpg',
      previewUrl: 'https://cdnt-preview.dzcdn.net/stream/papaoutai.mp3?hdnea=exp=1999999999',
      source: 'deezer',
    },
    {
      externalId: 'it-202',
      itunesId: 202,
      title: 'Papaoutai',
      artist: 'Stromae',
      album: 'Racine carrée',
      durationSec: 232,
      durationLabel: '3:52',
      explicit: false,
      coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music/600x600bb.jpg',
      previewUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/papaoutai.m4a',
      genre: 'Pop',
      releaseYear: '2013',
      source: 'itunes',
    },
  ];

  const merged = mergeAndScoreCatalogResults(rawItems, 'Stromae Papaoutai');
  assert.equal(merged.length, 2);
  // Official merged track must rank #1 ahead of karaoke
  const top = merged[0]!;
  assert.equal(top.artist, 'Stromae');
  assert.deepEqual(top.providerSources?.sort(), ['deezer', 'itunes']);
  assert.equal(top.deezerId, 101);
  assert.equal(top.itunesId, 202);
  assert.equal(top.genre, 'Pop');
  // Stable Apple URL promoted to primary, Deezer URL kept as fallback
  assert.match(top.previewUrl, /itunes\.apple\.com/);
  assert.match(top.fallbackPreviewUrl || '', /dzcdn\.net/);
});

