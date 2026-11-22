import { memo, type RefObject } from 'react';
import {
  HelpCircle,
  Home,
  Keyboard,
  Link2,
  Menu,
  Search,
  Sparkles,
  Upload,
  X,
} from 'lucide-react';
import type { ActiveView } from '../types/music';

interface TopBarProps {
  activeView: ActiveView;
  searchQuery: string;
  catalogCount: number;
  isCatalogSyncing: boolean;
  searchInputRef?: RefObject<HTMLInputElement | null>;
  onSearchChange: (q: string) => void;
  onGoHome: () => void;
  onOpenSearch: () => void;
  onPlaySmartMix: () => void;
  onOpenYouTubeModal: () => void;
  onOpenImportModal: () => void;
  onOpenShortcutsModal: () => void;
  onOpenLegalModal: () => void;
  onOpenMobileMenu: () => void;
}

export const TopBar = memo(function TopBar({
  activeView,
  searchQuery,
  catalogCount,
  isCatalogSyncing,
  searchInputRef,
  onSearchChange,
  onGoHome,
  onOpenSearch,
  onPlaySmartMix,
  onOpenYouTubeModal,
  onOpenImportModal,
  onOpenShortcutsModal,
  onOpenLegalModal,
  onOpenMobileMenu,
}: TopBarProps) {
  return (
    <header className="h-15 px-3 sm:px-4 flex items-center justify-between gap-3 bg-[#07080c]/95 backdrop-blur-xl border-b border-white/[0.06] shrink-0 select-none z-20">
      {/* Left: Mobile Drawer + Brand Identity */}
      <div className="flex items-center gap-2.5 shrink-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Ouvrir la bibliothèque"
          className="lg:hidden w-9 h-9 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.07] flex items-center justify-center text-[#b8beca] hover:text-white transition-colors cursor-pointer"
        >
          <Menu className="w-4.5 h-4.5" />
        </button>

        <button
          type="button"
          onClick={onGoHome}
          aria-label="SpotLocal Accueil"
          className="flex items-center gap-2.5 group cursor-pointer"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#1ED760] via-[#15b850] to-[#0b7a33] flex items-center justify-center shadow-[0_0_20px_rgba(30,215,96,0.3)] group-hover:scale-105 transition-transform">
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-black">
              <rect x="3" y="10" width="3.2" height="8" rx="1.6" />
              <rect x="8.2" y="5" width="3.2" height="14" rx="1.6" />
              <rect x="13.4" y="8" width="3.2" height="11" rx="1.6" />
              <rect x="18.6" y="12" width="3.2" height="6" rx="1.6" />
            </svg>
          </div>
          <div className="hidden sm:flex flex-col text-left leading-none">
            <span className="font-display font-bold text-[15px] text-white tracking-tight">
              SpotLocal
            </span>
            <span className="text-[10px] font-mono-tabular text-[#1ED760] font-semibold mt-0.5 flex items-center gap-1">
              <span
                className={`w-1.5 h-1.5 rounded-full bg-[#1ED760] ${
                  isCatalogSyncing ? 'animate-ping' : ''
                }`}
              />
              {catalogCount.toLocaleString('fr-FR')} titres
            </span>
          </div>
        </button>
      </div>

      {/* Center: Command Omnibar (Search 112k+ songs or paste YT link) */}
      <div className="flex items-center gap-2 flex-1 max-w-2xl justify-center">
        <button
          type="button"
          onClick={onGoHome}
          aria-label="Accueil"
          title="Accueil"
          className={`hidden md:flex w-10 h-10 rounded-xl items-center justify-center border transition-all shrink-0 cursor-pointer ${
            activeView === 'home'
              ? 'bg-white text-black border-white shadow-[0_0_16px_rgba(255,255,255,0.2)]'
              : 'bg-[#12151f] text-[#9ca3b0] border-white/[0.07] hover:text-white hover:border-white/15'
          }`}
        >
          <Home className="w-4.5 h-4.5" />
        </button>

        <div className="relative flex-1 max-w-xl group">
          <Search className="w-4 h-4 text-[#8b93a4] group-focus-within:text-[#1ED760] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors" />
          <input
            ref={searchInputRef}
            type="search"
            value={searchQuery}
            onFocus={onOpenSearch}
            onChange={(e) => {
              onSearchChange(e.target.value);
              if (activeView !== 'search') onOpenSearch();
            }}
            placeholder={`Rechercher parmi ${catalogCount.toLocaleString('fr-FR')} musiques ou coller un lien YouTube…`}
            className="w-full h-10 pl-10 pr-16 rounded-xl bg-[#11141e] hover:bg-[#161a27] focus:bg-[#171b29] text-[13.5px] text-white placeholder-[#7d8596] border border-white/[0.08] focus:border-[#1ED760]/65 focus:shadow-[0_0_0_3px_rgba(30,215,96,0.12)] outline-none transition-all"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              aria-label="Effacer la recherche"
              className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-[#b3b3b3] hover:text-white cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded-md bg-white/[0.06] border border-white/[0.08] text-[10px] font-mono-tabular text-[#7d8596] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              ⌘K
            </kbd>
          )}
        </div>
      </div>

      {/* Right: Studio Quick Actions */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        <button
          type="button"
          onClick={onPlaySmartMix}
          title="Lancer une radio aléatoire sur tout le catalogue"
          className="hidden xl:inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-[#1ED760]/12 hover:bg-[#1ED760]/22 border border-[#1ED760]/30 text-[#1ED760] text-xs font-semibold transition-colors cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Mix 112k</span>
        </button>

        <button
          type="button"
          onClick={onOpenYouTubeModal}
          title="Coller un ou plusieurs liens YouTube (Raccourci : Y)"
          className="inline-flex items-center gap-1.5 h-9 px-3 sm:px-3.5 rounded-xl bg-rose-500/12 hover:bg-rose-500/22 border border-rose-500/28 text-xs font-semibold text-rose-200 transition-colors cursor-pointer"
        >
          <Link2 className="w-3.5 h-3.5 text-rose-400" />
          <span className="hidden md:inline">Lien YT</span>
        </button>

        <button
          type="button"
          onClick={onOpenImportModal}
          title="Importer des MP3 locaux ou sauvegarder vos playlists"
          className="inline-flex items-center gap-1.5 h-9 px-3 sm:px-3.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] text-xs font-semibold text-white transition-colors cursor-pointer"
        >
          <Upload className="w-3.5 h-3.5 text-[#1ED760]" />
          <span className="hidden lg:inline">MP3 Local</span>
        </button>

        <button
          type="button"
          onClick={onOpenShortcutsModal}
          aria-label="Raccourcis clavier"
          title="Raccourcis clavier (?)"
          className="hidden md:flex w-9 h-9 rounded-xl bg-white/[0.04] hover:bg-white/[0.1] border border-white/[0.07] items-center justify-center text-[#9ca3b0] hover:text-white transition-colors cursor-pointer"
        >
          <Keyboard className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={onOpenLegalModal}
          aria-label="À propos et licences open-source"
          title="À propos & Architecture Zéro Clé API"
          className="w-9 h-9 rounded-xl bg-white/[0.04] hover:bg-white/[0.1] border border-white/[0.07] flex items-center justify-center text-[#9ca3b0] hover:text-white transition-colors cursor-pointer"
        >
          <HelpCircle className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
});
