import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  UserCheck,
  User,
  Tv,
  ShieldCheck,
  Play,
  BarChart3,
  Info,
  Globe,
  SlidersHorizontal,
  Calendar,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { NbaGame, NbaUserSession } from '../../types/nba';
import {
  fetchGamesForDate,
  getGamesForDateSync,
  loadHideScoresPref,
  loadNbaSession,
  openNbaTopLevelInApp,
  saveHideScoresPref,
  saveNbaSession,
} from '../../services/nbaService';
import { logDiagnosticEvent } from '../../services/diagnosticsService';
import { NbaTeamLogo } from './NbaTeamLogo';
import { NbaSignInModal } from './NbaSignInModal';
import { NbaStreamPlayerModal } from './NbaStreamPlayerModal';

interface NbaLeaguePassWrapperProps {
  url: string;
  drmL3Enforcer: boolean;
  onNavigate: (url: string) => void;
}

const DEFAULT_SHOWCASE_DATES = [
  '2026-10-25',
  '2026-10-26',
  '2026-10-27',
  '2026-10-28',
  '2026-10-29',
  '2026-10-30',
  '2026-10-31',
];

function addDaysToDateKey(dateKey: string, deltaDays: number): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, (d || 1) + deltaDays);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

function getTodayDateKey(): string {
  const now = new Date();
  const yy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

function buildSevenDayWindow(centerOrSelectedDate: string): string[] {
  if (DEFAULT_SHOWCASE_DATES.includes(centerOrSelectedDate)) {
    return DEFAULT_SHOWCASE_DATES;
  }
  const days: string[] = [];
  for (let offset = -3; offset <= 3; offset++) {
    days.push(addDaysToDateKey(centerOrSelectedDate, offset));
  }
  return days;
}

function formatDateChip(dateKey: string): { dayName: string; monthDay: string; fullLabel: string } {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dateObj = new Date(y, (m || 1) - 1, d || 1);
  const dayName = dateObj
    .toLocaleDateString('en-US', { weekday: 'short' })
    .toUpperCase();
  const monthName = dateObj
    .toLocaleDateString('en-US', { month: 'short' })
    .toUpperCase();
  const fullLabel = dateObj.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  return {
    dayName,
    monthDay: `${monthName} ${d}`,
    fullLabel,
  };
}

export const NbaLeaguePassWrapper: React.FC<NbaLeaguePassWrapperProps> = ({
  url,
  drmL3Enforcer,
  onNavigate,
}) => {
  const [selectedDate, setSelectedDate] = useState<string>('2026-10-25');
  const [games, setGames] = useState<NbaGame[]>(() => getGamesForDateSync('2026-10-25'));
  const [scheduleSource, setScheduleSource] = useState<'live_api' | 'curated'>('curated');
  const [isLoadingGames, setIsLoadingGames] = useState<boolean>(false);

  const [hideScores, setHideScores] = useState<boolean>(() => loadHideScoresPref());
  const [session, setSession] = useState<NbaUserSession>(() => loadNbaSession());
  const [isSignInOpen, setIsSignInOpen] = useState<boolean>(() =>
    url.toLowerCase().includes('sign-in') || url.toLowerCase().includes('login')
  );

  // Selected game and initial tab for the full-screen stream player modal
  const [activeGameModal, setActiveGameModal] = useState<{
    game: NbaGame;
    tab: 'watch' | 'boxscore' | 'details';
  } | null>(null);

  // Toggle between Custom Car Wrapper and Top-Level Official NBA.com Mode
  const [viewMode, setViewMode] = useState<'wrapper' | 'official_web'>('wrapper');

  // Compact Utility Popover Menu state
  const [isUtilityMenuOpen, setIsUtilityMenuOpen] = useState<boolean>(false);
  const utilityMenuRef = useRef<HTMLDivElement>(null);

  // Close utility popover on outside click
  useEffect(() => {
    if (!isUtilityMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (utilityMenuRef.current && !utilityMenuRef.current.contains(e.target as Node)) {
        setIsUtilityMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isUtilityMenuOpen]);

  // Whenever selectedDate changes, immediately update games synchronously AND fetch live API schedule
  useEffect(() => {
    let cancelled = false;
    logDiagnosticEvent('NBA_DATE_CHANGE', `Selected NBA schedule date: ${selectedDate}`);

    // 1. Immediate synchronous update so date switching feels instant
    const syncGames = getGamesForDateSync(selectedDate);
    setGames(syncGames);
    setScheduleSource('curated');

    // 2. Async live API check (fetches real NBA scoreboard when available for that date)
    setIsLoadingGames(true);
    fetchGamesForDate(selectedDate)
      .then((res) => {
        if (!cancelled) {
          setGames(res.games);
          setScheduleSource(res.source);
          setIsLoadingGames(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setIsLoadingGames(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedDate]);

  const dateStripWindow = useMemo(() => buildSevenDayWindow(selectedDate), [selectedDate]);

  const handleSelectDate = (newDateKey: string) => {
    if (!newDateKey) return;
    setSelectedDate(newDateKey);
  };

  const handleToggleHideScores = () => {
    setHideScores((prev) => {
      const next = !prev;
      saveHideScoresPref(next);
      return next;
    });
  };

  const handleSignInSuccess = (newSession: NbaUserSession) => {
    setSession(newSession);
    saveNbaSession(newSession);
  };

  const handleSignOut = () => {
    const signedOut: NbaUserSession = {
      isSignedIn: false,
      email: '',
      displayName: 'Guest',
      subscriptionTier: 'NBA ID Guest',
    };
    setSession(signedOut);
    saveNbaSession(signedOut);
  };

  const handlePrevDate = () => {
    setSelectedDate((prev) => addDaysToDateKey(prev, -1));
  };

  const handleNextDate = () => {
    setSelectedDate((prev) => addDaysToDateKey(prev, 1));
  };

  const selectedDateInfo = useMemo(() => formatDateChip(selectedDate), [selectedDate]);

  // If a game stream / box score / details modal is active, render it full-bleed
  if (activeGameModal) {
    return (
      <>
        <NbaStreamPlayerModal
          game={activeGameModal.game}
          initialTab={activeGameModal.tab}
          hideScores={hideScores}
          drmL3Enforcer={drmL3Enforcer}
          session={session}
          onOpenSignIn={() => setIsSignInOpen(true)}
          onClose={() => setActiveGameModal(null)}
        />
        <NbaSignInModal
          isOpen={isSignInOpen}
          session={session}
          onClose={() => setIsSignInOpen(false)}
          onSignInSuccess={handleSignInSuccess}
          onSignOut={handleSignOut}
          onNavigateInApp={onNavigate}
        />
      </>
    );
  }

  return (
    <div className="w-full h-full bg-[#0B0D13] text-white flex flex-col overflow-hidden select-none">
      {/* Top NBA League Pass Header Bar */}
      <header className="bg-[#12151E] border-b border-neutral-800/90 px-4 py-2.5 flex items-center justify-between gap-3 shrink-0 z-20">
        {/* Left: Official NBA Brand & Title */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-[#1D428A] to-[#C8102E] font-black text-xs tracking-wider text-white shadow shrink-0">
            NBA
          </div>
          <div className="truncate">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm sm:text-base tracking-tight text-white">
                GAMES · LEAGUE PASS
              </span>
            </div>
            <div className="text-[11px] text-neutral-400 truncate">
              {selectedDateInfo.fullLabel} · {games.length} Games Available
              {scheduleSource === 'live_api' ? ' · Live NBA Feed' : ''}
            </div>
          </div>
        </div>

        {/* Right: Primary Controls (Hide Scores Toggle + NBA ID Sign-In + Utility Menu) */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Hide Scores Spoiler Toggle Switch */}
          <button
            type="button"
            onClick={handleToggleHideScores}
            className={`min-h-[44px] px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all bouncy-tap ${
              hideScores
                ? 'bg-amber-500/15 border-amber-500/50 text-amber-300'
                : 'bg-neutral-900 hover:bg-neutral-800 border-neutral-800 text-neutral-300'
            }`}
            title="Toggle Hide Scores to prevent game spoilers"
          >
            {hideScores ? (
              <EyeOff className="w-4 h-4 text-amber-400" />
            ) : (
              <Eye className="w-4 h-4 text-neutral-400" />
            )}
            <span className="hidden sm:inline">Hide Scores</span>
            <div
              className={`w-8 h-4 rounded-full p-0.5 transition-colors flex items-center ${
                hideScores ? 'bg-amber-500 justify-end' : 'bg-neutral-700 justify-start'
              }`}
            >
              <div className="w-3 h-3 rounded-full bg-white shadow" />
            </div>
          </button>

          {/* Top-Right NBA ID Sign-In / Account Button */}
          <button
            type="button"
            onClick={() => setIsSignInOpen(true)}
            className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all bouncy-tap shadow ${
              session.isSignedIn
                ? 'bg-emerald-950/60 hover:bg-emerald-900/70 text-emerald-300 border border-emerald-700/50'
                : 'bg-amber-500 hover:bg-amber-400 text-black'
            }`}
          >
            {session.isSignedIn ? (
              <>
                <UserCheck className="w-4 h-4 text-emerald-400" />
                <span className="max-w-[110px] truncate">{session.displayName}</span>
              </>
            ) : (
              <>
                <User className="w-4 h-4" />
                <span>Sign In · NBA ID</span>
              </>
            )}
          </button>

          {/* Compact Utility Menu Button */}
          <div className="relative" ref={utilityMenuRef}>
            <button
              type="button"
              onClick={() => setIsUtilityMenuOpen((prev) => !prev)}
              className={`min-w-[44px] min-h-[44px] p-2.5 rounded-xl border flex items-center justify-center transition-colors bouncy-tap ${
                isUtilityMenuOpen
                  ? 'bg-neutral-800 border-amber-500/50 text-amber-400'
                  : 'bg-neutral-900 hover:bg-neutral-800 border-neutral-800 text-neutral-300'
              }`}
              title="Stream & View Options"
              aria-label="Stream and View Options"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>

            {isUtilityMenuOpen && (
              <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-[#161924] border border-neutral-700/80 shadow-2xl p-3 z-40 space-y-2.5 text-xs">
                <div className="px-2 py-1 text-[11px] font-bold text-neutral-400 border-b border-neutral-800">
                  VIEW &amp; DRM SETTINGS
                </div>

                {/* Switch between Custom Car Wrapper and Official Top-Level NBA.com Mode */}
                <button
                  type="button"
                  onClick={() => {
                    setViewMode(viewMode === 'wrapper' ? 'official_web' : 'wrapper');
                    setIsUtilityMenuOpen(false);
                  }}
                  className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 flex items-center justify-between text-left font-semibold text-white bouncy-tap"
                >
                  <span className="flex items-center gap-2">
                    {viewMode === 'wrapper' ? (
                      <>
                        <Globe className="w-4 h-4 text-amber-400" />
                        <span>Official NBA.com Web Mode</span>
                      </>
                    ) : (
                      <>
                        <Tv className="w-4 h-4 text-amber-400" />
                        <span>Return to Car Tile Wrapper</span>
                      </>
                    )}
                  </span>
                  <span className="text-[10px] text-neutral-400">Switch</span>
                </button>

                {/* Status Readout */}
                <div className="p-2.5 rounded-xl bg-neutral-950/80 border border-neutral-800/80 space-y-1">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>
                      {drmL3Enforcer ? 'Widevine L3 Enforced' : 'Standard Widevine DRM'}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-400 leading-relaxed">
                    External mobile NBA app intents (<code className="text-neutral-300">nba://</code>) are blocked so playback stays inside AA Browser.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Date Navigation Strip (Only in Wrapper Mode) */}
      {viewMode === 'wrapper' && (
        <div className="bg-[#151924] border-b border-neutral-800/80 px-4 py-2 flex items-center justify-between gap-2 shrink-0 overflow-x-auto">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handlePrevDate}
              className="min-w-[40px] min-h-[40px] p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 flex items-center justify-center bouncy-tap border border-neutral-800"
              title="Previous Date"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1.5">
              {dateStripWindow.map((dKey) => {
                const { dayName, monthDay } = formatDateChip(dKey);
                const isSelected = dKey === selectedDate;
                const dayGamesCount = getGamesForDateSync(dKey).length;
                return (
                  <button
                    type="button"
                    key={dKey}
                    onClick={() => handleSelectDate(dKey)}
                    className={`min-w-[78px] min-h-[44px] px-3 py-1 rounded-xl flex flex-col items-center justify-center transition-all bouncy-tap border ${
                      isSelected
                        ? 'bg-amber-500 text-black border-amber-400 font-extrabold shadow-md'
                        : 'bg-neutral-900/90 hover:bg-neutral-800 text-neutral-300 border-neutral-800/90'
                    }`}
                  >
                    <span
                      className={`text-[10px] tracking-wider ${
                        isSelected ? 'text-black/80 font-extrabold' : 'text-neutral-400 font-semibold'
                      }`}
                    >
                      {dayName}
                    </span>
                    <span className="text-xs font-mono tabular-nums">{monthDay}</span>
                    <span
                      className={`text-[9px] mt-0.5 ${
                        isSelected ? 'text-black/75 font-bold' : 'text-neutral-500'
                      }`}
                    >
                      {dayGamesCount} GMS
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={handleNextDate}
              className="min-w-[40px] min-h-[40px] p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 flex items-center justify-center bouncy-tap border border-neutral-800"
              title="Next Date"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Right: Jump to Today (Live) + Native Date Input */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleSelectDate('2026-10-26')}
              className={`min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border bouncy-tap ${
                selectedDate === '2026-10-26'
                  ? 'bg-red-500/20 border-red-500/50 text-red-300'
                  : 'bg-neutral-900 hover:bg-neutral-800 border-neutral-800 text-neutral-300'
              }`}
              title="View Live Showcase Slate (Oct 26)"
            >
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span>Live Slate</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectDate(getTodayDateKey())}
              className="min-h-[40px] px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs font-bold text-amber-400 flex items-center gap-1.5 bouncy-tap"
              title="Jump to Today's Real Calendar Date"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Today</span>
            </button>

            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                if (e.target.value) {
                  handleSelectDate(e.target.value);
                }
              }}
              className="min-h-[40px] bg-neutral-900 border border-neutral-800 rounded-xl px-2.5 py-1 text-xs text-neutral-200 font-mono focus:outline-none focus:border-amber-500 select-text"
            />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {viewMode === 'official_web' ? (
        /* Top-Level Official NBA.com Mode (Replaces broken X-Frame-Options <iframe>) */
        <div className="flex-1 w-full bg-[#090B10] flex flex-col items-center justify-center p-6 overflow-y-auto">
          <div className="max-w-xl w-full bg-[#12151E] border border-neutral-800 rounded-3xl p-6 space-y-5 shadow-2xl">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                <Globe className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-white">
                  Official NBA.com Full-Page WebView Mode
                </h3>
                <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                  NBA.com blocks embedded <code className="text-amber-300">&lt;iframe&gt;</code> frames via <code className="text-amber-300">X-Frame-Options: SAMEORIGIN</code> (which previously displayed a broken Android icon). Use the buttons below to open the real <span className="text-white font-semibold">nba.com</span> website as the top-level page inside AA Browser with a persistent top bar to return here anytime.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => openNbaTopLevelInApp('https://www.nba.com/games')}
                className="min-h-[52px] px-4 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg bouncy-tap"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Open NBA.com/Games (Top-Level)</span>
              </button>

              <button
                type="button"
                onClick={() => openNbaTopLevelInApp('https://www.nba.com/account/sign-in')}
                className="min-h-[52px] px-4 py-3 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs flex items-center justify-center gap-2 border border-neutral-700 bouncy-tap"
              >
                <User className="w-4 h-4 text-amber-400" />
                <span>Open NBA.com Sign-In (Top-Level)</span>
              </button>
            </div>

            <div className="pt-2 border-t border-neutral-800 flex items-center justify-between">
              <span className="text-[11px] text-neutral-400">
                Widevine L3 Enforcer &amp; Native App Blocker Active
              </span>
              <button
                type="button"
                onClick={() => setViewMode('wrapper')}
                className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-amber-400 font-bold text-xs bouncy-tap"
              >
                ← Back to Car Game Tiles
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Car-Optimized NBA Games Tile Grid */
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          <div className="max-w-7xl mx-auto">
            {/* Active Date Banner so user sees immediate confirmation when changing dates */}
            <div className="flex items-center justify-between mb-3.5 px-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold uppercase tracking-wider text-amber-400">
                  {selectedDateInfo.fullLabel}
                </span>
                <span className="text-xs text-neutral-500">·</span>
                <span className="text-xs font-semibold text-neutral-300">
                  {games.length} Matchups
                </span>
              </div>
              {isLoadingGames && (
                <div className="flex items-center gap-1.5 text-xs text-amber-400">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Syncing schedule...</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {games.map((game) => {
                const isLive = game.gameStatus === 2;
                const isFinal = game.gameStatus === 3;
                const awayWon = isFinal && game.awayTeam.score > game.homeTeam.score;
                const homeWon = isFinal && game.homeTeam.score > game.awayTeam.score;

                return (
                  <div
                    key={game.gameId}
                    className="bg-[#141824] hover:bg-[#181D2B] border border-neutral-800/90 hover:border-neutral-700 rounded-3xl p-4 sm:p-5 transition-all shadow-xl flex flex-col justify-between gap-4"
                  >
                    {/* Card Top Status & Broadcaster Header */}
                    <div className="flex items-center justify-between border-b border-neutral-800/80 pb-2.5">
                      <div className="flex items-center gap-2">
                        {isLive && (
                          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        )}
                        <span
                          className={`text-xs font-extrabold tracking-wider ${
                            isLive
                              ? 'text-red-400'
                              : isFinal
                              ? 'text-neutral-300'
                              : 'text-amber-400'
                          }`}
                        >
                          {game.gameStatusText}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-neutral-400 font-semibold">
                        <Tv className="w-3.5 h-3.5 text-amber-400" />
                        <span>{game.nationalBroadcaster || 'NBA League Pass'}</span>
                      </div>
                    </div>

                    {/* Middle Section: Matchup Teams + Scores (Left) | Game Leaders (Right) */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                      {/* Teams & Scores (7 cols) */}
                      <div className="md:col-span-7 space-y-3 md:border-r border-neutral-800/80 md:pr-4">
                        {/* Away Team Row */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-3 min-w-0">
                            <NbaTeamLogo
                              teamId={game.awayTeam.teamId}
                              tricode={game.awayTeam.tricode}
                              primaryColor={game.awayTeam.primaryColor}
                              size="md"
                            />
                            <div className="truncate">
                              <div
                                className={`text-base font-extrabold truncate ${
                                  awayWon || !isFinal ? 'text-white' : 'text-neutral-400'
                                }`}
                              >
                                {game.awayTeam.name}
                              </div>
                              <div className="text-xs text-neutral-400 font-mono">
                                {game.awayTeam.record}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span
                              className={`text-2xl font-black font-mono tabular-nums ${
                                hideScores
                                  ? 'text-neutral-500'
                                  : awayWon
                                  ? 'text-white'
                                  : isFinal
                                  ? 'text-neutral-400'
                                  : 'text-white'
                              }`}
                            >
                              {hideScores
                                ? '•••'
                                : game.gameStatus === 1
                                ? '—'
                                : game.awayTeam.score}
                            </span>
                            {!hideScores && awayWon && (
                              <span className="text-amber-400 text-xs">◀</span>
                            )}
                          </div>
                        </div>

                        {/* Home Team Row */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-3 min-w-0">
                            <NbaTeamLogo
                              teamId={game.homeTeam.teamId}
                              tricode={game.homeTeam.tricode}
                              primaryColor={game.homeTeam.primaryColor}
                              size="md"
                            />
                            <div className="truncate">
                              <div
                                className={`text-base font-extrabold truncate ${
                                  homeWon || !isFinal ? 'text-white' : 'text-neutral-400'
                                }`}
                              >
                                {game.homeTeam.name}
                              </div>
                              <div className="text-xs text-neutral-400 font-mono">
                                {game.homeTeam.record}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span
                              className={`text-2xl font-black font-mono tabular-nums ${
                                hideScores
                                  ? 'text-neutral-500'
                                  : homeWon
                                  ? 'text-white'
                                  : isFinal
                                  ? 'text-neutral-400'
                                  : 'text-white'
                              }`}
                            >
                              {hideScores
                                ? '•••'
                                : game.gameStatus === 1
                                ? '—'
                                : game.homeTeam.score}
                            </span>
                            {!hideScores && homeWon && (
                              <span className="text-amber-400 text-xs">◀</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Game Leaders Table (5 cols) */}
                      <div className="md:col-span-5 space-y-2 text-xs">
                        <div className="flex items-center justify-between text-[10px] font-bold text-neutral-400 border-b border-neutral-800/70 pb-1">
                          <span>GAME LEADERS</span>
                          <div className="flex items-center gap-3 font-mono">
                            <span className="w-6 text-right">PTS</span>
                            <span className="w-6 text-right">REB</span>
                            <span className="w-6 text-right">AST</span>
                          </div>
                        </div>

                        {[game.awayTeam.leader, game.homeTeam.leader].map((leader) => (
                          <div
                            key={`${game.gameId}-${leader.teamTricode}-${leader.name}`}
                            className="flex items-center justify-between gap-2 py-0.5"
                          >
                            <div className="truncate min-w-0">
                              <div className="font-bold text-neutral-200 truncate">
                                {leader.name}
                              </div>
                              <div className="text-[10px] text-neutral-400">
                                {leader.teamTricode} · #{leader.jerseyNumber} {leader.position}
                              </div>
                            </div>

                            <div className="flex items-center gap-3 font-mono tabular-nums font-bold text-white shrink-0">
                              <span className="w-6 text-right">
                                {hideScores ? '••' : leader.points}
                              </span>
                              <span className="w-6 text-right text-neutral-300">
                                {hideScores ? '••' : leader.rebounds}
                              </span>
                              <span className="w-6 text-right text-neutral-300">
                                {hideScores ? '••' : leader.assists}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Bottom Action Buttons: WATCH (Primary) · BOX SCORE · GAME DETAILS */}
                    <div className="pt-2 border-t border-neutral-800/80 grid grid-cols-3 gap-2.5">
                      <button
                        type="button"
                        onClick={() => setActiveGameModal({ game, tab: 'watch' })}
                        className="min-h-[46px] px-3 py-2 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg bouncy-tap"
                      >
                        <Play className="w-4 h-4 fill-black shrink-0" />
                        <span>WATCH</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveGameModal({ game, tab: 'boxscore' })}
                        className="min-h-[46px] px-3 py-2 rounded-2xl bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-800 font-bold text-xs flex items-center justify-center gap-1.5 bouncy-tap"
                      >
                        <BarChart3 className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                        <span>BOX SCORE</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveGameModal({ game, tab: 'details' })}
                        className="min-h-[46px] px-3 py-2 rounded-2xl bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-800 font-bold text-xs flex items-center justify-center gap-1.5 bouncy-tap"
                      >
                        <Info className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                        <span>DETAILS</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* NBA ID Sign-In Modal */}
      <NbaSignInModal
        isOpen={isSignInOpen}
        session={session}
        onClose={() => setIsSignInOpen(false)}
        onSignInSuccess={handleSignInSuccess}
        onSignOut={handleSignOut}
        onNavigateInApp={onNavigate}
      />
    </div>
  );
};
