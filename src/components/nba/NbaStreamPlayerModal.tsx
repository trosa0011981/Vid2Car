import React, { useState, useEffect, useRef, useCallback } from 'react';
import Hls from 'hls.js';
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
  FastForward,
  Rewind,
  RefreshCw,
} from 'lucide-react';
import { NbaGame, NbaStreamFeed, NbaStreamFeedType, NbaUserSession } from '../../types/nba';
import { openNbaTopLevelInApp } from '../../services/nbaService';
import { logDiagnosticEvent } from '../../services/diagnosticsService';
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
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isVideoPaused, setIsVideoPaused] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [autoMutedByPolicy, setAutoMutedByPolicy] = useState<boolean>(false);
  const [isBuffering, setIsBuffering] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [streamProtocol, setStreamProtocol] = useState<'mp4' | 'hls'>('mp4');
  const [useNativeControls, setUseNativeControls] = useState<boolean>(false);
  const [videoErrorMsg, setVideoErrorMsg] = useState<string>('');
  const [playerSurfaceMode, setPlayerSurfaceMode] = useState<'stream' | 'official_web'>('stream');

  const videoContainerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const selectedStream: NbaStreamFeed =
    game.streams.find((s) => s.id === selectedStreamId) || game.streams[0];

  const isMobileZoomed = selectedStream.id === 'mobile';

  const destroyHlsInstance = useCallback(() => {
    if (hlsRef.current) {
      try {
        hlsRef.current.destroy();
      } catch {
        // ignore
      }
      hlsRef.current = null;
    }
  }, []);

  // Start or switch video stream inside the HTML5 <video> element
  useEffect(() => {
    if (activeTab !== 'watch' || playerSurfaceMode !== 'stream' || !isPlaying) {
      destroyHlsInstance();
      return;
    }

    const videoEl = videoRef.current;
    if (!videoEl) return;

    destroyHlsInstance();
    setIsBuffering(true);
    setVideoErrorMsg('');

    const mp4Url =
      selectedStream.videoUrl ||
      selectedStream.fallbackVideoUrl ||
      'https://espnmedia-cdn.akamaized.net/espn/media/16x9/wsc/2026/1025/caea67af-dbb9-4dcd-aae6-6a473c3abf22/caea67af-dbb9-4dcd-aae6-6a473c3abf22.mp4';
    const hlsUrl = selectedStream.hlsUrl;

    logDiagnosticEvent(
      'NBA_PLAYER_LOAD',
      `Loading stream [${selectedStream.id}] protocol=${streamProtocol} for ${game.gameCode}: ${
        streamProtocol === 'hls' && hlsUrl ? hlsUrl : mp4Url
      }`
    );

    const startPlaybackSafe = () => {
      videoEl.muted = isMuted;
      const playPromise = videoEl.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsVideoPaused(false);
            setIsBuffering(false);
            logDiagnosticEvent(
              'NBA_PLAYER_PLAYING',
              `Playback active for ${game.gameCode} (${selectedStream.label})`
            );
          })
          .catch((err) => {
            // Auto-retry muted if WebView/browser autoplay policy blocked unmuted start
            logDiagnosticEvent(
              'NBA_PLAYER_AUTOPLAY_MUTE',
              `Unmuted play blocked (${err?.message || 'policy'}), retrying muted`
            );
            videoEl.muted = true;
            setIsMuted(true);
            setAutoMutedByPolicy(true);
            videoEl
              .play()
              .then(() => {
                setIsVideoPaused(false);
                setIsBuffering(false);
              })
              .catch((err2) => {
                setIsBuffering(false);
                setIsVideoPaused(true);
                logDiagnosticEvent(
                  'NBA_PLAYER_ERR',
                  `Video play() failed: ${err2?.message || 'unknown'}`
                );
              });
          });
      }
    };

    if (streamProtocol === 'hls' && hlsUrl) {
      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
        });
        hlsRef.current = hls;
        hls.loadSource(hlsUrl);
        hls.attachMedia(videoEl);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          startPlaybackSafe();
        });
        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) {
            logDiagnosticEvent(
              'NBA_HLS_FALLBACK',
              `HLS fatal error (${data.details}), switching to direct MP4 stream`
            );
            destroyHlsInstance();
            setStreamProtocol('mp4');
          }
        });
      } else if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
        videoEl.src = hlsUrl;
        videoEl.load();
        startPlaybackSafe();
      } else {
        setStreamProtocol('mp4');
      }
    } else {
      videoEl.src = mp4Url;
      videoEl.load();
      startPlaybackSafe();
    }

    return () => {
      destroyHlsInstance();
    };
  }, [
    activeTab,
    playerSurfaceMode,
    isPlaying,
    selectedStreamId,
    streamProtocol,
    game.gameCode,
    selectedStream.id,
    selectedStream.label,
    selectedStream.videoUrl,
    selectedStream.fallbackVideoUrl,
    selectedStream.hlsUrl,
    destroyHlsInstance,
  ]);

  // Switch stream feed handler — immediately starts playing the selected stream
  const handleSelectStream = (feedId: NbaStreamFeedType) => {
    logDiagnosticEvent(
      'NBA_STREAM_SELECT',
      `User selected stream feed: ${feedId} for game ${game.gameCode}`
    );
    setSelectedStreamId(feedId);
    setPlayerSurfaceMode('stream');
    setIsPlaying(true);
    setIsVideoPaused(false);
  };

  const handleTogglePlayPause = () => {
    if (!isPlaying) {
      setIsPlaying(true);
      setIsVideoPaused(false);
      return;
    }
    const videoEl = videoRef.current;
    if (!videoEl) return;
    if (videoEl.paused) {
      videoEl.play().catch(() => {});
      setIsVideoPaused(false);
    } else {
      videoEl.pause();
      setIsVideoPaused(true);
    }
  };

  const handleSeekRelative = (deltaSec: number) => {
    const videoEl = videoRef.current;
    if (!videoEl) return;
    const nextTime = Math.max(0, Math.min(videoEl.duration || 300, videoEl.currentTime + deltaSec));
    videoEl.currentTime = nextTime;
    setCurrentTime(nextTime);
  };

  const handleRestartStream = () => {
    const videoEl = videoRef.current;
    if (!videoEl) return;
    videoEl.currentTime = 0;
    setCurrentTime(0);
    videoEl.play().catch(() => {});
    setIsVideoPaused(false);
  };

  const handleToggleMute = () => {
    const videoEl = videoRef.current;
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    setAutoMutedByPolicy(false);
    if (videoEl) {
      videoEl.muted = nextMuted;
    }
  };

  const formatDuration = (sec: number) => {
    if (!Number.isFinite(sec) || sec < 0) return '00:00';
    const total = Math.floor(sec);
    const mins = Math.floor(total / 60);
    const rem = total % 60;
    return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  };

  const handleToggleFullscreen = () => {
    const videoEl = videoRef.current as any;
    if (videoEl && typeof videoEl.webkitEnterFullscreen === 'function') {
      try {
        videoEl.webkitEnterFullscreen();
        return;
      } catch {
        // fallback to container fullscreen
      }
    }
    if (!videoContainerRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      videoContainerRef.current.requestFullscreen().catch(() => {});
    }
  };

  const handleOpenOfficialNbaWatch = () => {
    logDiagnosticEvent(
      'NBA_OFFICIAL_WATCH',
      `Opening official NBA.com stream in top-level WebView: ${selectedStream.inAppWatchPath}`
    );
    openNbaTopLevelInApp(selectedStream.inAppWatchPath);
  };

  return (
    <div className="w-full h-full bg-[#090A0F] text-white flex flex-col overflow-y-auto select-none">
      {/* Top Bar (No backdrop-blur to prevent Adreno Vulkan shader compile issues) */}
      <div className="sticky top-0 z-20 bg-[#12151E] border-b border-neutral-800 px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
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
              <span className="text-amber-400 font-semibold">{selectedStream.label}</span>
              <span aria-hidden="true">·</span>
              <span>{drmL3Enforcer ? 'Widevine L3 Enforced' : 'Standard DRM'}</span>
            </div>
          </div>
        </div>

        {/* View Section Tabs */}
        <div className="flex items-center gap-1 p-1 bg-neutral-900 rounded-xl border border-neutral-800 shrink-0">
          <button
            type="button"
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
            type="button"
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
            type="button"
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
      <div className="max-w-6xl w-full mx-auto px-4 py-4 flex-1 flex flex-col gap-5">
        {activeTab === 'watch' && (
          <>
            {/* Stream Feed Selector Strip (Home, Away, Mobile View, Recap) */}
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                <h3 className="text-xs font-bold text-neutral-300">
                  Select Broadcast Stream Feed (Tap any feed to play immediately)
                </h3>
                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() =>
                      setStreamProtocol((prev) => (prev === 'mp4' ? 'hls' : 'mp4'))
                    }
                    className="px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 font-semibold bouncy-tap flex items-center gap-1.5"
                    title="Switch between Direct MP4 and HLS (.m3u8) stream transport"
                  >
                    <Radio className="w-3.5 h-3.5 text-emerald-400" />
                    <span>
                      Source: {streamProtocol === 'mp4' ? 'Direct HD (MP4)' : 'Adaptive HLS (.m3u8)'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenOfficialNbaWatch}
                    className="px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 font-bold bouncy-tap flex items-center gap-1.5"
                  >
                    <Globe className="w-3.5 h-3.5 text-amber-400" />
                    <span>Open Full Game on NBA.com</span>
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
                      type="button"
                      key={feed.id}
                      onClick={() => handleSelectStream(feed.id)}
                      className={`min-h-[78px] p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all bouncy-tap ${
                        isSelected
                          ? 'bg-[#1E2436] border-amber-500 text-white shadow-lg ring-1 ring-amber-500/40'
                          : 'bg-[#12151E] hover:bg-[#171B26] border-neutral-800/90 text-neutral-300'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-sm text-white truncate">
                          {feed.label}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold flex items-center gap-1 shrink-0 ${
                            isSelected && isPlaying && !isVideoPaused
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'bg-amber-500 text-black'
                          }`}
                        >
                          <Play className="w-2.5 h-2.5 fill-current" />
                          <span>{isSelected && isPlaying && !isVideoPaused ? 'LIVE' : 'PLAY'}</span>
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-neutral-400 truncate mt-1.5">
                        <span className="truncate">
                          {feed.broadcaster} · {feed.id === 'mobile' ? 'Zoomed Cam' : '1080p60'}
                        </span>
                        <FeedIcon
                          className={`w-3.5 h-3.5 shrink-0 ${
                            isSelected ? 'text-amber-400' : 'text-neutral-500'
                          }`}
                        />
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
                <div className="w-full h-full relative flex flex-col items-center justify-center p-6 text-center bg-[#0B0E17]">
                  <div className="max-w-lg space-y-4">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 mx-auto">
                      <Globe className="w-6 h-6" />
                    </div>
                    <h4 className="text-lg font-extrabold text-white">
                      Launch Official NBA.com Stream ({selectedStream.label})
                    </h4>
                    <p className="text-xs text-neutral-400 leading-relaxed">
                      Opens <span className="text-white font-mono">{selectedStream.inAppWatchPath}</span> as the top-level page inside AA Browser&apos;s Widevine L3 Desktop-Mode WebView with your NBA ID cookies and a persistent return bar.
                    </p>
                    <div className="flex items-center justify-center gap-3 pt-2">
                      <button
                        type="button"
                        onClick={handleOpenOfficialNbaWatch}
                        className="min-h-[48px] px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs flex items-center gap-2 shadow-xl bouncy-tap"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span>Open Stream on NBA.com (In-App)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPlayerSurfaceMode('stream');
                          setIsPlaying(true);
                        }}
                        className="min-h-[48px] px-5 py-3 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs border border-neutral-700 bouncy-tap"
                      >
                        Return to Car Video Player
                      </button>
                    </div>
                  </div>
                </div>
              ) : !isPlaying ? (
                /* Pre-Play Standby Screen with Prominent Play Button */
                <div className="relative w-full h-full flex flex-col items-center justify-center p-6 text-center bg-[#0B0E17]">
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

                  <button
                    type="button"
                    onClick={() => {
                      setIsPlaying(true);
                      setIsVideoPaused(false);
                    }}
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
                </div>
              ) : (
                /* Active Real HTML5 <video> Stream Playback Surface */
                <div className="relative w-full h-full bg-black overflow-hidden flex flex-col justify-between">
                  {/* Real HTML5 Video Element */}
                  <div className="absolute inset-0 flex items-center justify-center overflow-hidden bg-black">
                    <video
                      ref={videoRef}
                      playsInline
                      preload="auto"
                      controls={useNativeControls}
                      muted={isMuted}
                      onClick={handleTogglePlayPause}
                      onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                      onLoadedMetadata={(e) => {
                        setDuration(e.currentTarget.duration || 0);
                        setIsBuffering(false);
                      }}
                      onCanPlay={() => setIsBuffering(false)}
                      onPlaying={() => {
                        setIsBuffering(false);
                        setIsVideoPaused(false);
                        setVideoErrorMsg('');
                      }}
                      onPause={() => setIsVideoPaused(true)}
                      onWaiting={() => setIsBuffering(true)}
                      onEnded={() => {
                        // Loop seamlessly for continuous car viewing
                        if (videoRef.current) {
                          videoRef.current.currentTime = 0;
                          videoRef.current.play().catch(() => {});
                        }
                      }}
                      onError={() => {
                        logDiagnosticEvent(
                          'NBA_VIDEO_ELEMENT_ERR',
                          `Video element error on protocol=${streamProtocol}, attempting fallback`
                        );
                        if (streamProtocol === 'hls') {
                          setStreamProtocol('mp4');
                        } else if (
                          videoRef.current &&
                          selectedStream.fallbackVideoUrl &&
                          videoRef.current.src !== selectedStream.fallbackVideoUrl
                        ) {
                          videoRef.current.src = selectedStream.fallbackVideoUrl;
                          videoRef.current.load();
                          videoRef.current.play().catch(() => {});
                        } else {
                          setIsBuffering(false);
                          setVideoErrorMsg(
                            'Stream connection interrupted — tap Retry or Open on NBA.com'
                          );
                        }
                      }}
                      className={`w-full h-full object-cover cursor-pointer transition-transform duration-500 ${
                        isMobileZoomed ? 'scale-125' : 'scale-100'
                      }`}
                    />
                  </div>

                  {/* Top-Left Live Scorebug Overlay */}
                  <div className="relative z-10 p-3.5 flex items-center justify-between gap-2 pointer-events-none">
                    <div className="px-3.5 py-1.5 rounded-xl bg-black/85 border border-neutral-700/80 flex items-center gap-2.5 text-xs">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      <span className="font-extrabold text-white">
                        {hideScores
                          ? `${game.awayTeam.tricode} vs ${game.homeTeam.tricode}`
                          : `${game.awayTeam.tricode} ${game.awayTeam.score} · ${game.homeTeam.tricode} ${game.homeTeam.score}`}
                      </span>
                      <span aria-hidden="true" className="text-neutral-500">
                        |
                      </span>
                      <span className="text-amber-400 font-bold">{selectedStream.broadcaster}</span>
                      <span aria-hidden="true" className="text-neutral-500">
                        ·
                      </span>
                      <span className="text-neutral-300 uppercase">{selectedStream.id} FEED</span>
                    </div>

                    <div className="flex items-center gap-2 pointer-events-auto">
                      {autoMutedByPolicy && isMuted && (
                        <button
                          type="button"
                          onClick={handleToggleMute}
                          className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs flex items-center gap-1.5 shadow-lg bouncy-tap"
                        >
                          <VolumeX className="w-3.5 h-3.5" />
                          <span>Tap to Unmute Audio</span>
                        </button>
                      )}

                      <div className="px-3 py-1.5 rounded-xl bg-black/85 border border-neutral-700/80 text-xs text-emerald-400 font-semibold hidden sm:block">
                        {isMobileZoomed ? 'Mobile Zoom 1.25x' : '1080p60 HD'}
                      </div>
                    </div>
                  </div>

                  {/* Center Loading Spinner or Play/Error Overlay */}
                  {(isBuffering || isVideoPaused || videoErrorMsg) && (
                    <div className="relative z-10 flex flex-col items-center justify-center my-auto px-4 text-center pointer-events-auto">
                      {videoErrorMsg ? (
                        <div className="p-4 rounded-2xl bg-black/90 border border-neutral-700 max-w-md space-y-3">
                          <div className="text-xs font-bold text-amber-400">{videoErrorMsg}</div>
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setVideoErrorMsg('');
                                setStreamProtocol((prev) => (prev === 'mp4' ? 'hls' : 'mp4'));
                              }}
                              className="px-4 py-2 rounded-xl bg-amber-500 text-black font-extrabold text-xs flex items-center gap-1.5"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                              <span>Retry Stream</span>
                            </button>
                            <button
                              type="button"
                              onClick={handleOpenOfficialNbaWatch}
                              className="px-4 py-2 rounded-xl bg-neutral-800 text-white font-bold text-xs border border-neutral-700 flex items-center gap-1.5"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>Open on NBA.com</span>
                            </button>
                          </div>
                        </div>
                      ) : isBuffering ? (
                        <div className="px-4 py-2.5 rounded-2xl bg-black/85 border border-neutral-700 flex items-center gap-2.5 text-xs font-bold text-amber-400">
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Loading {selectedStream.label}...</span>
                        </div>
                      ) : isVideoPaused ? (
                        <button
                          type="button"
                          onClick={handleTogglePlayPause}
                          className="min-h-[56px] px-7 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-sm flex items-center gap-2.5 shadow-2xl bouncy-tap"
                        >
                          <Play className="w-5 h-5 fill-black" />
                          <span>Resume {selectedStream.label}</span>
                        </button>
                      ) : null}
                    </div>
                  )}

                  {/* Bottom Player Transport Controls */}
                  {!useNativeControls && (
                    <div className="relative z-10 bg-black/90 border-t border-neutral-800/80 px-4 py-3 flex flex-col gap-2.5">
                      {/* Scrubber Bar */}
                      <div className="w-full flex items-center gap-3">
                        <span className="text-xs font-mono tabular-nums text-neutral-300">
                          {formatDuration(currentTime)}
                        </span>
                        <div
                          onClick={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const ratio = Math.max(
                              0,
                              Math.min(1, (e.clientX - rect.left) / rect.width)
                            );
                            const targetDur = duration > 0 ? duration : 120;
                            const nextTime = ratio * targetDur;
                            if (videoRef.current) {
                              videoRef.current.currentTime = nextTime;
                            }
                            setCurrentTime(nextTime);
                          }}
                          className="flex-1 h-2.5 bg-neutral-700 rounded-full overflow-hidden cursor-pointer"
                        >
                          <div
                            className="h-full bg-amber-500 transition-all"
                            style={{
                              width: `${
                                duration > 0
                                  ? Math.min(100, (currentTime / duration) * 100)
                                  : 15
                              }%`,
                            }}
                          />
                        </div>
                        <span className="text-xs font-mono tabular-nums text-neutral-400">
                          {duration > 0
                            ? formatDuration(duration)
                            : selectedStream.durationLabel || 'LIVE'}
                        </span>
                      </div>

                      {/* Transport Buttons */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={handleTogglePlayPause}
                            className="min-w-[44px] min-h-[42px] px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs flex items-center gap-1.5 bouncy-tap"
                          >
                            {!isVideoPaused ? (
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
                            type="button"
                            onClick={() => handleSeekRelative(-10)}
                            className="min-w-[42px] min-h-[42px] p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 flex items-center justify-center bouncy-tap"
                            title="Rewind 10s"
                          >
                            <Rewind className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSeekRelative(10)}
                            className="min-w-[42px] min-h-[42px] p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 flex items-center justify-center bouncy-tap"
                            title="Forward 10s"
                          >
                            <FastForward className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={handleRestartStream}
                            className="min-w-[42px] min-h-[42px] p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 flex items-center justify-center bouncy-tap"
                            title="Restart stream"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={handleToggleMute}
                            className="min-w-[42px] min-h-[42px] p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 flex items-center justify-center bouncy-tap"
                            title={isMuted ? 'Unmute' : 'Mute'}
                          >
                            {isMuted ? (
                              <VolumeX className="w-4 h-4 text-red-400" />
                            ) : (
                              <Volume2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {/* Quick feed switcher buttons inside player */}
                          {(['home', 'away', 'mobile', 'recap'] as NbaStreamFeedType[]).map(
                            (fType) => (
                              <button
                                type="button"
                                key={fType}
                                onClick={() => handleSelectStream(fType)}
                                className={`min-h-[38px] px-2.5 py-1 rounded-xl text-xs font-bold capitalize bouncy-tap ${
                                  selectedStreamId === fType
                                    ? 'bg-white text-black'
                                    : 'bg-neutral-800 text-neutral-300 hover:text-white'
                                }`}
                              >
                                {fType === 'mobile'
                                  ? 'Mobile Cam'
                                  : fType === 'recap'
                                  ? 'Recap'
                                  : `${fType}`}
                              </button>
                            )
                          )}

                          <button
                            type="button"
                            onClick={() => setUseNativeControls((prev) => !prev)}
                            className="min-h-[38px] px-2.5 py-1 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[11px] font-semibold bouncy-tap hidden md:block"
                            title="Switch to native Android video controls"
                          >
                            Native UI
                          </button>

                          <button
                            type="button"
                            onClick={handleToggleFullscreen}
                            className="min-w-[42px] min-h-[42px] p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 flex items-center justify-center bouncy-tap"
                            title="Toggle Fullscreen"
                          >
                            <Maximize2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bottom Helper Strip: Account Status & Direct NBA.com Full-Broadcast Launch */}
            <div className="p-3.5 rounded-2xl bg-[#12151E] border border-neutral-800 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-neutral-300">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  {session.isSignedIn ? (
                    <>
                      Signed in as <strong className="text-white">{session.displayName}</strong> ·{' '}
                      {session.subscriptionTier}
                    </>
                  ) : (
                    <>
                      Playing in Car Stream Player ·{' '}
                      <button
                        type="button"
                        onClick={onOpenSignIn}
                        className="text-amber-400 underline font-bold hover:text-amber-300"
                      >
                        Sign in with NBA ID
                      </button>{' '}
                      for full authenticated League Pass feeds
                    </>
                  )}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {useNativeControls && (
                  <button
                    type="button"
                    onClick={() => setUseNativeControls(false)}
                    className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold"
                  >
                    Restore Car Controls
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleOpenOfficialNbaWatch}
                  className="px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-amber-300 font-bold flex items-center gap-1.5 bouncy-tap"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Watch Full DRM Broadcast on NBA.com</span>
                </button>
              </div>
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
                <div className="text-neutral-400">Matchup Code &amp; Official NBA ID</div>
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
