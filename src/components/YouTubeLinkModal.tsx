import { useEffect, useState, type FormEvent } from 'react';
import {
  CheckCircle2,
  Loader2,
  Music2,
  Play,
  Plus,
  X,
} from 'lucide-react';
import type { Playlist, ResolvedYouTubeMeta, Track } from '../types/music';
import {
  extractMultipleYouTubeVideoIds,
  extractYouTubeVideoId,
} from '../utils/musicLogic';
import { resolveYouTubeMetadataClient } from '../utils/webCatalogSearch';
import { AlbumCover } from './AlbumCover';
import { YouTubeLogo } from './Logos';

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
  onAttachVideoToTrack?: (
    trackId: string,
    videoId: string,
    coverUrl?: string
  ) => void;
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
        'Lien non reconnu. Collez un lien YouTube (youtu.be/... ou youtube.com/watch?v=...).'
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-2xl bg-[var(--bg-panel-solid)] border border-[var(--border-strong)] shadow-2xl overflow-hidden text-[var(--text-main)] anim-modal">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2.5">
            <YouTubeLogo className="w-6 h-4.5 shrink-0" />
            <h2
              id="yt-link-modal-title"
              className="font-display font-bold text-base text-[var(--text-main)]"
            >
              {targetTrack ? 'Lien YouTube' : 'Ajouter depuis YouTube'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-sub)] hover:text-[var(--text-main)] hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        <form onSubmit={(e) => handleSubmit(e, false)} className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="yt-share-url-input"
              className="block text-xs font-medium text-[var(--text-sub)]"
            >
              {targetTrack
                ? `Lien vidéo pour « ${targetTrack.title} »`
                : 'Collez un ou plusieurs liens YouTube (un par ligne)'}
            </label>

            {targetTrack ? (
              <input
                id="yt-share-url-input"
                type="text"
                autoFocus
                value={rawInput}
                onChange={(e) => setRawInput(e.target.value)}
                placeholder="https://youtu.be/..."
                className="w-full h-10 px-3.5 rounded-lg bg-[var(--bg-input)] focus:bg-[var(--bg-input-focus)] text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] border border-[var(--border-strong)] focus:border-[var(--accent)] outline-none transition-colors"
              />
            ) : (
              <textarea
                id="yt-share-url-input"
                rows={3}
                autoFocus
                value={rawInput}
                onChange={(e) => setRawInput(e.target.value)}
                placeholder={'https://youtu.be/...\nhttps://www.youtube.com/watch?v=...'}
                className="w-full p-3 rounded-lg bg-[var(--bg-input)] focus:bg-[var(--bg-input-focus)] text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] border border-[var(--border-strong)] focus:border-[var(--accent)] outline-none resize-none transition-colors"
              />
            )}
          </div>

          {error && <p className="text-xs text-rose-500">{error}</p>}

          {resolving && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-[var(--bg-elevated)] text-xs text-[var(--text-sub)]">
              <Loader2 className="w-4 h-4 animate-spin text-[var(--accent)]" />
              <span>Chargement de la miniature…</span>
            </div>
          )}

          {!resolving && resolvedList.length === 1 && (
            <div className="p-3.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-3">
              <div className="flex items-center gap-3.5">
                <AlbumCover
                  src={resolvedList[0].coverUrl}
                  videoIds={[resolvedList[0].videoId]}
                  alt={customTitle || resolvedList[0].title}
                  size="lg"
                  className="w-28 aspect-video rounded-md shadow-sm"
                />
                <div className="min-w-0 flex-1 space-y-0.5">
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--accent)]">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Vidéo détectée
                  </span>
                  <p className="text-sm font-bold text-[var(--text-main)] truncate">
                    {customTitle || resolvedList[0].title}
                  </p>
                  <p className="text-xs text-[var(--text-sub)] truncate">
                    {customArtist || resolvedList[0].artist}
                  </p>
                </div>
              </div>

              {!targetTrack && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  <input
                    type="text"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="Titre"
                    className="w-full h-9 px-3 rounded-md bg-[var(--bg-input-focus)] text-xs text-[var(--text-main)] border border-[var(--border-subtle)] focus:border-[var(--accent)] outline-none"
                  />
                  <input
                    type="text"
                    value={customArtist}
                    onChange={(e) => setCustomArtist(e.target.value)}
                    placeholder="Artiste"
                    className="w-full h-9 px-3 rounded-md bg-[var(--bg-input-focus)] text-xs text-[var(--text-main)] border border-[var(--border-subtle)] focus:border-[var(--accent)] outline-none"
                  />
                </div>
              )}
            </div>
          )}

          {!resolving && resolvedList.length > 1 && (
            <div className="p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-2">
              <span className="text-xs font-semibold text-[var(--accent)] flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {resolvedList.length} vidéos prêtes
              </span>
              <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
                {resolvedList.map((item) => (
                  <div
                    key={item.videoId}
                    className="flex items-center gap-2.5 p-1.5 rounded-md bg-[var(--bg-panel)]"
                  >
                    <AlbumCover
                      src={item.coverUrl}
                      videoIds={[item.videoId]}
                      alt={item.title}
                      size="sm"
                      className="w-14 aspect-video rounded"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-[var(--text-main)] truncate">
                        {item.title}
                      </p>
                      <p className="text-[11px] text-[var(--text-sub)] truncate">
                        {item.artist}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!targetTrack && playlists.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <label
                htmlFor="yt-modal-playlist-select"
                className="text-xs text-[var(--text-sub)] flex items-center gap-1.5"
              >
                <Music2 className="w-3.5 h-3.5 text-[var(--accent)]" />
                Ajouter dans :
              </label>
              <select
                id="yt-modal-playlist-select"
                value={targetPlaylistId}
                onChange={(e) => setTargetPlaylistId(e.target.value)}
                className="h-8.5 px-3 rounded-md bg-[var(--bg-input)] text-xs font-medium text-[var(--text-main)] border border-[var(--border-subtle)] outline-none cursor-pointer"
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

          <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full text-xs font-medium text-[var(--text-sub)] hover:text-[var(--text-main)] hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer"
            >
              Annuler
            </button>

            {!targetTrack && resolvedList.length >= 1 && (
              <button
                type="button"
                disabled={resolving || resolvedList.length === 0}
                onClick={(e) => handleSubmit(e as unknown as FormEvent, true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated-hover)] disabled:opacity-40 text-[var(--text-main)] text-xs font-semibold border border-[var(--border-subtle)] transition-colors cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Écouter</span>
              </button>
            )}

            <button
              type="submit"
              disabled={resolving || resolvedList.length === 0}
              className="inline-flex items-center gap-1.5 px-4.5 py-2 rounded-full btn-accent disabled:opacity-40 text-xs font-semibold cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>{targetTrack ? 'Enregistrer' : 'Ajouter'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
