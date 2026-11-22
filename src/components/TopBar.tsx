import { memo, type RefObject } from 'react';
import {
  FolderDown,
  Home,
  Keyboard,
  Menu,
  Scale,
  Search,
  X,
  Youtube,
} from 'lucide-react';
import type { ActiveView } from '../types/music';
import { extractYouTubeVideoId } from '../utils/musicLogic';

interface TopBarProps {
  activeView: ActiveView;
  searchQuery: string;
  searchInputRef?: RefObject<HTMLInputElement | null>;
  onSearchChange: (q: string) => void;
  onGoHome: () => void;
  onGoLiked: () => void;
  onOpenSearch: () => void;
  onOpenYouTubeModal: () => void;
  onOpenImportModal: () => void;
  onOpenShortcutsModal: () => void;
  onOpenLegalModal: () => void;
  onOpenMobileMenu: () => void;
}

export const TopBar = memo(function TopBar({
  activeView,
  searchQuery,
  searchInputRef,
  onSearchChange,
  onGoHome,
  onGoLiked,
  onOpenSearch,
  onOpenYouTubeModal,
  onOpenImportModal,
  onOpenShortcutsModal,
  onOpenLegalModal,
  onOpenMobileMenu,
}: TopBarProps) {
  const detectedYtId = extractYouTubeVideoId(searchQuery);

  return (
    <header className="h-16 px-3 lg:px-4 flex items-center justify-between gap-2.5 lg:gap-3 bg-black shrink-0">
      {/* Left: Brand & Home */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Ouvrir la bibliothèque"
          className="lg:hidden w-10 h-10 rounded-full bg-[#1f1f1f] hover:bg-[#2a2a2a] flex items-center justify-center text-white transition-colors cursor-pointer"
        >
          <Menu className="w-5 h-5" />
        </button>

        <button
          type="button"
          onClick={onGoHome}
          aria-label="SpotLocal Accueil"
          className="flex items-center gap-2.5 pr-1 cursor-pointer group"
        >
          <div className="w-9 h-9 rounded-full bg-[#1ED760] flex items-center justify-center shrink-0 transition-transform group-hover:scale-105">
            <svg
              viewBox="0 0 24 24"
              className="w-5 h-5 text-black"
              aria-hidden="true"
              fill="none"
            >
              <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeWidth="2.2" />
              <rect x="7.5" y="9.5" width="2" height="5" rx="1" fill="currentColor" />
              <rect x="11" y="6.5" width="2" height="11" rx="1" fill="currentColor" />
              <rect x="14.5" y="8.5" width="2" height="7" rx="1" fill="currentColor" />
            </svg>
          </div>
          <div className="hidden sm:flex flex-col items-start leading-none">
            <span className="font-display font-bold text-[17px] tracking-tight text-white whitespace-nowrap">
              SpotLocal
            </span>
            <span className="text-[10px] font-medium text-[#1ED760] tracking-wide">
              Web &amp; Local
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={onGoHome}
          aria-label="Accueil"
          title="Accueil"
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
            activeView === 'home'
              ? 'bg-[#282828] text-white'
              : 'bg-[#1f1f1f] text-[#b3b3b3] hover:text-white hover:bg-[#2a2a2a]'
          }`}
        >
          <Home className="w-5 h-5" />
        </button>

        <button
          type="button"
          onClick={onGoLiked}
          className={`hidden xl:inline-flex items-center h-9 px-3 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
            activeView === 'liked'
              ? 'bg-[#282828] text-white'
              : 'bg-[#1f1f1f] text-[#b3b3b3] hover:text-white hover:bg-[#2a2a2a]'
          }`}
        >
          Titres likés
        </button>
      </div>

      {/* Center: Search + Direct YouTube Share Link Input */}
      <div className="flex-1 max-w-[540px] min-w-0">
        <div className="relative flex items-center">
          {detectedYtId ? (
            <Youtube className="w-4 h-4 text-red-500 fill-red-500 absolute left-3.5 pointer-events-none" />
          ) : (
            <Search className="w-4 h-4 text-[#b3b3b3] absolute left-3.5 pointer-events-none" />
          )}
          <input
            ref={searchInputRef}
            type="search"
            value={searchQuery}
            onFocus={onOpenSearch}
            onChange={(e) => {
              onSearchChange(e.target.value);
              if (activeView !== 'search') {
                onOpenSearch();
              }
            }}
            aria-label="Rechercher un titre ou coller un lien YouTube"
            placeholder="Rechercher un titre, artiste ou coller un lien YouTube…"
            className={`w-full h-10 pl-10 pr-16 rounded-full bg-[#1f1f1f] hover:bg-[#272727] focus:bg-[#272727] text-sm text-white placeholder-[#9a9a9a] border outline-none transition-colors ${
              detectedYtId
                ? 'border-red-500/50 focus:border-red-400'
                : 'border-transparent focus:border-white/25'
            }`}
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              aria-label="Effacer la recherche"
              className="absolute right-2.5 w-6 h-6 rounded-full flex items-center justify-center text-[#b3b3b3] hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <kbd className="hidden md:inline-flex items-center gap-0.5 absolute right-3 px-1.5 py-0.5 rounded bg-[#2d2d2d] text-[10px] font-mono-tabular text-[#9a9a9a] pointer-events-none border border-white/10">
              Ctrl K
            </kbd>
          )}
        </div>
      </div>

      {/* Right: Web-First Actions */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        <button
          type="button"
          onClick={onOpenShortcutsModal}
          title="Raccourcis clavier (?)"
          aria-label="Raccourcis clavier"
          className="hidden md:inline-flex w-9 h-9 rounded-full bg-[#1f1f1f] hover:bg-[#2a2a2a] items-center justify-center text-[#b3b3b3] hover:text-white transition-colors cursor-pointer shrink-0"
        >
          <Keyboard className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={onOpenLegalModal}
          title="Notice légale, Open Source & Conditions YouTube"
          aria-label="Notice légale et Open Source"
          className="inline-flex items-center gap-1.5 h-9 px-2.5 xl:px-3 rounded-full bg-[#1f1f1f] hover:bg-[#2a2a2a] text-xs font-semibold text-[#b3b3b3] hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Scale className="w-4 h-4 text-[#1ED760]" />
          <span className="hidden 2xl:inline">Légal</span>
        </button>

        <button
          type="button"
          onClick={onOpenImportModal}
          title="Importer des MP3 locaux, sauvegarder en JSON ou télécharger l'application"
          className="hidden sm:inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-[#1f1f1f] hover:bg-[#2a2a2a] text-xs font-semibold text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <FolderDown className="w-4 h-4 text-[#1ED760]" />
          <span className="hidden lg:inline">MP3 &amp; Sauvegarde</span>
          <span className="lg:hidden">MP3</span>
        </button>

        <button
          type="button"
          onClick={onOpenYouTubeModal}
          title="Ajouter une musique avec un simple lien de partage YouTube"
          className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-white text-black hover:bg-[#e5e5e5] text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Youtube className="w-4 h-4 text-red-600 fill-red-600" />
          <span className="hidden md:inline">+ Lien YouTube</span>
          <span className="md:hidden">+ YT</span>
        </button>
      </div>
    </header>
  );
});
