import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Star,
  Calendar,
  ChevronLeft,
  ChevronRight,
  User,
  LogOut,
  Eye,
  EyeOff,
  Tv,
  Globe,
  HelpCircle,
  Search,
  BarChart2,
  FileText,
  Lock,
  Sparkles,
} from 'lucide-react';
import { NbaGame, NbaUserSession } from '../../types/nba';
import {
  NBA_DATE_STRIP,
  CURATED_GAMES_BY_DATE,
  loadHideScoresPref,
  saveHideScoresPref,
  loadNbaSession,
  saveNbaSession,
} from '../../services/nbaService';
import { NbaTeamLogo } from './NbaTeamLogo';
import { NbaSignInModal } from './NbaSignInModal';
import { NbaStreamPlayerModal } from './NbaStreamPlayerModal';

interface NbaLeaguePassWrapperProps {
  url: string;
  drmL3Enforcer: boolean;
  onNavigate?: (url: string) => void;
}

function getGamesForDateSync(dateKey: string): NbaGame[] {
  if (dateKey === '2026-10-26') {
    return [
      ...(CURATED_GAMES_BY_DATE['2026-10-25'] || []),
      ...(CURATED_GAMES_BY_DATE['2026-10-26'] || []),
    ];
  }
  if (CURATED_GAMES_BY_DATE[dateKey]) {
    return CURATED_GAMES_BY_DATE[dateKey];
  }
  const baseGames = CURATED_GAMES_BY_DATE['2026-10-25'] || [];
  return baseGames.map((g, idx) => ({
    ...g,
    gameId: `${g.gameId}-${dateKey.slice(-2)}`,
    dateKey,
    gameStatus: dateKey > '2026-10-26' ? 1 : 3,
    gameStatusText: dateKey > '2026-10-26' ? `${7 + idx}:30 PM ET` : 'FINAL',
  }));
}

