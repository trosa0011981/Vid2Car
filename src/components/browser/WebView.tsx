import React, { useState, useEffect } from 'react';
import { ExternalLink, RefreshCw, ShieldAlert, Globe, Compass, Play, Sparkles } from 'lucide-react';
import { extractHost, isNbaUrl } from '../../utils/urlFormatter';
import { NbaLeaguePassWrapper } from '../nba/NbaLeaguePassWrapper';

interface WebViewProps {
  url: string;
  title: string;
  desktopMode: boolean;
  scalePercent: number; // 40 to 200
  drmL3Enforcer: boolean;
  userAgent: string;
  onNavigate: (url: string) => void;
  onTitleLoaded: (title: string) => void;
  onLoadingChange: (loading: boolean) => void;
  onInteraction: () => void;
}

export const WebView: React.FC<WebViewProps> = ({
  url,
  title,
  desktopMode,
  scalePercent,
  drmL3Enforcer,
  userAgent,
  onNavigate,
  onTitleLoaded,
  onLoadingChange,
  onInteraction,
}) => {
  const [frameError, setFrameError] = useState(false);
  const [loadTimeout, setLoadTimeout] = useState(false);
  const [key, setKey] = useState(0);

  // Derive transformed url if applicable (e.g. youtube watch -> embed)
  const getEmbeddableUrl = (inputUrl: string): string => {
    try {
      const parsed = new URL(inputUrl);
      if (parsed.hostname.includes('youtube.com') && parsed.searchParams.has('v')) {
        const vid = parsed.searchParams.get('v');
        return `https://www.youtube.com/embed/${vid}?autoplay=1`;
      }
      if (parsed.hostname.includes('youtu.be')) {
        const vid = parsed.pathname.slice(1);
        return `https://www.youtube.com/embed/${vid}?autoplay=1`;
      }
      return inputUrl;
    } catch {
      return inputUrl;
    }
  };

  const activeUrl = getEmbeddableUrl(url);

  useEffect(() => {
    setFrameError(false);
    setLoadTimeout(false);
    onLoadingChange(true);

    const timer = setTimeout(() => {
      onLoadingChange(false);
    }, 600);

    return () => clearTimeout(timer);
  }, [url, key, onLoadingChange]);

  const handleReload = () => {
    setKey((prev) => prev + 1);
  };

  // Check if NBA League Pass URL (stay 100% in-app, never launch external NBA phone app)
  const isNbaSite = isNbaUrl(url);

  // Check if current search query
  const isGoogleSearch = url.includes('google.com/search');
  const searchQuery = isGoogleSearch
    ? new URLSearchParams(url.split('?')[1] || '').get('q') || ''
    : '';

  // Check if Kododake game
  const isKododakeGame = url.includes('kododake.com/game');

  const scaleRatio = scalePercent / 100;

  return (
    <div
      className="relative w-full h-full bg-neutral-950 flex flex-col overflow-hidden"
      onClick={onInteraction}
      onTouchStart={onInteraction}
    >
      {/* Scaled viewport container */}
      <div
        className="w-full h-full relative overflow-auto flex items-stretch justify-center"
        style={{
          transformOrigin: 'top center',
        }}
      >
        <div
          className={`h-full transition-all duration-200 ${
            desktopMode ? 'min-w-[1200px] w-[1200px]' : 'w-full'
          }`}
          style={{
            zoom: scaleRatio !== 1 ? scaleRatio : undefined,
          }}
        >
          {/* NBA League Pass Custom In-App Wrapper */}
          {isNbaSite ? (
            <NbaLeaguePassWrapper
              url={url}
              drmL3Enforcer={drmL3Enforcer}
              onNavigate={onNavigate}
            />
          ) : isKododakeGame ? (
            <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-gradient-to-br from-neutral-900 via-indigo-950/40 to-black text-white text-center">
              <div className="w-20 h-20 rounded-3xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center mb-6 shadow-2xl">
                <Play className="w-10 h-10 text-blue-400 fill-blue-400" />
              </div>
              <h2 className="text-3xl font-extrabold tracking-tight mb-2">Kododake Games Arcade</h2>
              <p className="text-neutral-400 max-w-md mb-8 text-sm">
                Fast, responsive lightweight touch games designed for parked breaks and Android Auto touchscreens.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl w-full">
                <button
                  onClick={() => onNavigate('https://play2048.co/')}
                  className="p-5 rounded-2xl bg-neutral-800/80 hover:bg-neutral-800 border border-neutral-700/80 flex flex-col items-center gap-3 bouncy-tap transition-all hover:border-blue-500"
                >
                  <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center text-lg">
                    2048
                  </div>
                  <div className="font-semibold text-white">Classic 2048</div>
                  <div className="text-xs text-neutral-400">Join numbers to get 2048!</div>
                </button>

                <button
                  onClick={() => onNavigate('https://hextris.io/')}
                  className="p-5 rounded-2xl bg-neutral-800/80 hover:bg-neutral-800 border border-neutral-700/80 flex flex-col items-center gap-3 bouncy-tap transition-all hover:border-blue-500"
                >
                  <div className="w-12 h-12 rounded-xl bg-purple-500/20 text-purple-400 font-bold flex items-center justify-center text-lg">
                    HEX
                  </div>
                  <div className="font-semibold text-white">Hextris</div>
                  <div className="text-xs text-neutral-400">Fast hexagon puzzle</div>
                </button>

                <button
                  onClick={() => onNavigate('https://pacman.live/')}
                  className="p-5 rounded-2xl bg-neutral-800/80 hover:bg-neutral-800 border border-neutral-700/80 flex flex-col items-center gap-3 bouncy-tap transition-all hover:border-blue-500"
                >
                  <div className="w-12 h-12 rounded-xl bg-yellow-500/20 text-yellow-400 font-bold flex items-center justify-center text-lg">
                    PAC
                  </div>
                  <div className="font-semibold text-white">Retro Maze</div>
                  <div className="text-xs text-neutral-400">Arcade dot eater</div>
                </button>
              </div>

              <div className="mt-8 flex items-center gap-3">
                <a
                  href="https://kododake.com/game/"
                  target="_blank"
                  rel="noreferrer"
                  className="px-5 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-sm flex items-center gap-2 border border-neutral-700 bouncy-tap"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Visit Kododake.com Hub</span>
                </a>
              </div>
            </div>
          ) : isGoogleSearch ? (
            /* Google Search companion reader */
            <div className="w-full h-full flex flex-col p-6 bg-neutral-900 text-white overflow-y-auto">
              <div className="max-w-3xl mx-auto w-full pt-4">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-neutral-800">
                  <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-xl">
                    G
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Search results for &ldquo;{searchQuery}&rdquo;</h2>
                    <p className="text-xs text-neutral-400">AA Browser Car Fast Web Viewer</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Wikipedia Card */}
                  <div
                    onClick={() => onNavigate(`https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(searchQuery)}`)}
                    className="p-4 rounded-2xl bg-neutral-800/70 hover:bg-neutral-800 border border-neutral-700/60 cursor-pointer bouncy-tap transition-colors"
                  >
                    <div className="text-xs text-emerald-400 font-medium mb-1">en.wikipedia.org</div>
                    <div className="text-lg font-semibold text-blue-400 hover:underline">
                      Wikipedia: {searchQuery}
                    </div>
                    <div className="text-sm text-neutral-300 mt-1">
                      Read encyclopedia entries and comprehensive automotive or general knowledge on Wikipedia.
                    </div>
                  </div>

                  {/* DuckDuckGo Instant Web Results */}
                  <div
                    onClick={() => onNavigate(`https://duckduckgo.com/?q=${encodeURIComponent(searchQuery)}`)}
                    className="p-4 rounded-2xl bg-neutral-800/70 hover:bg-neutral-800 border border-neutral-700/60 cursor-pointer bouncy-tap transition-colors"
                  >
                    <div className="text-xs text-orange-400 font-medium mb-1">duckduckgo.com</div>
                    <div className="text-lg font-semibold text-blue-400 hover:underline">
                      DuckDuckGo Instant Search
                    </div>
                    <div className="text-sm text-neutral-300 mt-1">
                      Privacy-focused search engine with clean readability on car displays.
                    </div>
                  </div>

                  {/* YouTube Videos */}
                  <div
                    onClick={() => onNavigate(`https://youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`)}
                    className="p-4 rounded-2xl bg-neutral-800/70 hover:bg-neutral-800 border border-neutral-700/60 cursor-pointer bouncy-tap transition-colors"
                  >
                    <div className="text-xs text-red-400 font-medium mb-1">youtube.com</div>
                    <div className="text-lg font-semibold text-blue-400 hover:underline">
                      Watch &ldquo;{searchQuery}&rdquo; videos on YouTube
                    </div>
                    <div className="text-sm text-neutral-300 mt-1">
                      Explore music, podcasts, vehicle tutorials, and parked car entertainment.
                    </div>
                  </div>

                  {/* Direct Google External Option */}
                  <div className="pt-4 flex items-center justify-between p-4 rounded-2xl bg-blue-950/30 border border-blue-900/40">
                    <div>
                      <div className="font-semibold text-sm text-blue-300">Open full Google page</div>
                      <div className="text-xs text-neutral-400">Direct query on Google Search</div>
                    </div>
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 bouncy-tap"
                    >
                      <span>Open External</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Standard Web Iframe with Security & Error Fallback */
            <div className="w-full h-full relative">
              <iframe
                key={key}
                src={activeUrl}
                title={title || activeUrl}
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-downloads allow-presentation"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                className="w-full h-full border-none bg-white"
                onError={() => setFrameError(true)}
              />

              {/* Informational overlay banner for external sites if X-Frame-Options blocks */}
              <div className="absolute bottom-4 right-4 z-20 flex items-center gap-2">
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-2 rounded-xl bg-neutral-900/90 hover:bg-neutral-800 text-neutral-200 hover:text-white text-xs font-medium border border-neutral-700 shadow-xl backdrop-blur-md flex items-center gap-2 bouncy-tap"
                  title="Open site in an external window"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
                  <span>Open External Link</span>
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
