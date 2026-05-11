import { motion } from 'motion/react';
import { Search, DollarSign, LogIn, LogOut, Settings, Dice5, X } from 'lucide-react';
import { SiLastdotfm, SiSpotify, SiDiscord } from 'react-icons/si';
import { FilterMenu } from './FilterMenu';
import { SearchFilters } from '../types';
import { isLastfmLoggedIn, getLastfmUsername, clearLastfmSession, startLastfmAuth } from '../lastfm';
import { useSettings } from '../SettingsContext';

export type Category = 'music' | 'art' | 'recent' | 'stems' | 'misc' | 'fakes' | 'related' | 'settings' | 'history' | 'tracklists' | 'released' | 'comps';

interface NavbarProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  filters: SearchFilters;
  setFilters: (filters: SearchFilters) => void;
  onHomeClick: () => void;
  activeCategory: Category;
  onCategoryChange: (cat: Category) => void;
  lastfmLoggedIn: boolean;
  onLastfmLogout: () => void;
  onRandomSongClick?: () => void;
  isRandomMode?: boolean;
  spotifyLoggedIn?: boolean;
  onSpotifyLogin?: () => void;
  onSpotifyLogout?: () => void;
}

const NAV_CATEGORIES: { key: Category; label: string }[] = [
  { key: 'music', label: 'Music' },
  { key: 'art', label: 'Art' },
  { key: 'stems', label: 'Stems' },
  { key: 'misc', label: 'Misc' },
  { key: 'fakes', label: 'Fakes' },
  { key: 'released', label: 'Released' },
  { key: 'related', label: 'Related' },
  { key: 'recent', label: 'Recent' },
  { key: 'tracklists', label: 'Tracklists' },
  { key: 'comps', label: 'Comps' },
];