export const NbaLeaguePassWrapper: React.FC<NbaLeaguePassWrapperProps> = ({
  url,
  drmL3Enforcer,
}) => {
  const dateStrip = NBA_DATE_STRIP;
  const [selectedDate, setSelectedDate] = useState<string>('2026-10-26');
  const [hideScores, setHideScores] = useState<boolean>(() => loadHideScoresPref());
  const [session, setSession] = useState<NbaUserSession>(() => loadNbaSession());
  const [favoriteTeamsOnly, setFavoriteTeamsOnly] = useState<boolean>(false);
  const [favoriteTricodes, setFavoriteTricodes] = useState<string[]>(() => {
    const loaded = loadNbaSession();
    return loaded.favoriteTeams?.length ? loaded.favoriteTeams : ['LAL', 'OKC'];
  });
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'wrapper' | 'raw_sandbox'>('wrapper');

  // Top-right Sign In menu & modals
  const [isSignInDropdownOpen, setIsSignInDropdownOpen] = useState<boolean>(false);
  const [isSignInModalOpen, setIsSignInModalOpen] = useState<boolean>(false);
  const [showHelpBanner, setShowHelpBanner] = useState<boolean>(false);

  // Active game & tab for stream player modal
  const [activeGame, setActiveGame] = useState<NbaGame | null>(null);
  const [activeModalTab, setActiveModalTab] = useState<'watch' | 'boxscore' | 'details'>('watch');

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsSignInDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Automatically open sign-in modal if user navigated to nba.com/account/sign-in
  useEffect(() => {
    if (url.toLowerCase().includes('sign-in') || url.toLowerCase().includes('login')) {
      setIsSignInModalOpen(true);
    }
  }, [url]);

  const handleToggleHideScores = (nextValue?: boolean) => {
    const updated = typeof nextValue === 'boolean' ? nextValue : !hideScores;
    setHideScores(updated);
    saveHideScoresPref(updated);
  };

  const handleSaveSession = (newSession: NbaUserSession) => {
    setSession(newSession);
    saveNbaSession(newSession);
    setIsSignInDropdownOpen(false);
  };

  const handleSignOut = () => {
    const cleared: NbaUserSession = {
      isSignedIn: false,
      email: '',
      displayName: '',
      subscriptionTier: 'League Pass Premium',
      favoriteTeams: favoriteTricodes,
    };
    setSession(cleared);
    saveNbaSession(cleared);
    setIsSignInDropdownOpen(false);
  };

  const toggleFavoriteTeam = (tricode: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavoriteTricodes((prev) => {
      const next = prev.includes(tricode)
        ? prev.filter((code) => code !== tricode)
        : [...prev, tricode];
      const updatedSession = { ...session, favoriteTeams: next };
      setSession(updatedSession);
      saveNbaSession(updatedSession);
      return next;
    });
  };

  const allGamesForDate = getGamesForDateSync(selectedDate);
  const filteredGames = allGamesForDate.filter((game) => {
    if (
      favoriteTeamsOnly &&
      !favoriteTricodes.includes(game.awayTeam.tricode) &&
      !favoriteTricodes.includes(game.homeTeam.tricode)
    ) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        game.awayTeam.name.toLowerCase().includes(q) ||
        game.awayTeam.city.toLowerCase().includes(q) ||
        game.awayTeam.tricode.toLowerCase().includes(q) ||
        game.homeTeam.name.toLowerCase().includes(q) ||
        game.homeTeam.city.toLowerCase().includes(q) ||
        game.homeTeam.tricode.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const selectedDateObj =
    dateStrip.find((d) => d.dateKey === selectedDate) || dateStrip[1];

  const stepDate = (direction: -1 | 1) => {
    const idx = dateStrip.findIndex((d) => d.dateKey === selectedDate);
    if (idx === -1) return;
    const nextIdx = idx + direction;
    if (nextIdx >= 0 && nextIdx < dateStrip.length) {
      setSelectedDate(dateStrip[nextIdx].dateKey);
    }
  };

  const openGameModal = (game: NbaGame, tab: 'watch' | 'boxscore' | 'details' = 'watch') => {
    setActiveModalTab(tab);
    setActiveGame(game);
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#0B0D13] text-white select-none overflow-hidden">
      {/* Top Global NBA Navigation Bar */}
      <header className="bg-[#050608] border-b border-white/10 px-4 sm:px-6 h-14 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-5">
          {/* NBA Brand Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#1D428A] via-[#1D428A] to-[#C8102E] flex items-center justify-center font-black text-xs tracking-tighter text-white shadow-inner border border-white/15">
              NBA
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-black tracking-tight text-base text-white">
                  GAMES
                </span>
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                  LEAGUE PASS
                </span>
              </div>
              <span className="text-[10px] text-white/45 hidden sm:inline">
                In-App Automotive Wrapper · Widevine {drmL3Enforcer ? 'L3 Enforced' : 'Standard'}
              </span>
            </div>
          </div>

          {/* Primary Nav Tabs (Games -> Home active) */}
          <nav className="hidden md:flex items-center gap-1 ml-2">
            <button
              type="button"
              onClick={() => setViewMode('wrapper')}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                viewMode === 'wrapper'
                  ? 'text-white bg-white/10'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              Home
            </button>
            <button
              type="button"
              onClick={() => {
                setViewMode('wrapper');
                setFavoriteTeamsOnly(false);
              }}
              className="px-3 py-2 rounded-lg text-xs font-semibold text-white/60 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            >
              Schedule
            </button>
            <button
              type="button"
              onClick={() => {
                if (filteredGames.length > 0) {
                  openGameModal(filteredGames[0], 'watch');
                }
              }}
              className="px-3 py-2 rounded-lg text-xs font-semibold text-white/60 hover:text-white hover:bg-white/5 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Tv className="w-3.5 h-3.5 text-amber-400" />
              League Pass
            </button>
          </nav>
        </div>

        {/* Right Controls: View Switcher + Top-Right Sign In Menu */}
        <div className="flex items-center gap-2.5">
          {/* Toggle between Car Wrapper and Sandboxed Web View (stays 100% in-app) */}
          <button
            type="button"
            onClick={() =>
              setViewMode((prev) => (prev === 'wrapper' ? 'raw_sandbox' : 'wrapper'))
            }
            className={`px-3 py-2 min-h-[40px] rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'raw_sandbox'
                ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/40'
                : 'bg-white/5 text-white/75 border-white/10 hover:bg-white/10'
            }`}
            title="Switch between Custom Car Tile Wrapper and Sandboxed Webpage (Never triggers phone NBA app)"
          >
            <Globe className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              {viewMode === 'wrapper' ? 'Car Tile Wrapper' : 'Sandboxed Web View'}
            </span>
          </button>

          {/* Top-Right Sign In Dropdown Trigger (Matches user screenshot #2) */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsSignInDropdownOpen((prev) => !prev)}
              className={`px-3.5 py-2 min-h-[40px] rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border ${
                session.isSignedIn
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25'
                  : 'bg-white text-black border-white hover:bg-white/90'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>{session.isSignedIn ? session.displayName : 'Sign In'}</span>
            </button>

            {/* Dropdown Menu matching Screenshot #2: Sign in with NBA ID, Hide Scores, Help */}
            {isSignInDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-[#FFFFFF] text-[#111318] rounded-xl shadow-2xl border border-black/10 overflow-hidden z-50">
                {session.isSignedIn ? (
                  <div className="p-3.5 border-b border-gray-200 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-900 truncate">
                        {session.email}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                        Active
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      {session.subscriptionTier}
                    </p>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setIsSignInDropdownOpen(false);
                      setIsSignInModalOpen(true);
                    }}
                    className="w-full px-4 py-3.5 text-left text-sm font-semibold text-gray-900 hover:bg-gray-100 transition-colors border-b border-gray-200 flex items-center justify-between cursor-pointer"
                  >
                    <span>Sign in with NBA ID</span>
                    <Lock className="w-3.5 h-3.5 text-gray-500" />
                  </button>
                )}

                {/* Hide Scores Row inside dropdown (exact match to screenshot #2) */}
                <div
                  onClick={() => handleToggleHideScores()}
                  className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-gray-100 transition-colors border-b border-gray-200 cursor-pointer"
                >
                  <span className="text-sm font-medium text-gray-800">Hide Scores</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={hideScores}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleHideScores();
                    }}
                    className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${
                      hideScores ? 'bg-[#E03A3E]' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`block w-4 h-4 rounded-full bg-white shadow transform transition-transform top-0.5 absolute ${
                        hideScores ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowHelpBanner((prev) => !prev);
                    setIsSignInDropdownOpen(false);
                  }}
                  className="w-full px-4 py-3 text-left text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors flex items-center justify-between cursor-pointer"
                >
                  <span>Help</span>
                  <HelpCircle className="w-3.5 h-3.5 text-gray-400" />
                </button>

                {session.isSignedIn && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setIsSignInDropdownOpen(false);
                        setIsSignInModalOpen(true);
                      }}
                      className="w-full px-4 py-2.5 text-left text-xs font-semibold text-indigo-600 hover:bg-gray-100 border-t border-gray-200 cursor-pointer"
                    >
                      Switch NBA ID Account...
                    </button>
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="w-full px-4 py-2.5 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 border-t border-gray-200 flex items-center gap-1.5 cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Sign Out
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Optional In-App Help Banner explaining native app link blocker & Widevine */}
      {showHelpBanner && (
        <div className="bg-[#151924] border-b border-white/10 px-6 py-3 flex items-center justify-between text-xs text-white/80 shrink-0">
          <div className="flex items-center gap-3">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>In-App Protection Active:</strong> All NBA.com links and League Pass streams are intercepted inside AA Browser so your phone never launches the native NBA app. Tap any matchup tile below to choose Home, Away, or Mobile View streams.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowHelpBanner(false)}
            className="text-white/50 hover:text-white font-bold ml-4 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Content Area: Either Custom Car Wrapper or Sandboxed In-App Raw Frame */}
      {viewMode === 'raw_sandbox' ? (
        <div className="flex-1 flex flex-col bg-black relative">
          <div className="bg-[#11141D] px-4 py-2 border-b border-white/10 flex items-center justify-between text-xs text-white/70">
            <span>
              Sandboxed In-App View (<code className="text-amber-300">{url}</code>) — Android App Links Blocked
            </span>
            <button
              type="button"
              onClick={() => setViewMode('wrapper')}
              className="px-3 py-1 rounded-lg bg-amber-500 text-black font-bold hover:bg-amber-400 transition-colors cursor-pointer"
            >
              Return to Car Game Tiles Wrapper
            </button>
          </div>
          <iframe
            src={url}
            title="NBA Sandboxed In-App View"
            className="w-full flex-1 border-0 bg-black"
            sandbox="allow-same-origin allow-scripts allow-forms allow-presentation"
            allow="encrypted-media; autoplay; fullscreen"
          />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-5">
          {/* Sub-Header Controls Card: Date Picker + Hide Scores + Team Filter (Matches Screenshot #1) */}
          <section className="bg-[#131722] border border-white/10 rounded-2xl p-4 sm:p-5 shadow-xl">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-white/10">
              <div>
                <h1 className="text-lg sm:text-xl font-black tracking-tight text-white uppercase">
                  NBA Games &amp; Scores
                </h1>
                <p className="text-xs text-white/55 mt-0.5">
                  {selectedDateObj.dayOfWeek}, {selectedDateObj.monthLabel.split(' ')[0]} {selectedDateObj.dayNumber}, 2026 · Select a game tile to choose Home, Away, or Mobile View stream
                </p>
              </div>

              {/* Search & Spoiler Toggle Bar */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 sm:flex-initial sm:w-52">
                  <Search className="w-3.5 h-3.5 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filter team (e.g. LAL, OKC)..."
                    className="w-full bg-[#0B0D13] border border-white/10 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder:text-white/35 focus:outline-none focus:border-white/30"
                  />
                </div>

                {/* Prominent HIDE SCORES Switch */}
                <div
                  onClick={() => handleToggleHideScores()}
                  className="flex items-center gap-2.5 bg-[#0B0D13] border border-white/10 px-3.5 py-2 rounded-xl cursor-pointer hover:border-white/25 transition-colors"
                >
                  {hideScores ? (
                    <EyeOff className="w-4 h-4 text-rose-400" />
                  ) : (
                    <Eye className="w-4 h-4 text-white/60" />
                  )}
                  <span className="text-xs font-bold uppercase tracking-wider text-white/85">
                    Hide Scores
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={hideScores}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleHideScores();
                    }}
                    className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${
                      hideScores ? 'bg-[#E03A3E]' : 'bg-white/20'
                    }`}
                  >
                    <span
                      className={`block w-4 h-4 rounded-full bg-white shadow transform transition-transform top-0.5 absolute ${
                        hideScores ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Date Strip Scroller + My Favorite Teams Filter */}
            <div className="pt-4 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
              {/* Calendar & 7-Day Horizontal Scroller */}
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/75 text-xs font-semibold shrink-0">
                  <Calendar className="w-4 h-4 text-amber-400" />
                  <span>{selectedDateObj.monthLabel}</span>
                </div>

                <button
                  type="button"
                  onClick={() => stepDate(-1)}
                  disabled={dateStrip[0]?.dateKey === selectedDate}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 text-white transition-colors cursor-pointer shrink-0"
                  title="Previous Day"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-1.5">
                  {dateStrip.map((d) => {
                    const isSelected = d.dateKey === selectedDate;
                    return (
                      <button
                        key={d.dateKey}
                        type="button"
                        onClick={() => setSelectedDate(d.dateKey)}
                        className={`min-w-[64px] px-3 py-2 rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer border ${
                          isSelected
                            ? 'bg-white text-[#0B0D13] border-white font-black shadow-md'
                            : 'bg-[#0B0D13] text-white/65 border-white/10 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        <span className="text-[10px] uppercase tracking-wider font-bold opacity-75">
                          {d.dayOfWeek}
                        </span>
                        <span className="text-sm font-black tabular-nums mt-0.5">
                          {d.dayNumber}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => stepDate(1)}
                  disabled={dateStrip[dateStrip.length - 1]?.dateKey === selectedDate}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 text-white transition-colors cursor-pointer shrink-0"
                  title="Next Day"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* My Favorite Teams / All Games Segmented Filter */}
              <div className="flex items-center gap-2 self-start xl:self-auto shrink-0">
                <button
                  type="button"
                  onClick={() => setFavoriteTeamsOnly(true)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 border transition-all cursor-pointer ${
                    favoriteTeamsOnly
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-[#0B0D13] text-white/60 border-white/10 hover:text-white'
                  }`}
                >
                  <Star
                    className={`w-3.5 h-3.5 ${
                      favoriteTeamsOnly ? 'fill-amber-400 text-amber-400' : ''
                    }`}
                  />
                  My Favorite Teams ({favoriteTricodes.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFavoriteTeamsOnly(false)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all cursor-pointer ${
                    !favoriteTeamsOnly
                      ? 'bg-white text-black border-white'
                      : 'bg-[#0B0D13] text-white/60 border-white/10 hover:text-white'
                  }`}
                >
                  All Games ({allGamesForDate.length})
                </button>
              </div>
            </div>
          </section>

          {/* Parsed Game Cards List */}
          <div className="space-y-4 pb-8">
            {filteredGames.length === 0 ? (
              <div className="bg-[#131722] border border-white/10 rounded-2xl p-10 text-center">
                <p className="text-base font-bold text-white">
                  No matching games found for {selectedDateObj.dayOfWeek}, {selectedDateObj.monthLabel}
                </p>
                <p className="text-xs text-white/50 mt-1">
                  Try switching back to &ldquo;All Games&rdquo; or clearing your team search filter.
                </p>
                {favoriteTeamsOnly && (
                  <button
                    type="button"
                    onClick={() => setFavoriteTeamsOnly(false)}
                    className="mt-4 px-4 py-2 rounded-xl bg-white text-black text-xs font-bold cursor-pointer"
                  >
                    Show All Games
                  </button>
                )}
              </div>
            ) : (
              filteredGames.map((game) => {
                const isUpcoming = game.gameStatus === 1;
                const isLive = game.gameStatus === 2;
                const isFinal = game.gameStatus === 3;
                const awayIsWinner = !isUpcoming && game.awayTeam.score > game.homeTeam.score;
                const homeIsWinner = !isUpcoming && game.homeTeam.score > game.awayTeam.score;

                return (
                  <article
                    key={game.gameId}
                    onClick={() => openGameModal(game, 'watch')}
                    className="bg-[#131722] hover:bg-[#171C29] border border-white/10 hover:border-white/25 rounded-2xl p-4 sm:p-5 transition-all shadow-lg cursor-pointer group"
                  >
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
                      {/* Left 5 Columns: Matchup Teams, Logos, Records, and Scores */}
                      <div className="lg:col-span-5 flex items-center justify-between gap-4 lg:border-r lg:border-white/10 lg:pr-6">
                        <div className="flex-1 space-y-3.5">
                          {/* Away Team Row */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 min-w-0">
                              <button
                                type="button"
                                onClick={(e) => toggleFavoriteTeam(game.awayTeam.tricode, e)}
                                className="text-white/30 hover:text-amber-400 transition-colors cursor-pointer"
                                title={`Favorite ${game.awayTeam.name}`}
                              >
                                <Star
                                  className={`w-4 h-4 ${
                                    favoriteTricodes.includes(game.awayTeam.tricode)
                                      ? 'fill-amber-400 text-amber-400'
                                      : ''
                                  }`}
                                />
                              </button>
                              <NbaTeamLogo
                                teamId={game.awayTeam.teamId}
                                tricode={game.awayTeam.tricode}
                                primaryColor={game.awayTeam.primaryColor}
                                size="md"
                              />
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`text-base font-black tracking-tight truncate ${
                                      awayIsWinner || hideScores
                                        ? 'text-white'
                                        : 'text-white/65'
                                    }`}
                                  >
                                    {game.awayTeam.name}
                                  </span>
                                </div>
                                <span className="text-xs text-white/45 font-medium tabular-nums">
                                  {game.awayTeam.record} · Away
                                </span>
                              </div>
                            </div>

                            {/* Away Score */}
                            <div className="flex items-center gap-2">
                              {hideScores ? (
                                <span className="text-sm font-bold text-white/35 bg-white/5 px-2.5 py-1 rounded-lg">
                                  HIDDEN
                                </span>
                              ) : isUpcoming ? (
                                <span className="text-sm font-semibold text-white/40 tabular-nums">
                                  —
                                </span>
                              ) : (
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className={`text-2xl font-black tabular-nums ${
                                      awayIsWinner ? 'text-white' : 'text-white/45'
                                    }`}
                                  >
                                    {game.awayTeam.score}
                                  </span>
                                  {awayIsWinner && (
                                    <span className="text-white text-xs">◀</span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Home Team Row */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 min-w-0">
                              <button
                                type="button"
                                onClick={(e) => toggleFavoriteTeam(game.homeTeam.tricode, e)}
                                className="text-white/30 hover:text-amber-400 transition-colors cursor-pointer"
                                title={`Favorite ${game.homeTeam.name}`}
                              >
                                <Star
                                  className={`w-4 h-4 ${
                                    favoriteTricodes.includes(game.homeTeam.tricode)
                                      ? 'fill-amber-400 text-amber-400'
                                      : ''
                                  }`}
                                />
                              </button>
                              <NbaTeamLogo
                                teamId={game.homeTeam.teamId}
                                tricode={game.homeTeam.tricode}
                                primaryColor={game.homeTeam.primaryColor}
                                size="md"
                              />
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`text-base font-black tracking-tight truncate ${
                                      homeIsWinner || hideScores
                                        ? 'text-white'
                                        : 'text-white/65'
                                    }`}
                                  >
                                    {game.homeTeam.name}
                                  </span>
                                </div>
                                <span className="text-xs text-white/45 font-medium tabular-nums">
                                  {game.homeTeam.record} · Home
                                </span>
                              </div>
                            </div>

                            {/* Home Score */}
                            <div className="flex items-center gap-2">
                              {hideScores ? (
                                <span className="text-sm font-bold text-white/35 bg-white/5 px-2.5 py-1 rounded-lg">
                                  HIDDEN
                                </span>
                              ) : isUpcoming ? (
                                <span className="text-sm font-semibold text-white/40 tabular-nums">
                                  —
                                </span>
                              ) : (
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className={`text-2xl font-black tabular-nums ${
                                      homeIsWinner ? 'text-white' : 'text-white/45'
                                    }`}
                                  >
                                    {game.homeTeam.score}
                                  </span>
                                  {homeIsWinner && (
                                    <span className="text-white text-xs">◀</span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Status / Broadcaster Column */}
                        <div className="pl-3 flex flex-col items-end justify-center text-right shrink-0">
                          <span
                            className={`text-xs font-black uppercase tracking-wider ${
                              isLive
                                ? 'text-rose-400'
                                : isFinal
                                ? 'text-white/80'
                                : 'text-amber-300'
                            }`}
                          >
                            {game.gameStatusText}
                          </span>
                          <span className="text-[11px] font-semibold text-white/45 mt-1">
                            {game.isLeaguePass ? 'League Pass' : 'National TV'}
                          </span>
                          <span className="text-[10px] text-white/35 mt-0.5">
                            {game.streams.length} feeds available
                          </span>
                        </div>
                      </div>

                      {/* Middle 4 Columns: GAME LEADERS (Matches Screenshot #1 with PTS / REB / AST) */}
                      <div className="lg:col-span-4 lg:border-r lg:border-white/10 lg:pr-6">
                        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-white/45 mb-2.5">
                          <span>Game Leaders</span>
                          <div className="flex items-center gap-4 tabular-nums">
                            <span className="w-6 text-right">PTS</span>
                            <span className="w-6 text-right">REB</span>
                            <span className="w-6 text-right">AST</span>
                          </div>
                        </div>

                        <div className="space-y-2.5">
                          {[game.awayTeam.leader, game.homeTeam.leader].map((leader) => (
                            <div
                              key={`${game.gameId}-${leader.teamTricode}-${leader.name}`}
                              className="flex items-center justify-between text-xs"
                            >
                              <div className="min-w-0 pr-2">
                                <p className="font-bold text-white truncate">
                                  {leader.name}
                                </p>
                                <p className="text-[11px] text-white/45">
                                  {leader.teamTricode} · #{leader.jerseyNumber} · {leader.position}
                                </p>
                              </div>

                              {hideScores && !isUpcoming ? (
                                <span className="text-[11px] font-semibold text-white/35">
                                  Stats Hidden
                                </span>
                              ) : (
                                <div className="flex items-center gap-4 font-bold tabular-nums text-white/90">
                                  <span className="w-6 text-right">{leader.points}</span>
                                  <span className="w-6 text-right">{leader.rebounds}</span>
                                  <span className="w-6 text-right">{leader.assists}</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Right 3 Columns: Stream Quick-Select Badges + WATCH / BOX SCORE / GAME DETAILS */}
                      <div className="lg:col-span-3 flex flex-col justify-between gap-3">
                        {/* Available Multi-View Stream Feeds */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[11px] text-white/55 font-medium">
                            Streams:
                          </span>
                          <span className="text-[11px] font-semibold text-amber-300">
                            Home ({game.homeTeam.tricode}) · Away ({game.awayTeam.tricode}) · Mobile View
                          </span>
                        </div>

                        {/* Primary WATCH Button + Secondary Actions */}
                        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openGameModal(game, 'watch');
                            }}
                            className="flex-1 min-h-[46px] px-4 py-2.5 rounded-xl bg-white hover:bg-amber-400 text-[#0B0D13] font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors shadow-md cursor-pointer"
                          >
                            <Play className="w-4 h-4 fill-current" />
                            <span>Watch</span>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openGameModal(game, 'boxscore');
                            }}
                            className="min-h-[46px] px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-white/85 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                            title="View Box Score"
                          >
                            <BarChart2 className="w-3.5 h-3.5 text-white/60" />
                            <span>Box Score</span>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openGameModal(game, 'details');
                            }}
                            className="min-h-[46px] px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-white/85 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                            title="View Game Details & Arena Info"
                          >
                            <FileText className="w-3.5 h-3.5 text-white/60" />
                            <span className="hidden xl:inline">Details</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Top-Right NBA ID Sign-In Modal */}
      <NbaSignInModal
        isOpen={isSignInModalOpen}
        onClose={() => setIsSignInModalOpen(false)}
        session={session}
        drmL3Enabled={drmL3Enforcer}
        onSaveSession={handleSaveSession}
      />

      {/* Multi-Stream Selector & Video Player Modal */}
      {activeGame && (
        <NbaStreamPlayerModal
          game={activeGame}
          initialTab={activeModalTab}
          hideScores={hideScores}
          drmL3Enforcer={drmL3Enforcer}
          session={session}
          onOpenSignIn={() => setIsSignInModalOpen(true)}
          onClose={() => setActiveGame(null)}
        />
      )}
    </div>
  );
};
