import seedTracksRaw from './seedTracks.json';
import type { Playlist, Track } from '../types/music';

export const SEED_TRACKS: Track[] = (seedTracksRaw as Track[]).map((t) => ({
  ...t,
  sourceKind:
    t.dailymotionId || t.soundcloudTrackId
      ? 'stream'
      : t.youtubeVideoIds && t.youtubeVideoIds.length > 0
        ? 'youtube'
        : t.previewUrl
          ? 'stream'
          : 'none',
}));

export const DEFAULT_PLAYLISTS: Playlist[] = [
  {
    id: 'pl-pop-hits',
    name: 'Top Hits Pop Internationaux',
    description: 'The Weeknd, Taylor Swift, Billie Eilish, Bruno Mars, Dua Lipa, Harry Styles, Adele, Coldplay, Rihanna...',
    coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/00/be/a7/00bea776-e822-7f28-d343-7f893d9a7dcf/20UMGIM03677.rgb.jpg/600x600bb.jpg',
    trackIds: [
      't-38', 't-39', 't-40', 't-41', 't-42', 't-43', 't-44', 't-45', 't-46', 't-47',
      't-48', 't-49', 't-50', 't-51', 't-52', 't-53', 't-54', 't-55', 't-56', 't-57',
      't-58', 't-59', 't-60', 't-61', 't-62', 't-63', 't-64', 't-13', 't-17', 't-18'
    ],
    createdAt: '2026-11-20',
  },
  {
    id: 'pl-french',
    name: 'Scène Française & Variété',
    description: 'Daft Punk, Stromae, Orelsan, Angèle, Indochine, Céline Dion, Goldman, Cabrel, Clara Luciani, Bigflo & Oli...',
    coverUrl: '/covers/track-4.jpg',
    trackIds: [
      't-65', 't-66', 't-67', 't-68', 't-69', 't-70', 't-71', 't-72', 't-73', 't-74',
      't-75', 't-76', 't-77', 't-78', 't-79', 't-80', 't-81', 't-82', 't-83', 't-84',
      't-85', 't-86', 't-87', 't-88', 't-89', 't-90', 't-04', 't-05', 't-06', 't-07',
      't-08', 't-10', 't-11', 't-14', 't-15', 't-21', 't-22', 't-23', 't-30', 't-35',
      't-36', 't-37'
    ],
    createdAt: '2026-10-15',
  },
  {
    id: 'pl-rock-legends',
    name: 'Rock & Légendes Intemporelles',
    description: "Queen, Michael Jackson, Nirvana, Pink Floyd, The Beatles, AC/DC, Guns N' Roses, Linkin Park, Imagine Dragons...",
    coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/a4/c8/10/a4c810a9-2d4e-128b-b892-34045f06121d/11UMGIM17688.rgb.jpg/600x600bb.jpg',
    trackIds: [
      't-91', 't-92', 't-93', 't-94', 't-95', 't-96', 't-97', 't-98', 't-99', 't-100',
      't-101', 't-102', 't-103', 't-104', 't-105', 't-106', 't-107', 't-108', 't-01',
      't-02', 't-03', 't-12', 't-31', 't-33', 't-34'
    ],
    createdAt: '2026-11-01',
  },
  {
    id: 'pl-electro-party',
    name: 'Électro, Club & Dance',
    description: 'Daft Punk, David Guetta, Avicii, Calvin Harris, Martin Garrix, Kygo, Swedish House Mafia, DJ Snake, &ME...',
    coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/bf/16/fc/bf16fca9-106e-e722-e065-276949cefc94/00602537466542.rgb.jpg/600x600bb.jpg',
    trackIds: [
      't-109', 't-110', 't-111', 't-112', 't-113', 't-114', 't-115', 't-116', 't-117',
      't-118', 't-65', 't-66', 't-02', 't-19', 't-20', 't-24'
    ],
    createdAt: '2026-11-10',
  },
  {
    id: 'pl-rap-hiphop',
    name: 'Rap & Hip-Hop Essentials',
    description: 'Kendrick Lamar, Eminem, Drake, Travis Scott, Kanye West, Coolio, 50 Cent, Orelsan, Nekfeu, Damso...',
    coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/07/70/ec/0770ec23-5e9d-bb80-e8f0-109a96e8e8fb/00602557608717.rgb.jpg/600x600bb.jpg',
    trackIds: [
      't-119', 't-120', 't-121', 't-122', 't-123', 't-124', 't-125', 't-16', 't-70',
      't-71', 't-74', 't-88', 't-89', 't-90'
    ],
    createdAt: '2026-11-15',
  },
  {
    id: 'pl-cinema',
    name: 'Cinéma, Piano & Épique',
    description: 'Hans Zimmer (Inception, Interstellar), Ludovico Einaudi, Ramin Djawadi, Yann Tiersen, Grandbrothers...',
    coverUrl: '/covers/track-26.jpg',
    trackIds: [
      't-126', 't-127', 't-128', 't-129', 't-130', 't-26', 't-27', 't-28', 't-29',
      't-09', 't-25', 't-32', 't-01', 't-03'
    ],
    createdAt: '2026-09-28',
  },
];
