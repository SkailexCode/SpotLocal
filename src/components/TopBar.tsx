import { memo, type RefObject } from 'react';
import {
  FolderInput,
  Home,
  Link2,
  Menu,
  Moon,
  Search,
  Sun,
  X,
} from 'lucide-react';
import type { ActiveView } from '../types/music';

export type ThemeMode = 'warm' | 'dark';

interface TopBarProps {
  activeView: ActiveView;
  theme: ThemeMode;
  searchQuery: string;
  searchInputRef?: RefObject<HTMLInputElement | null>;
  onToggleTheme: () => void;
  onSearchChange: (q: string) => void;
  onGoHome: () => void;
  onOpenSearch: () => void;
  onOpenYouTubeModal: () => void;
  onOpenImportModal: () => void;
  onOpenMobileMenu: () => void;
}

export const TopBar = memo(function TopBar({
  activeView,
  theme,
  searchQuery,
  searchInputRef,
  onToggleTheme,
  onSearchChange,
  onGoHome,
  onOpenSearch,
  onOpenYouTubeModal,
  onOpenImportModal,
  onOpenMobileMenu,
}: TopBarProps) {
  return (
    <header className="h-14 px-3 sm:px-4 flex items-center justify-between gap-3 shrink-0 select-none z-20">
      {/* Left: Brand + Home */}
      <div className="flex items-center gap-2.5 shrink-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Ouvrir la bibliothèque"
          className="lg:hidden w-9 h-9 rounded-full bg-[var(--bg-panel)] border border-[var(--border-panel)] flex items-center justify-center text-[var(--text-main)] anim-press cursor-pointer"
        >
          <Menu className="w-4.5 h-4.5" />
        </button>

        <button
          type="button"
          onClick={onGoHome}
          aria-label="SpotLocal Accueil"
          className="flex items-center gap-2 cursor-pointer"
        >
          <div className="w-8 h-8 rounded-full bg-[var(--accent)] flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-4.5 h-4.5 fill-white">
              <rect x="4" y="10" width="2.8" height="7" rx="1.4" />
              <rect x="9" y="6" width="2.8" height="13" rx="1.4" />
              <rect x="14" y="8.5" width="2.8" height="10" rx="1.4" />
              <rect x="19" y="11.5" width="2.4" height="5" rx="1.2" />
            </svg>
          </div>
          <span className="hidden sm:inline font-display font-bold text-base text-[var(--text-main)]">
            SpotLocal
          </span>
        </button>

        <button
          type="button"
          onClick={onGoHome}
          aria-label="Accueil"
          title="Accueil"
          className={`w-9 h-9 rounded-full flex items-center justify-center border anim-press shrink-0 cursor-pointer ${
            activeView === 'home'
              ? 'bg-[var(--pill-active-bg)] text-[var(--pill-active-fg)] border-transparent'
              : 'bg-[var(--bg-panel)] hover:bg-[var(--bg-elevated)] text-[var(--text-sub)] hover:text-[var(--text-main)] border-[var(--border-panel)]'
          }`}
        >
          <Home className="w-4 h-4" />
        </button>
      </div>

      {/* Center: Clean Search Input */}
      <div className="flex-1 max-w-lg mx-auto">
        <div className="relative">
          <Search className="w-4 h-4 text-[var(--text-sub)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="search"
            value={searchQuery}
            onFocus={onOpenSearch}
            onChange={(e) => {
              onSearchChange(e.target.value);
              if (activeView !== 'search') onOpenSearch();
            }}
            placeholder="Que souhaitez-vous écouter ?"
            className="w-full h-9.5 pl-10 pr-9 rounded-full bg-[var(--bg-panel)] focus:bg-[var(--bg-input-focus)] text-sm text-[var(--text-main)] placeholder-[var(--text-sub)] border border-[var(--border-panel)] focus:border-[var(--accent)] outline-none transition-colors"
          />

          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              aria-label="Effacer la recherche"
              className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full hover:bg-[var(--bg-elevated)] flex items-center justify-center text-[var(--text-sub)] hover:text-[var(--text-main)] cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Right: Link YT + Importer MP3 + Theme Switch */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onOpenYouTubeModal}
          title="Ajouter un lien YouTube"
          aria-label="Ajouter un lien YouTube"
          className="hidden sm:inline-flex items-center justify-center w-9 h-9 rounded-full bg-[var(--bg-panel)] hover:bg-[var(--bg-elevated)] border border-[var(--border-panel)] text-[var(--text-sub)] hover:text-[var(--text-main)] anim-press cursor-pointer"
        >
          <Link2 className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={onOpenImportModal}
          className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-[var(--bg-panel)] hover:bg-[var(--bg-elevated)] border border-[var(--border-panel)] text-xs font-semibold text-[var(--text-main)] anim-press cursor-pointer"
        >
          <FolderInput className="w-3.5 h-3.5 text-[var(--accent)]" />
          <span className="hidden sm:inline">Importer MP3</span>
        </button>

        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={
            theme === 'warm' ? 'Activer le mode sombre' : 'Activer le mode clair'
          }
          title={theme === 'warm' ? 'Mode sombre' : 'Mode clair'}
          className="w-9 h-9 rounded-full bg-[var(--bg-panel)] hover:bg-[var(--bg-elevated)] border border-[var(--border-panel)] flex items-center justify-center text-[var(--text-sub)] hover:text-[var(--text-main)] anim-press cursor-pointer"
        >
          {theme === 'warm' ? (
            <Moon className="w-4 h-4" />
          ) : (
            <Sun className="w-4 h-4" />
          )}
        </button>
      </div>
    </header>
  );
});
