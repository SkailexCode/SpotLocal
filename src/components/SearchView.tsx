import { useEffect, useState } from 'react';
import { Check, Pause, Play, Plus, Search } from 'lucide-react';
import type { Playlist, SearchResultTrack, Track } from '../types/music';
import { AlbumCover } from './AlbumCover';

interface SearchViewProps {
  query: string;
  onQueryChange: (q: string) => void;
  libraryTracks: Track[];
  playlists: Playlist[];
  currentTrackId: string | null;
  isPlaying: boolean;
  onPlaySearchResult: (result: SearchResultTrack) => void;
  onAddSearchResultToLibrary: (result: SearchResultTrack, playlistId?: string) => void;
}

const DISCOVER_TOPICS = [
  { label: 'Variété & Pop Française', query: 'Bigflo Oli Vianney Stromae', tone: 'from-emerald-800 to-zinc-900' },
  { label: 'Cinéma & Bandes Originales', query: 'Hans Zimmer Yann Tiersen', tone: 'from-indigo-800 to-zinc-900' },
  { label: 'Rock & Classiques', query: 'Pink Floyd Scorpions Queen', tone: 'from-rose-800 to-zinc-900' },
  { label: 'Électro & Remixes', query: 'CYRIL Keinemusik Daft Punk', tone: 'from-cyan-800 to-zinc-900' },
  { label: 'Rap & Urbain', query: 'Eminem Orelsan Damso', tone: 'from-amber-800 to-zinc-900' },
  { label: 'Acoustique & Chill', query: 'Simon Garfunkel Adèle Castillon', tone: 'from-teal-800 to-zinc-900' },
];

export function SearchView({
  query,
  onQueryChange,
  libraryTracks,
  playlists,
  currentTrackId,
  isPlaying,
  onPlaySearchResult,
  onAddSearchResultToLibrary,
}: SearchViewProps) {
  const [results, setResults] = useState<SearchResultTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [targetPlaylistId, setTargetPlaylistId] = useState<string>('liked');

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setError(null);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/music/search?q=${encodeURIComponent(trimmed)}`,
          { signal: controller.signal }
        );
        if (!res.ok) throw new Error('Recherche temporairement indisponible');
        const data = (await res.json()) as { results?: SearchResultTrack[] };
        setResults(data.results || []);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setError('Impossible de contacter le catalogue en ligne.');
        }
      } finally {
        setLoading(false);
      }
    }, 280);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const isInLibrary = (item: SearchResultTrack) =>
    libraryTracks.some(
      (t) =>
        t.id === item.externalId ||
        (t.title.toLowerCase() === item.title.toLowerCase() &&
          t.artist.toLowerCase().includes(item.artist.toLowerCase()))
    );

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#121212] rounded-lg overflow-y-auto px-6 py-6">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-white">
            Rechercher et ajouter des titres
          </h1>
          <p className="text-sm text-[#b3b3b3] mt-1">
            Trouvez n&apos;importe quelle musique, écoutez-la immédiatement et ajoutez-la à votre bibliothèque locale.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="add-target-select" className="text-xs text-[#b3b3b3]">
            Destination :
          </label>
          <select
            id="add-target-select"
            value={targetPlaylistId}
            onChange={(e) => setTargetPlaylistId(e.target.value)}
            className="h-9 px-3 rounded-md bg-[#1f1f1f] text-xs font-medium text-white border border-white/10 outline-none cursor-pointer"
          >
            <option value="liked">Titres likés</option>
            {playlists.map((pl) => (
              <option key={pl.id} value={pl.id}>
                {pl.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!query.trim() ? (
        <div className="space-y-4">
          <h2 className="font-display font-bold text-lg text-white">
            Explorer par ambiance
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {DISCOVER_TOPICS.map((topic) => (
              <button
                key={topic.label}
                type="button"
                onClick={() => onQueryChange(topic.query)}
                className={`h-28 p-5 rounded-lg bg-gradient-to-br ${topic.tone} text-left flex flex-col justify-between hover:brightness-110 transition-all cursor-pointer border border-white/[0.06]`}
              >
                <span className="font-display font-bold text-lg text-white">
                  {topic.label}
                </span>
                <span className="text-xs text-white/75 flex items-center gap-1.5">
                  <Search className="w-3.5 h-3.5" />
                  Rechercher ces titres
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : loading ? (
        <div className="space-y-2.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-16 rounded-md bg-[#1b1b1b] animate-pulse"
            />
          ))}
        </div>
      ) : error ? (
        <div className="py-12 text-center space-y-2">
          <p className="text-sm text-rose-400">{error}</p>
        </div>
      ) : results.length === 0 ? (
        <div className="py-12 text-center space-y-2">
          <p className="text-base font-semibold text-white">
            Aucun résultat pour « {query} »
          </p>
          <p className="text-sm text-[#b3b3b3]">
            Vérifiez l&apos;orthographe ou essayez un autre artiste.
          </p>
        </div>
      ) : (
        <div className="space-y-1" data-testid="search-results-list">
          {results.map((item) => {
            const added = isInLibrary(item);
            const active = currentTrackId === item.externalId && isPlaying;

            return (
              <div
                key={item.externalId}
                className="group flex items-center justify-between gap-4 px-3 py-2 rounded-md hover:bg-white/[0.07] transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => onPlaySearchResult(item)}
                    aria-label={active ? `Mettre en pause ${item.title}` : `Écouter ${item.title}`}
                    className="relative w-11 h-11 rounded-[4px] overflow-hidden shrink-0 cursor-pointer"
                  >
                    <AlbumCover
                      src={item.coverUrl}
                      alt={item.title}
                      sizeClass="w-11 h-11"
                    />
                    <span className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      {active ? (
                        <Pause className="w-5 h-5 text-white fill-white" />
                      ) : (
                        <Play className="w-5 h-5 text-white fill-white" />
                      )}
                    </span>
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <button
                        type="button"
                        onClick={() => onPlaySearchResult(item)}
                        className={`text-[15px] font-medium truncate text-left hover:underline cursor-pointer ${
                          active ? 'text-[#1ED760]' : 'text-white'
                        }`}
                      >
                        {item.title}
                      </button>
                      {item.explicit && (
                        <span className="inline-flex items-center justify-center w-4 h-4 rounded-[2px] bg-[#b3b3b3]/80 text-[#121212] text-[10px] font-bold leading-none shrink-0">
                          E
                        </span>
                      )}
                    </div>
                    <p className="text-[13px] text-[#b3b3b3] truncate">
                      {item.artist} · {item.album}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="hidden sm:inline text-xs text-[#b3b3b3] font-mono-tabular">
                    {item.durationLabel}
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      onAddSearchResultToLibrary(
                        item,
                        targetPlaylistId === 'liked' ? undefined : targetPlaylistId
                      )
                    }
                    className={`inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                      added
                        ? 'bg-[#1ED760]/15 text-[#1ED760] border border-[#1ED760]/40'
                        : 'bg-white text-black hover:bg-[#e5e5e5]'
                    }`}
                  >
                    {added ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Ajouté</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" />
                        <span>Ajouter</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
