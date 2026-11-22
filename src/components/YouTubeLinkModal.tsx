import { useEffect, useState, type FormEvent } from 'react';
import {
  CheckCircle2,
  Link2,
  Loader2,
  Music2,
  Play,
  Plus,
  Sparkles,
  X,
  Youtube,
} from 'lucide-react';
import type { Playlist, ResolvedYouTubeMeta, Track } from '../types/music';
import {
  extractMultipleYouTubeVideoIds,
  extractYouTubeVideoId,
} from '../utils/musicLogic';
import { resolveYouTubeMetadataClient } from '../utils/webCatalogSearch';
import { AlbumCover } from './AlbumCover';

export interface YouTubeTrackDraft {
  videoId: string;
  title: string;
  artist: string;
  coverUrl: string;
}

interface YouTubeLinkModalProps {
  playlists: Playlist[];
  targetTrack?: Track | null;
  onAddTracks: (
    drafts: YouTubeTrackDraft[],
    playlistId?: string,
    playImmediately?: boolean
  ) => void;
  onAttachVideoToTrack?: (trackId: string, videoId: string, coverUrl?: string) => void;
  onClose: () => void;
}

export function YouTubeLinkModal({
  playlists,
  targetTrack = null,
  onAddTracks,
  onAttachVideoToTrack,
  onClose,
}: YouTubeLinkModalProps) {
  const [rawInput, setRawInput] = useState(() =>
    targetTrack?.youtubeVideoIds?.[0]
      ? `https://youtu.be/${targetTrack.youtubeVideoIds[0]}`
      : ''
  );
  const [resolving, setResolving] = useState(false);
  const [resolvedList, setResolvedList] = useState<ResolvedYouTubeMeta[]>([]);
  const [customTitle, setCustomTitle] = useState('');
  const [customArtist, setCustomArtist] = useState('');
  const [targetPlaylistId, setTargetPlaylistId] = useState<string>('liked');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const trimmed = rawInput.trim();
    if (!trimmed) {
      setResolvedList([]);
      setError(null);
      return;
    }

    const ids = targetTrack
      ? (() => {
          const single = extractYouTubeVideoId(trimmed, { allowRawId: true });
          return single ? [single] : [];
        })()
      : extractMultipleYouTubeVideoIds(trimmed, { allowRawId: true });

    if (ids.length === 0) {
      setResolvedList([]);
      setError(
        'Lien non reconnu. Collez un lien de partage (ex: https://youtu.be/... ou https://www.youtube.com/watch?v=...).'
      );
      return;
    }

    let cancelled = false;
    setError(null);
    setResolving(true);

    const timer = window.setTimeout(async () => {
      try {
        const metas = await Promise.all(
          ids.slice(0, 25).map((id) => resolveYouTubeMetadataClient(id))
        );
        if (cancelled) return;
        setResolvedList(metas);
        if (metas.length === 1) {
          setCustomTitle(metas[0].title);
          setCustomArtist(metas[0].artist);
        }
      } finally {
        if (!cancelled) setResolving(false);
      }
    }, 220);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [rawInput, targetTrack]);

  const buildDrafts = (): YouTubeTrackDraft[] => {
    if (resolvedList.length === 0) return [];
    if (resolvedList.length === 1) {
      const first = resolvedList[0];
      return [
        {
          videoId: first.videoId,
          title: customTitle.trim() || first.title,
          artist: customArtist.trim() || first.artist,
          coverUrl: first.coverUrl,
        },
      ];
    }
    return resolvedList.map((m) => ({
      videoId: m.videoId,
      title: m.title,
      artist: m.artist,
      coverUrl: m.coverUrl,
    }));
  };

  const handleSubmit = (e: FormEvent, playNow = false) => {
    e.preventDefault();
    if (resolvedList.length === 0) return;

    if (targetTrack && onAttachVideoToTrack) {
      const first = resolvedList[0];
      onAttachVideoToTrack(targetTrack.id, first.videoId, first.coverUrl);
      onClose();
      return;
    }

    const drafts = buildDrafts();
    onAddTracks(
      drafts,
      targetPlaylistId === 'liked' ? undefined : targetPlaylistId,
      playNow
    );
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="yt-link-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-xl rounded-2xl bg-[#181818] border border-white/10 shadow-2xl overflow-hidden text-white">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#121212] border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-400">
              <Youtube className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h2
                id="yt-link-modal-title"
                className="font-display font-bold text-base sm:text-lg text-white"
              >
                {targetTrack
                  ? 'Associer un lien YouTube'
                  : 'Ajouter via un lien de partage YouTube'}
              </h2>
              <p className="text-xs text-[#a0a0a0]">
                {targetTrack
                  ? `Relier une vidéo officielle à « ${targetTrack.title} »`
                  : 'Zéro clé API requise · youtu.be, youtube.com, YouTube Music ou multi-liens'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#b3b3b3] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={(e) => handleSubmit(e, false)} className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="yt-share-url-input"
              className="flex items-center justify-between text-xs font-medium text-[#d4d4d4]"
            >
              <span className="flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5 text-[#1ED760]" />
                {targetTrack
                  ? 'Lien de partage YouTube'
                  : 'Lien(s) de partage YouTube (un ou plusieurs, 1 par ligne)'}
              </span>
              <span className="text-[11px] text-[#8a8a8a]">Détection instantanée</span>
            </label>

            {targetTrack ? (
              <input
                id="yt-share-url-input"
                type="text"
                autoFocus
                value={rawInput}
                onChange={(e) => setRawInput(e.target.value)}
                placeholder="https://youtu.be/4NRXx6U8ABQ?si=..."
                className="w-full h-11 px-3.5 rounded-lg bg-[#121212] text-sm text-white placeholder-[#707070] border border-white/15 focus:border-[#1ED760] outline-none transition-colors"
              />
            ) : (
              <textarea
                id="yt-share-url-input"
                rows={3}
                autoFocus
                value={rawInput}
                onChange={(e) => setRawInput(e.target.value)}
                placeholder={
                  'Ex : https://youtu.be/4NRXx6U8ABQ?si=...\nhttps://music.youtube.com/watch?v=oiKj0Z_Xnjc'
                }
                className="w-full p-3.5 rounded-lg bg-[#121212] text-sm text-white placeholder-[#707070] border border-white/15 focus:border-[#1ED760] outline-none resize-none transition-colors"
              />
            )}
          </div>

          {error && <p className="text-xs text-amber-400">{error}</p>}

          {resolving && (
            <div className="flex items-center gap-2.5 p-3.5 rounded-lg bg-[#121212] border border-white/10 text-xs text-[#b3b3b3]">
              <Loader2 className="w-4 h-4 animate-spin text-[#1ED760]" />
              <span>Récupération automatique du titre et de la miniature via oEmbed…</span>
            </div>
          )}

          {!resolving && resolvedList.length === 1 && (
            <div className="p-4 rounded-xl bg-[#121212] border border-[#1ED760]/35 space-y-3.5">
              <div className="flex items-center gap-3.5">
                <AlbumCover
                  src={resolvedList[0].coverUrl}
                  alt={customTitle || resolvedList[0].title}
                  sizeClass="w-16 h-16"
                  roundedClass="rounded-md"
                />
                <div className="min-w-0 flex-1 space-y-1">
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1ED760]">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Vidéo prête ({resolvedList[0].videoId})
                  </span>
                  <p className="text-sm font-bold text-white truncate">
                    {customTitle || resolvedList[0].title}
                  </p>
                  <p className="text-xs text-[#b3b3b3] truncate">
                    {customArtist || resolvedList[0].artist}
                  </p>
                </div>
              </div>

              {!targetTrack && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1">
                    <label
                      htmlFor="yt-custom-title"
                      className="block text-[11px] text-[#a0a0a0]"
                    >
                      Titre du morceau
                    </label>
                    <input
                      id="yt-custom-title"
                      type="text"
                      value={customTitle}
                      onChange={(e) => setCustomTitle(e.target.value)}
                      className="w-full h-9 px-3 rounded-md bg-[#1d1d1d] text-xs text-white border border-white/10 focus:border-white/30 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label
                      htmlFor="yt-custom-artist"
                      className="block text-[11px] text-[#a0a0a0]"
                    >
                      Artiste
                    </label>
                    <input
                      id="yt-custom-artist"
                      type="text"
                      value={customArtist}
                      onChange={(e) => setCustomArtist(e.target.value)}
                      className="w-full h-9 px-3 rounded-md bg-[#1d1d1d] text-xs text-white border border-white/10 focus:border-white/30 outline-none"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {!resolving && resolvedList.length > 1 && (
            <div className="p-3.5 rounded-xl bg-[#121212] border border-[#1ED760]/35 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[#1ED760] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  {resolvedList.length} liens YouTube détectés prêts à l&apos;import
                </span>
              </div>
              <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
                {resolvedList.map((item) => (
                  <div
                    key={item.videoId}
                    className="flex items-center gap-2.5 p-1.5 rounded-md bg-[#1b1b1b]"
                  >
                    <AlbumCover
                      src={item.coverUrl}
                      alt={item.title}
                      sizeClass="w-9 h-9"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-white truncate">
                        {item.title}
                      </p>
                      <p className="text-[11px] text-[#a0a0a0] truncate">
                        {item.artist}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!targetTrack && (
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <label
                htmlFor="yt-modal-playlist-select"
                className="text-xs text-[#b3b3b3] flex items-center gap-1.5"
              >
                <Music2 className="w-3.5 h-3.5 text-[#1ED760]" />
                Ajouter dans :
              </label>
              <select
                id="yt-modal-playlist-select"
                value={targetPlaylistId}
                onChange={(e) => setTargetPlaylistId(e.target.value)}
                className="h-9 px-3 rounded-md bg-[#121212] text-xs font-medium text-white border border-white/15 outline-none cursor-pointer"
              >
                <option value="liked">Titres likés</option>
                {playlists.map((pl) => (
                  <option key={pl.id} value={pl.id}>
                    {pl.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-end gap-2.5 pt-3 border-t border-white/[0.08]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full text-xs font-semibold text-[#d4d4d4] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              Annuler
            </button>

            {!targetTrack && resolvedList.length >= 1 && (
              <button
                type="button"
                disabled={resolving || resolvedList.length === 0}
                onClick={(e) => handleSubmit(e as unknown as FormEvent, true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#262626] hover:bg-[#333333] disabled:opacity-40 text-white text-xs font-semibold border border-white/10 transition-colors cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Ajouter &amp; Écouter</span>
              </button>
            )}

            <button
              type="submit"
              disabled={resolving || resolvedList.length === 0}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-[#1ED760] hover:bg-[#1fdf64] disabled:opacity-40 text-black text-xs font-bold transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>
                {targetTrack
                  ? 'Associer la vidéo'
                  : resolvedList.length > 1
                    ? `Importer les ${resolvedList.length} titres`
                    : 'Ajouter à la bibliothèque'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