export function Navbar({ searchQuery, setSearchQuery, filters, setFilters, onHomeClick, activeCategory, onCategoryChange, lastfmLoggedIn, onLastfmLogout, onRandomSongClick, isRandomMode, spotifyLoggedIn, onSpotifyLogin, onSpotifyLogout }: NavbarProps) {
  const { settings } = useSettings();

  const handleCategoryClick = (cat: Category) => {
    onCategoryChange(cat);
    if (cat === 'settings') {
      setSearchQuery('');
    }
  };

  const handleLastfmClick = () => {
    if (lastfmLoggedIn) {
      clearLastfmSession();
      onLastfmLogout();
    } else {
      startLastfmAuth();
    }
  };

  const lastfmUsername = getLastfmUsername();

  return (
    <header className="h-auto md:h-16 w-full glass-panel border-b border-white/5 flex flex-col md:flex-row items-center justify-between px-4 md:px-8 py-3 md:py-0 z-30 relative shrink-0 gap-3 md:gap-0">
      <div className="flex flex-col w-full md:flex-1">
        <div className="md:hidden w-full mb-2 h-16 overflow-hidden">
          <img
            src="/logo.png"
            alt="YZY Gold"
            onClick={onHomeClick}
            className="w-full h-full object-cover object-center cursor-pointer hover:opacity-80 transition-opacity duration-300"
          />
        </div>

        <div className="flex-1 flex flex-row items-center justify-between md:justify-start w-full relative gap-3">
          {activeCategory !== 'history' && (
            <div
              className="flex items-center gap-2 w-full flex-1 sm:max-w-xs md:w-80 md:ml-0 transition-opacity duration-500"
            >
              <div className="relative group flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                  type="text"
                  placeholder={activeCategory === 'settings' ? "Search settings..." : "Search..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-md py-1.5 pl-9 pr-8 text-sm text-white focus:outline-none focus:border-white/30 transition-colors placeholder:text-white/30"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              {activeCategory !== 'art' && activeCategory !== 'settings' && <FilterMenu filters={filters} setFilters={setFilters} activeCategory={activeCategory} />}
              {activeCategory === 'music' && onRandomSongClick && settings.showRandomSongButton && (
                <button
                  onClick={onRandomSongClick}
                  title="Play Random Song"
                  className={`flex items-center justify-center cursor-pointer transition-colors p-1.5 rounded-md border ${isRandomMode ? 'border-[var(--theme-color)] bg-white/10' : 'border-transparent text-white/40 hover:text-white hover:bg-white/5'}`}
                  style={isRandomMode ? { color: 'var(--theme-color)' } : {}}
                >
                  <Dice5 className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>

        <div
          className="md:hidden w-full flex flex-wrap gap-x-4 gap-y-2 items-center"
          style={{ marginTop: '12px' }}
        >
          {NAV_CATEGORIES.map(({ key, label }) => (
            <div className="relative" key={key}>
              <button
                onClick={() => handleCategoryClick(key)}
                className={`text-xs font-semibold uppercase tracking-widest pb-1 transition-all duration-300 cursor-pointer ${activeCategory === key ? 'text-[var(--theme-color)]' : 'text-white/50 hover:text-white'}`}
              >
                {label}
              </button>
              {activeCategory === key && (
                <motion.div layoutId="nav-indicator-mobile" className="absolute bottom-0 left-0 right-0 h-[2px] bg-[var(--theme-color)]" />
              )}
            </div>
          ))}
          <div className="flex items-center gap-4 w-full border-t border-white/10 pt-3 mt-1">
            <button onClick={() => handleCategoryClick('settings')} className={`flex items-center p-2.5 rounded-full transition-all bg-white/5 text-white/50 hover:bg-white/10 hover:text-white ${activeCategory === 'settings' ? 'text-white bg-white/10' : ''}`}>
               <Settings className="w-5 h-5" />
            </button>
            <button
              onClick={() => spotifyLoggedIn ? onSpotifyLogout?.() : onSpotifyLogin?.()}
              className={`flex items-center justify-center p-2.5 rounded-full transition-all duration-300 cursor-pointer ${
                spotifyLoggedIn
                  ? 'bg-[#1DB954]/15 text-[#1DB954] hover:bg-[#1DB954]/25'
                  : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'
              }`}
              title={spotifyLoggedIn ? 'Disconnect Spotify' : 'Connect Spotify'}
            >
              <SiSpotify className="w-5 h-5" />
            </button>
            <a
              href="https://discord.gg/TYqdey3B"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center p-2.5 rounded-full transition-all duration-300 cursor-pointer bg-white/5 text-white/50 hover:bg-[#5865F2]/15 hover:text-[#5865F2]"
              title="Join Discord"
            >
              <SiDiscord className="w-5 h-5" />
            </a>
            <button
              onClick={handleLastfmClick}
              className={`flex items-center justify-center p-2.5 rounded-full transition-all duration-300 cursor-pointer ${lastfmLoggedIn
                ? 'bg-[#d51007]/15 text-[#d51007] hover:bg-[#d51007]/25'
                : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'
                }`}
              title={lastfmLoggedIn ? `Log out ${lastfmUsername || ''}` : 'Log in with Last.fm'}
            >
              <SiLastdotfm className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="hidden md:flex flex-1 justify-center">
        <div className="flex items-center justify-center">
          <img
            src="/logo.png"
            alt="YZY Gold"
            onClick={onHomeClick}
            className="h-12 w-auto cursor-pointer hover:opacity-80 transition-opacity duration-300 shrink-0"
          />

          <div className="flex items-center ml-6">
            <div className="flex items-center gap-6 min-w-max pr-2">
              {NAV_CATEGORIES.map(({ key, label }) => (
                <div className="relative" key={key}>
                  <button
                    onClick={() => handleCategoryClick(key)}
                    className={`text-sm font-semibold uppercase tracking-widest pb-1.5 transition-all duration-300 cursor-pointer whitespace-nowrap ${activeCategory === key ? 'text-[var(--theme-color)]' : 'text-white/50 hover:text-white'}`}
                  >
                    {label}
                  </button>
                  {activeCategory === key && (
                    <motion.div layoutId="nav-indicator-desktop" className="absolute bottom-0 left-0 right-0 h-[2px] bg-[var(--theme-color)]" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 hidden md:flex justify-end items-center gap-2 md:gap-3">
        <button
          onClick={() => spotifyLoggedIn ? onSpotifyLogout?.() : onSpotifyLogin?.()}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all duration-300 cursor-pointer ${
            spotifyLoggedIn
              ? 'bg-[#1DB954]/15 text-[#1DB954] hover:bg-[#1DB954]/25 hover:scale-105'
              : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white hover:scale-105'
          }`}
          title={spotifyLoggedIn ? 'Disconnect Spotify' : 'Connect Spotify'}
        >
          <SiSpotify className="w-4 h-4" />
          <span className="text-xs font-semibold uppercase tracking-wider whitespace-nowrap">
            {spotifyLoggedIn ? 'Spotify' : 'Spotify'}
          </span>
        </button>
        <a
          href="https://discord.gg/TYqdey3B"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all duration-300 cursor-pointer bg-white/5 text-white/50 hover:bg-[#5865F2]/15 hover:text-[#5865F2] hover:scale-105"
          title="Join Discord"
        >
          <SiDiscord className="w-4 h-4" />
          <span className="text-xs font-semibold uppercase tracking-wider whitespace-nowrap">Discord</span>
        </a>
        <button
          onClick={handleLastfmClick}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all duration-300 cursor-pointer ${lastfmLoggedIn
            ? 'bg-[#d51007]/15 text-[#d51007] hover:bg-[#d51007]/25 hover:scale-105'
            : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white hover:scale-105'
            }`}
          title={lastfmLoggedIn ? `Log out ${lastfmUsername || ''}` : 'Log in with Last.fm'}
        >
          <SiLastdotfm className="w-4 h-4" />
          <span className="text-xs font-semibold uppercase tracking-wider whitespace-nowrap">
            {lastfmLoggedIn ? (
              <>
                <span className="hidden lg:inline">{lastfmUsername} · </span>
                Log Out
              </>
            ) : (
              'Log In'
            )}
          </span>
        </button>
        <button
          onClick={() => {
            onCategoryChange('settings');
            setSearchQuery('');
          }}
          className={`flex items-center justify-center p-2 rounded-full transition-all duration-300 ${activeCategory === 'settings' ? 'bg-white/10 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white hover:scale-110'}`}
          title="Settings"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}
