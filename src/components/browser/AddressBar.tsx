import React, { useState, useEffect, useRef } from 'react';
import {
  Lock,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  RotateCw,
  X,
  Star,
  Layers,
  Menu as MenuIcon,
  Home,
} from 'lucide-react';
import { formatNavigableUrl } from '../../utils/urlFormatter';

interface AddressBarProps {
  url: string;
  isSecure?: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
  tabCount: number;
  isBookmarked: boolean;
  onNavigate: (url: string) => void;
  onBack: () => void;
  onForward: () => void;
  onReload: () => void;
  onHome: () => void;
  onToggleBookmark: () => void;
  onOpenTabs: () => void;
  onOpenMenu: () => void;
  onSecurityClick?: () => void;
  autoFocus?: boolean;
}

export const AddressBar: React.FC<AddressBarProps> = ({
  url,
  isSecure = true,
  canGoBack,
  canGoForward,
  tabCount,
  isBookmarked,
  onNavigate,
  onBack,
  onForward,
  onReload,
  onHome,
  onToggleBookmark,
  onOpenTabs,
  onOpenMenu,
  onSecurityClick,
  autoFocus = false,
}) => {
  const [inputValue, setInputValue] = useState(url);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isFocused) {
      setInputValue(url);
    }
  }, [url, isFocused]);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [autoFocus]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onNavigate(formatNavigableUrl(inputValue));
      inputRef.current?.blur();
    }
  };

  const handleClear = () => {
    setInputValue('');
    inputRef.current?.focus();
  };

  return (
    <div className="w-full bg-neutral-900/95 border-b border-neutral-800 px-3 py-2 flex items-center gap-2 select-none z-30 backdrop-blur-md">
      {/* Navigation buttons */}
      <div className="flex items-center gap-1">
        <button
          onClick={onBack}
          disabled={!canGoBack}
          className="p-2 rounded-xl text-neutral-300 hover:text-white hover:bg-neutral-800 disabled:opacity-30 disabled:hover:bg-transparent bouncy-tap"
          title="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <button
          onClick={onForward}
          disabled={!canGoForward}
          className="p-2 rounded-xl text-neutral-300 hover:text-white hover:bg-neutral-800 disabled:opacity-30 disabled:hover:bg-transparent bouncy-tap"
          title="Forward"
        >
          <ArrowRight className="w-5 h-5" />
        </button>
        <button
          onClick={onReload}
          className="p-2 rounded-xl text-neutral-300 hover:text-white hover:bg-neutral-800 bouncy-tap"
          title="Reload"
        >
          <RotateCw className="w-4 h-4" />
        </button>
        <button
          onClick={onHome}
          className="p-2 rounded-xl text-neutral-300 hover:text-white hover:bg-neutral-800 bouncy-tap"
          title="Start Page"
        >
          <Home className="w-5 h-5" />
        </button>
      </div>

      {/* URL / Search Input Pill */}
      <form onSubmit={handleSubmit} className="flex-1 relative flex items-center">
        <div className="relative w-full flex items-center">
          {/* Security Indicator */}
          <button
            type="button"
            onClick={onSecurityClick}
            className="absolute left-3.5 flex items-center text-neutral-400 hover:text-neutral-200"
            title={isSecure ? 'Secure connection (HTTPS)' : 'Insecure connection (HTTP)'}
          >
            {isSecure ? (
              <Lock className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            )}
          </button>

          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onFocus={() => {
              setIsFocused(true);
              inputRef.current?.select();
            }}
            onBlur={() => setIsFocused(false)}
            placeholder="Search or type web address"
            className="w-full bg-neutral-800/90 hover:bg-neutral-800 focus:bg-neutral-950 text-white pl-10 pr-10 py-2.5 rounded-2xl text-sm border border-neutral-700/70 focus:border-blue-500 focus:outline-none transition-all placeholder:text-neutral-500 shadow-inner"
          />

          {/* Clear input button */}
          {inputValue && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-3 p-1 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-700/60"
              title="Clear address"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </form>

      {/* Right controls */}
      <div className="flex items-center gap-1">
        {/* Bookmark button */}
        <button
          onClick={onToggleBookmark}
          className={`p-2 rounded-xl text-neutral-300 hover:text-white hover:bg-neutral-800 bouncy-tap ${
            isBookmarked ? 'text-amber-400 hover:text-amber-300' : ''
          }`}
          title={isBookmarked ? 'In bookmarks' : 'Add to bookmarks'}
        >
          <Star className={`w-5 h-5 ${isBookmarked ? 'fill-amber-400' : ''}`} />
        </button>

        {/* Tab Switcher */}
        <button
          onClick={onOpenTabs}
          className="relative px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-semibold text-xs flex items-center gap-1 bouncy-tap border border-neutral-700"
          title="Open tabs"
        >
          <Layers className="w-4 h-4 text-blue-400" />
          <span>{tabCount}</span>
        </button>

        {/* Menu button */}
        <button
          onClick={onOpenMenu}
          className="p-2 rounded-xl text-neutral-300 hover:text-white hover:bg-neutral-800 bouncy-tap"
          title="Open menu"
        >
          <MenuIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
