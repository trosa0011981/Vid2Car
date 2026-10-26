import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Smartphone,
  Tv,
  Film,
  ShieldCheck,
  Radio,
  BarChart3,
  Info,
  RotateCcw,
  Lock,
  ExternalLink,
  Globe,
} from 'lucide-react';
import { NbaGame, NbaStreamFeed, NbaStreamFeedType, NbaUserSession } from '../../types/nba';
import { openNbaTopLevelInApp } from '../../services/nbaService';
import { NbaTeamLogo } from './NbaTeamLogo';

interface NbaStreamPlayerModalProps {
  game: NbaGame;
  initialTab?: 'watch' | 'boxscore' | 'details';
  hideScores: boolean;
  drmL3Enforcer: boolean;
  session: NbaUserSession;
  onOpenSignIn: () => void;
  onClose: () => void;
}

export const NbaStreamPlayerModal: React.FC<NbaStreamPlayerModalProps> = ({
  game,
  initialTab = 'watch',
  hideScores,
  drmL3Enforcer,
  session,
  onOpenSignIn,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'watch' | 'boxscore' | 'details'>(initialTab);
  const [selectedStreamId, setSelectedStreamId] = useState<NbaStreamFeedType>('home');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [playerSurfaceMode, setPlayerSurfaceMode] = useState<'stream' | 'official_web'>('stream');
  const videoContainerRef = useRef<HTMLDivElement>(null);

  const selectedStream: NbaStreamFeed =
    game.streams.find((s) => s.id === selectedStreamId) || game.streams[0];

  // Switch stream feed handler
  const handleSelectStream = (feedId: NbaStreamFeedType) => {
    setSelectedStreamId(feedId);
    // Pause and let user press Play Stream or continue seamlessly if already playing
  };

  // Simulated live broadcast timer when playing
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying]);

  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const rem = sec % 60;
    return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  };

  const handleToggleFullscreen = () => {
    if (!videoContainerRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      videoContainerRef.current.requestFullscreen().catch(() => {});
    }
  };

  const isMobileZoomed = selectedStream.id === 'mobile';

  return (
    <div className="w-full h-full bg-[#090A0F] text-white flex flex-col overflow-y-auto select-none">
      {/* Top Bar */}
      <div className="sticky top-0 z-20 bg-[#12151E]/95 backdrop-blur-md border-b border-neutral-800 px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 flex items-center gap-2 text-xs font-bold bouncy-tap shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Games</span>
          </button>

          <div className="truncate">
            <div className="text-sm font-extrabold text-white truncate">
              {game.awayTeam.city} {game.awayTeam.name} at {game.homeTeam.city} {game.homeTeam.name}
            </div>
            <div className="text-xs text-neutral-400 flex items-center gap-1.5 truncate">
              <span>{game.gameStatusText}</span>
              <span aria-hidden="true">·</span>
              <span>{selectedStream.label}</span>
              <span aria-hidden="true">·</span>
              <span>{drmL3Enforcer ? 'Widevine L3 Enforced' : 'Standard DRM'}</span>
            </div>
          </div>
        </div>

        {/* View Section Tabs */}
        <div className="flex items-center gap-1 p-1 bg-neutral-900 rounded-xl border border-neutral-800 shrink-0">
          <button
            onClick={() => setActiveTab('watch')}
            className={`min-h-[40px] px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'watch'
                ? 'bg-amber-500 text-black'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Tv className="w-3.5 h-3.5" />
            <span>Watch Stream</span>
          </button>
          <button
            onClick={() => setActiveTab('boxscore')}
            className={`min-h-[40px] px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'boxscore'
                ? 'bg-amber-500 text-black'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Box Score</span>
          </button>
          <button
            onClick={() => setActiveTab('details')}
            className={`min-h-[40px] px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'details'
                ? 'bg-amber-500 text-black'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Info className="w-3.5 h-3.5" />
            <span>Game Details</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl w-full mx-auto px-4 py-5 flex-1 flex flex-col gap-6">
        {activeTab === 'watch' && (
          <>
            {/* Stream Feed Selector Strip (Home, Away, Mobile View, Recap) */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <h3 className="text-xs font-bold text-neutral-400">
                  Select Broadcast Stream Feed
                </h3>
                <div className="flex items-center gap-2 text-xs text-neutral-400">
                  <button
                    onClick={() =>
                      setPlayerSurfaceMode(
                        playerSurfaceMode === 'stream' ? 'official_web' : 'stream'
                      )
                    }
                    className="px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 font-semibold bouncy-tap flex items-center gap-1.5"
                  >
                    <Globe className="w-3.5 h-3.5 text-amber-400" />
                    <span>
                      {playerSurfaceMode === 'stream'
                        ? 'Official NBA.com Full-Page Stream'
                        : 'Return to Car Stream Player'}
                    </span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {game.streams.map((feed) => {
                  const isSelected = feed.id === selectedStreamId;
                  const FeedIcon =
                    feed.id === 'mobile'
                      ? Smartphone
                      : feed.id === 'recap'
                      ? Film
                      : Tv;

                  return (
                    <button
                      key={feed.id}
                      onClick={() => handleSelectStream(feed.id)}
                      className={`min-h-[76px] p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all bouncy-tap ${
                        isSelected
                          ? 'bg-[#1E2436] border-amber-500 text-white shadow-lg'
                          : 'bg-[#12151E] hover:bg-[#171B26] border-neutral-800/90 text-neutral-300'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-sm text-white truncate">
                          {feed.label}
                        </span>
                        <FeedIcon
                          className={`w-4 h-4 shrink-0 ${
                            isSelected ? 'text-amber-400' : 'text-neutral-500'
                          }`}
                        />
                      </div>
                      <div className="text-xs text-neutral-400 truncate mt-1">
                        {feed.broadcaster} · {feed.id === 'mobile' ? 'Zoomed Cam' : '1080p60'}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Video Player Stage */}
            <div
              ref={videoContainerRef}
              className="relative w-full aspect-video max-h-[540px] rounded-3xl overflow-hidden bg-black border border-neutral-800 shadow-2xl flex flex-col justify-between"
            >
              {playerSurfaceMode === 'official_web' ? (
                <div className="w-full h-full relative flex flex-col items-center justify-center p-6 text-center bg-gradient-to-b from-[#131826] via-[#0B0E17] to-black">
                  <div className="max-w-lg space-y-4">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 mx-auto">
                      <Globe className="w-6 h-6" />
                    </div>
                    <h4 className="text-lg font-extrabold text-white">
                      Launch Official NBA.com Stream ({selectedStream.label})
                    </h4>
                    <p className="text-xs text-neutral-400 leading-relaxed">
                      Because NBA.com blocks embedded <code className="text-amber-300">&lt;iframe&gt;</code> players via <code className="text-amber-300">X-Frame-Options: SAMEORIGIN</code>, tap below to open this matchup directly as the top-level page inside AA Browser&apos;s Widevine L3 WebView (with a top bar to return here anytime).
                    </p>
                    <div className="flex items-center justify-center gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => openNbaTopLevelInApp(selectedStream.inAppWatchPath)}
                        className="min-h-[48px] px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs flex items-center gap-2 shadow-xl bouncy-tap"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span>Open Stream on NBA.com (In-App)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPlayerSurfaceMode('stream')}
                        className="min-h-[48px] px-5 py-3 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs border border-neutral-700 bouncy-tap"
                      >
                        Use Car Stream Player
                      </button>
                    </div>
                  </div>
                </div>
              ) : !isPlaying ? (
                /* Pre-Play Standby Screen with Prominent Play Button */
                <div className="relative w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-b from-[#131826] via-[#0B0E17] to-black">
                  {/* Matchup Header Inside Player */}
                  <div className="flex items-center gap-8 mb-6">
                    <div className="flex flex-col items-center gap-2">
                      <NbaTeamLogo
                        teamId={game.awayTeam.teamId}
                        tricode={game.awayTeam.tricode}
                        primaryColor={game.awayTeam.primaryColor}
                        size="lg"
                      />
                      <div className="font-bold text-sm text-white">{game.awayTeam.name}</div>
                      <div className="text-xs text-neutral-400 font-mono tabular-nums">
                        {hideScores ? '•••' : game.awayTeam.score}
                      </div>
                    </div>

                    <div className="flex flex-col items-center">
                      <span className="text-xs font-bold text-amber-400 tracking-wider">
                        {game.gameStatusText}
                      </span>
                      <span className="text-lg font-extrabold text-neutral-500 my-1">VS</span>
                      <span className="text-[11px] text-neutral-400">
                        {selectedStream.broadcaster}
                      </span>
                    </div>

                    <div className="flex flex-col items-center gap-2">
                      <NbaTeamLogo
                        teamId={game.homeTeam.teamId}
                        tricode={game.homeTeam.tricode}
                        primaryColor={game.homeTeam.primaryColor}
                        size="lg"
                      />
                      <div className="font-bold text-sm text-white">{game.homeTeam.name}</div>
                      <div className="text-xs text-neutral-400 font-mono tabular-nums">
                        {hideScores ? '•••' : game.homeTeam.score}
                      </div>
                    </div>
                  </div>

                  {/* Prominent Play Stream Button */}
                  <button
                    onClick={() => setIsPlaying(true)}
                    className="min-h-[60px] px-8 py-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-base flex items-center gap-3 shadow-2xl bouncy-tap"
                  >
                    <Play className="w-6 h-6 fill-black" />
                    <span>Play {selectedStream.label}</span>
                  </button>

                  <div className="mt-4 text-xs text-neutral-400 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>
                      {selectedStream.resolution} ·{' '}
                      {isMobileZoomed
                        ? 'Zoomed Courtside Camera Enabled'
                        : 'Full Court Broadcast Angle'}
                    </span>
                  </div>

                  {!session.isSignedIn && selectedStream.id !== 'recap' && (
                    <div className="mt-4 flex items-center gap-2 text-xs text-amber-300">
                      <Lock className="w-3.5 h-3.5" />
                      <span>Preview mode active —</span>
                      <button
                        onClick={onOpenSignIn}
                        className="underline font-bold hover:text-amber-200"
                      >
                        Sign in with NBA ID
                      </button>
                      <span>for full authenticated League Pass feeds</span>
                    </div>
                  )}
                </div>
              ) : (
                /* Active In-App Stream Playback Surface */
                <div className="relative w-full h-full flex flex-col justify-between bg-[#080B12] overflow-hidden">
                  {/* Simulated Live Court Broadcast Feed with Mobile View Zoom Support */}
                  <div
                    className={`w-full h-full flex flex-col items-center justify-center relative transition-transform duration-500 ${
                      isMobileZoomed ? 'scale-125' : 'scale-100'
                    }`}
                    style={{
                      background: `radial-gradient(circle at 50% 50%, ${game.homeTeam.primaryColor}44 0%, ${game.awayTeam.primaryColor}33 45%, #05070B 100%)`,
                    }}
                  >
                    {/* Court markings SVG */}
                    <svg
                      viewBox="0 0 800 450"
                      className="w-full h-full opacity-25 pointer-events-none"
                    >
                      <rect
                        x="40"
                        y="30"
                        width="720"
                        height="390"
                        fill="none"
                        stroke="#F59E0B"
                        strokeWidth="3"
                      />
                      <line
                        x1="400"
                        y1="30"
                        x2="400"
                        y2="420"
                        stroke="#F59E0B"
                        strokeWidth="3"
                      />
                      <circle
                        cx="400"
                        cy="225"
                        r="60"
                        fill="none"
                        stroke="#F59E0B"
                        strokeWidth="3"
                      />
                      <path
                        d="M 40 90 L 190 90 A 135 135 0 0 1 190 360 L 40 360"
                        fill="none"
                        stroke="#F59E0B"
                        strokeWidth="3"
                      />
                      <path
                        d="M 760 90 L 610 90 A 135 135 0 0 0 610 360 L 760 360"
                        fill="none"
                        stroke="#F59E0B"
                        strokeWidth="3"
                      />
                    </svg>

                    {/* Active Stream Broadcast Overlay Info */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center pointer-events-none">
                      <div className="flex items-center gap-4 mb-2">
                        <NbaTeamLogo
                          teamId={game.awayTeam.teamId}
                          tricode={game.awayTeam.tricode}
                          primaryColor={game.awayTeam.primaryColor}
                          size="md"
                        />
                        <span className="text-2xl font-black text-white tracking-tight font-mono tabular-nums">
                          {hideScores
                            ? `${game.awayTeam.tricode} vs ${game.homeTeam.tricode}`
                            : `${game.awayTeam.tricode} ${game.awayTeam.score} - ${game.homeTeam.score} ${game.homeTeam.tricode}`}
                        </span>
                        <NbaTeamLogo
                          teamId={game.homeTeam.teamId}
                          tricode={game.homeTeam.tricode}
                          primaryColor={game.homeTeam.primaryColor}
                          size="md"
                        />
                      </div>

                      <div className="text-sm font-bold text-amber-400">
                        Now Streaming: {selectedStream.label}
                      </div>
                      <div className="text-xs text-neutral-300 mt-1">
                        {selectedStream.broadcaster} ·{' '}
                        {isMobileZoomed
                          ? 'Mobile View (1.25x Courtside Zoom Tracking Active)'
                          : 'Standard Arena Broadcast Feed'}
                      </div>
                    </div>
                  </div>

                  {/* Top-Left Live Scorebug Overlay */}
                  <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
                    <div className="px-3.5 py-2 rounded-xl bg-black/80 backdrop-blur-md border border-white/10 flex items-center gap-3 text-xs">
                      <Radio className="w-4 h-4 text-amber-400" />
                      <span className="font-bold text-white">{selectedStream.broadcaster}</span>
                      <span aria-hidden="true" className="text-neutral-600">·</span>
                      <span className="text-neutral-300">{selectedStream.id.toUpperCase()} FEED</span>
                    </div>

                    <div className="px-3 py-1.5 rounded-xl bg-black/80 backdrop-blur-md border border-white/10 text-xs text-emerald-400 font-semibold">
                      Widevine L3 Stream · 60 FPS
                    </div>
                  </div>

                  {/* Bottom Player Transport Controls */}
                  <div className="relative z-10 bg-gradient-to-t from-black/95 via-black/80 to-transparent px-5 py-4 flex flex-col gap-3">
                    {/* Scrubber Bar */}
                    <div className="w-full flex items-center gap-3">
                      <span className="text-xs font-mono tabular-nums text-neutral-300">
                        {formatDuration(elapsedSeconds)}
                      </span>
                      <div
                        onClick={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const ratio = Math.max(
                            0,
                            Math.min(1, (e.clientX - rect.left) / rect.width)
                          );
                          setElapsedSeconds(Math.floor(ratio * 180));
                        }}
                        className="flex-1 h-2 bg-neutral-700 rounded-full overflow-hidden cursor-pointer"
                      >
                        <div
                          className="h-full bg-amber-500 transition-all"
                          style={{
                            width: `${Math.min(100, ((elapsedSeconds + 15) / 180) * 100)}%`,
                          }}
                        />
                      </div>
                      <span className="text-xs font-mono tabular-nums text-neutral-400">
                        {selectedStream.durationLabel || 'LIVE'}
                      </span>
                    </div>

                    {/* Transport Buttons */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setIsPlaying(!isPlaying)}
                          className="min-w-[44px] min-h-[44px] px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs flex items-center gap-2 bouncy-tap"
                        >
                          {isPlaying ? (
                            <>
                              <Pause className="w-4 h-4 fill-black" />
                              <span>Pause</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-4 h-4 fill-black" />
                              <span>Play</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => setElapsedSeconds(0)}
                          className="min-w-[44px] min-h-[44px] p-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 flex items-center justify-center bouncy-tap"
                          title="Restart stream"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => setIsMuted(!isMuted)}
                          className="min-w-[44px] min-h-[44px] p-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 flex items-center justify-center bouncy-tap"
                          title={isMuted ? 'Unmute' : 'Mute'}
                        >
                          {isMuted ? (
                            <VolumeX className="w-4 h-4 text-red-400" />
                          ) : (
                            <Volume2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Quick feed switcher buttons inside player */}
                        {(['home', 'away', 'mobile'] as NbaStreamFeedType[]).map((fType) => (
                          <button
                            key={fType}
                            onClick={() => handleSelectStream(fType)}
                            className={`min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-bold capitalize bouncy-tap ${
                              selectedStreamId === fType
                                ? 'bg-white text-black'
                                : 'bg-neutral-800/90 text-neutral-300 hover:text-white'
                            }`}
                          >
                            {fType === 'mobile' ? 'Mobile View' : `${fType} Feed`}
                          </button>
                        ))}

                        <button
                          onClick={handleToggleFullscreen}
                          className="min-w-[44px] min-h-[44px] p-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 flex items-center justify-center bouncy-tap"
                          title="Toggle Fullscreen"
                        >
                          <Maximize2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'boxscore' && (
          <div className="bg-[#12151E] border border-neutral-800 rounded-3xl p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white">Line Score &amp; Game Leaders</h3>
                <p className="text-xs text-neutral-400 mt-0.5">{game.arena}</p>
              </div>
              <span className="text-xs font-bold text-amber-400">{game.gameStatusText}</span>
            </div>

            {/* Quarter by Quarter Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse font-mono tabular-nums text-sm">
                <thead>
                  <tr className="border-b border-neutral-800 text-xs text-neutral-400">
                    <th className="py-2.5 font-sans font-semibold">Team</th>
                    <th className="py-2.5 text-center">Q1</th>
                    <th className="py-2.5 text-center">Q2</th>
                    <th className="py-2.5 text-center">Q3</th>
                    <th className="py-2.5 text-center">Q4</th>
                    <th className="py-2.5 text-right font-bold text-white">FINAL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60">
                  {[game.awayTeam, game.homeTeam].map((team) => (
                    <tr key={team.tricode}>
                      <td className="py-3 font-sans font-bold text-white flex items-center gap-2.5">
                        <NbaTeamLogo
                          teamId={team.teamId}
                          tricode={team.tricode}
                          primaryColor={team.primaryColor}
                          size="sm"
                        />
                        <span>
                          {team.city} {team.name}
                        </span>
                        <span className="text-xs font-normal text-neutral-400">
                          ({team.record})
                        </span>
                      </td>
                      {[0, 1, 2, 3].map((qIdx) => (
                        <td key={qIdx} className="py-3 text-center text-neutral-300">
                          {hideScores
                            ? '••'
                            : team.quarterScores?.[qIdx] ?? '—'}
                        </td>
                      ))}
                      <td className="py-3 text-right font-extrabold text-base text-amber-400">
                        {hideScores ? '•••' : team.score}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Game Leaders Comparison */}
            <div className="pt-2 border-t border-neutral-800">
              <h4 className="text-xs font-bold text-neutral-400 mb-3">Top Performers</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[game.awayTeam, game.homeTeam].map((team) => (
                  <div
                    key={team.tricode}
                    className="p-4 rounded-2xl bg-neutral-900/90 border border-neutral-800 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-sm text-white">{team.leader.name}</div>
                      <div className="text-xs text-neutral-400 mt-0.5">
                        {team.leader.teamTricode} · #{team.leader.jerseyNumber} ·{' '}
                        {team.leader.position}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 font-mono tabular-nums text-right">
                      <div>
                        <div className="text-[10px] text-neutral-400">PTS</div>
                        <div className="text-sm font-bold text-white">
                          {hideScores ? '••' : team.leader.points}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-neutral-400">REB</div>
                        <div className="text-sm font-bold text-white">
                          {hideScores ? '••' : team.leader.rebounds}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-neutral-400">AST</div>
                        <div className="text-sm font-bold text-white">
                          {hideScores ? '••' : team.leader.assists}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'details' && (
          <div className="bg-[#12151E] border border-neutral-800 rounded-3xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">Game &amp; Stream Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-1.5">
                <div className="text-neutral-400">Arena &amp; Location</div>
                <div className="text-sm font-bold text-white">{game.arena}</div>
              </div>
              <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-1.5">
                <div className="text-neutral-400">Matchup Code &amp; ID</div>
                <div className="text-sm font-bold text-white font-mono">
                  {game.gameCode} ({game.gameId})
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-1.5">
                <div className="text-neutral-400">DRM &amp; Protection Profile</div>
                <div className="text-sm font-bold text-emerald-400">
                  Widevine L3 Compatibility Enforced (In-App)
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-1.5">
                <div className="text-neutral-400">Available Multi-Stream Angles</div>
                <div className="text-sm font-bold text-white">
                  Home ({game.homeTeam.tricode}) · Away ({game.awayTeam.tricode}) · Mobile View · Recap
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
