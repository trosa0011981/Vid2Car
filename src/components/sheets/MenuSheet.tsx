import React, { useState } from 'react';
import {
  X,
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Search,
  Star,
  QrCode,
  Settings as SettingsIcon,
  Home,
  Layers,
  Plus,
  Monitor,
  Maximize,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { ExpressiveModal } from '../common/ExpressiveModal';
import { formatNavigableUrl } from '../../utils/urlFormatter';

interface MenuSheetProps {
  isOpen: boolean;
  pageTitle: string;
  currentUrl: string;
  canGoBack: boolean;
  canGoForward: boolean;
  isDesktopMode: boolean;
  isFullscreenMode: boolean;
  tabCount: number;
  bookmarkCount: number;
  versionName: string;
  onClose: () => void;
  onNavigate: (url: string) => void;
  onBack: () => void;
  onForward: () => void;
  onReload: () => void;
  onHome: () => void;
  onOpenBookmarks: () => void;
  onOpenQrShare: () => void;
  onOpenSettings: () => void;
  onOpenTabs: () => void;
  onNewTab: () => void;
  onToggleDesktop: () => void;
  onToggleFullscreen: () => void;
  onCheckUpdates: () => void;
  onOpenGitHub: () => void;
}

export const MenuSheet: React.FC<MenuSheetProps> = ({
  isOpen,
  pageTitle,
  currentUrl,
  canGoBack,
  canGoForward,
  isDesktopMode,
  isFullscreenMode,
  tabCount,
  bookmarkCount,
  versionName,
  onClose,
  onNavigate,
  onBack,
  onForward,
  onReload,
  onHome,
  onOpenBookmarks,
  onOpenQrShare,
  onOpenSettings,
  onOpenTabs,
  onNewTab,
  onToggleDesktop,
  onToggleFullscreen,
  onCheckUpdates,
  onOpenGitHub,
}) => {
  const [addressInput, setAddressInput] = useState(currentUrl);

  const handleNavigateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (addressInput.trim()) {
      onNavigate(formatNavigableUrl(addressInput));
      onClose();
    }
  };

  return (
    <ExpressiveModal isOpen={isOpen} onClose={onClose} maxHeight="max-h-[92vh]">
      <div className="flex flex-col gap-4 pb-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
          <div className="truncate pr-4">
            <h3 className="text-lg font-bold text-white truncate">
              {pageTitle || 'AABrowser'}
            </h3>
            <p className="text-xs text-neutral-400 truncate">
              {currentUrl || 'Start Page'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors bouncy-tap"
            title="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Address Bar in Menu */}
        <form onSubmit={handleNavigateSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-neutral-400" />
            <input
              type="text"
              value={addressInput}
              onChange={(e) => setAddressInput(e.target.value)}
              placeholder="Address or search"
              className="w-full bg-neutral-800/90 hover:bg-neutral-800 focus:bg-neutral-950 text-white pl-10 pr-4 py-2.5 rounded-2xl text-sm border border-neutral-700 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm bouncy-tap shadow"
          >
            Go
          </button>
        </form>

        {/* Navigation Buttons Row */}
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => {
              onBack();
              onClose();
            }}
            disabled={!canGoBack}
            className="py-3 px-4 rounded-2xl bg-neutral-800/80 hover:bg-neutral-700 disabled:opacity-30 disabled:hover:bg-neutral-800/80 flex items-center justify-center gap-2 text-sm font-semibold text-neutral-200 bouncy-tap"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          <button
            onClick={() => {
              onForward();
              onClose();
            }}
            disabled={!canGoForward}
            className="py-3 px-4 rounded-2xl bg-neutral-800/80 hover:bg-neutral-700 disabled:opacity-30 disabled:hover:bg-neutral-800/80 flex items-center justify-center gap-2 text-sm font-semibold text-neutral-200 bouncy-tap"
          >
            <span>Forward</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              onReload();
              onClose();
            }}
            className="py-3 px-4 rounded-2xl bg-neutral-800/80 hover:bg-neutral-700 flex items-center justify-center gap-2 text-sm font-semibold text-neutral-200 bouncy-tap"
          >
            <RotateCw className="w-4 h-4" />
            <span>Reload</span>
          </button>
        </div>

        {/* Quick Actions Grid (6 cards) */}
        <div className="grid grid-cols-3 gap-2.5 pt-1">
          {/* Bookmarks */}
          <button
            onClick={() => {
              onClose();
              onOpenBookmarks();
            }}
            className="p-3.5 rounded-2xl bg-neutral-800/60 hover:bg-neutral-800 border border-neutral-700/50 flex flex-col items-center justify-center gap-2 bouncy-tap transition-colors group"
          >
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 group-hover:bg-amber-500/20">
              <Star className="w-5 h-5 fill-amber-400/20 group-hover:fill-amber-400" />
            </div>
            <div className="text-xs font-semibold text-neutral-200">Bookmarks</div>
            <div className="text-[10px] text-neutral-400">{bookmarkCount} saved</div>
          </button>

          {/* Share / QR Code */}
          <button
            onClick={() => {
              onClose();
              onOpenQrShare();
            }}
            className="p-3.5 rounded-2xl bg-neutral-800/60 hover:bg-neutral-800 border border-neutral-700/50 flex flex-col items-center justify-center gap-2 bouncy-tap transition-colors group"
          >
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 group-hover:bg-purple-500/20">
              <QrCode className="w-5 h-5" />
            </div>
            <div className="text-xs font-semibold text-neutral-200">Share / QR</div>
            <div className="text-[10px] text-neutral-400">Scan to mobile</div>
          </button>

          {/* Settings */}
          <button
            onClick={() => {
              onClose();
              onOpenSettings();
            }}
            className="p-3.5 rounded-2xl bg-neutral-800/60 hover:bg-neutral-800 border border-neutral-700/50 flex flex-col items-center justify-center gap-2 bouncy-tap transition-colors group"
          >
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 group-hover:bg-blue-500/20">
              <SettingsIcon className="w-5 h-5" />
            </div>
            <div className="text-xs font-semibold text-neutral-200">Settings</div>
            <div className="text-[10px] text-neutral-400">Scale &amp; display</div>
          </button>

          {/* Home */}
          <button
            onClick={() => {
              onHome();
              onClose();
            }}
            className="p-3.5 rounded-2xl bg-neutral-800/60 hover:bg-neutral-800 border border-neutral-700/50 flex flex-col items-center justify-center gap-2 bouncy-tap transition-colors group"
          >
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20">
              <Home className="w-5 h-5" />
            </div>
            <div className="text-xs font-semibold text-neutral-200">Start Page</div>
            <div className="text-[10px] text-neutral-400">Dashboard</div>
          </button>

          {/* Tabs */}
          <button
            onClick={() => {
              onClose();
              onOpenTabs();
            }}
            className="p-3.5 rounded-2xl bg-neutral-800/60 hover:bg-neutral-800 border border-neutral-700/50 flex flex-col items-center justify-center gap-2 bouncy-tap transition-colors group"
          >
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 group-hover:bg-cyan-500/20">
              <Layers className="w-5 h-5" />
            </div>
            <div className="text-xs font-semibold text-neutral-200">Tabs</div>
            <div className="text-[10px] text-neutral-400">{tabCount} active</div>
          </button>

          {/* New Tab */}
          <button
            onClick={() => {
              onNewTab();
              onClose();
            }}
            className="p-3.5 rounded-2xl bg-neutral-800/60 hover:bg-neutral-800 border border-neutral-700/50 flex flex-col items-center justify-center gap-2 bouncy-tap transition-colors group"
          >
            <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 group-hover:bg-rose-500/20">
              <Plus className="w-5 h-5" />
            </div>
            <div className="text-xs font-semibold text-neutral-200">New Tab</div>
            <div className="text-[10px] text-neutral-400">Fresh window</div>
          </button>
        </div>

        {/* Toggle Cards: Desktop & Fullscreen */}
        <div className="flex flex-col gap-2 pt-2">
          {/* Desktop site toggle card */}
          <div
            onClick={onToggleDesktop}
            className="p-3.5 rounded-2xl bg-neutral-800/70 hover:bg-neutral-800 border border-neutral-700/60 flex items-center justify-between cursor-pointer bouncy-tap"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-neutral-700 text-neutral-200">
                <Monitor className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-white">Request desktop site</div>
                <div className="text-xs text-neutral-400">Desktop viewport &amp; Windows UA</div>
              </div>
            </div>
            <div
              className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-1 ${
                isDesktopMode ? 'bg-blue-600' : 'bg-neutral-700'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  isDesktopMode ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </div>
          </div>

          {/* Fullscreen toggle card */}
          <div
            onClick={onToggleFullscreen}
            className="p-3.5 rounded-2xl bg-neutral-800/70 hover:bg-neutral-800 border border-neutral-700/60 flex items-center justify-between cursor-pointer bouncy-tap"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-neutral-700 text-neutral-200">
                <Maximize className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-white">Request full screen</div>
                <div className="text-xs text-neutral-400">Hide system UI for immersive view</div>
              </div>
            </div>
            <div
              className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-1 ${
                isFullscreenMode ? 'bg-blue-600' : 'bg-neutral-700'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  isFullscreenMode ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-neutral-800/80 flex items-center justify-between text-xs text-neutral-400">
          <div>Installed Version: v{versionName}</div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                onClose();
                onCheckUpdates();
              }}
              className="hover:text-blue-400 transition-colors flex items-center gap-1 font-medium"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Check for Updates</span>
            </button>
            <button
              onClick={onOpenGitHub}
              className="hover:text-white transition-colors flex items-center gap-1 font-medium"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>GitHub</span>
            </button>
          </div>
        </div>
      </div>
    </ExpressiveModal>
  );
};
