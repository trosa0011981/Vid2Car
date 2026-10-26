import React, { useState } from 'react';
import { BrowserSettings, UserAgentProfile, AppThemeMode, QuickActionButtonMode, QuickActionButtonPosition } from '../../types/browser';
import { ExpressiveModal } from '../common/ExpressiveModal';
import {
  Settings as SettingsIcon,
  Palette,
  Maximize2,
  Navigation,
  Sliders,
  Sparkles,
  Shield,
  FileText,
  Trash2,
  Upload,
  Check,
  RotateCcw,
  ExternalLink,
  Info,
} from 'lucide-react';
import { formatNavigableUrl, GITHUB_REPO_URL, AA_ANYTHING_RELEASE_URL } from '../../utils/urlFormatter';

interface SettingsSheetProps {
  isOpen: boolean;
  settings: BrowserSettings;
  slotCount: number;
  currentUrl: string;
  onClose: () => void;
  onUpdateSettings: (newSettings: Partial<BrowserSettings>) => void;
  onClearSitePermissions: () => void;
  onClearCookiesAndData: () => void;
  onClearAllowedHttpHosts: () => void;
}

export const SettingsSheet: React.FC<SettingsSheetProps> = ({
  isOpen,
  settings,
  slotCount,
  currentUrl,
  onClose,
  onUpdateSettings,
  onClearSitePermissions,
  onClearCookiesAndData,
  onClearAllowedHttpHosts,
}) => {
  const [homePageInput, setHomePageInput] = useState(settings.homePageUrl || '');
  const [customUaInput, setCustomUaInput] = useState(settings.customUserAgent || '');
  const [activeSection, setActiveSection] = useState<
    'appearance' | 'scale' | 'navigation' | 'controls' | 'startpage' | 'privacy' | 'license'
  >('appearance');
  const [showToast, setShowToast] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setShowToast(msg);
    setTimeout(() => setShowToast(null), 2500);
  };

  const handleSetCurrentAsHome = () => {
    if (currentUrl) {
      setHomePageInput(currentUrl);
      onUpdateSettings({ homePageUrl: currentUrl });
      triggerToast('Home page set to current site');
    }
  };

  const handleClearHomePage = () => {
    setHomePageInput('');
    onUpdateSettings({ homePageUrl: null });
    triggerToast('Home page cleared (using Start Page)');
  };

  const handleCustomWallpaperUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          onUpdateSettings({ startPageBackgroundUri: reader.result });
          triggerToast('Custom wallpaper applied');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <ExpressiveModal isOpen={isOpen} onClose={onClose} maxHeight="max-h-[92vh]">
      <div className="flex flex-col gap-4 pb-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400">
              <SettingsIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Browser Preferences</h3>
              <p className="text-xs text-neutral-400">Configure display, automotive scaling, and privacy</p>
            </div>
          </div>

          {showToast && (
            <div className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-semibold border border-emerald-500/40 animate-fade-in">
              {showToast}
            </div>
          )}
        </div>

        {/* Section Navigation Pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {[
            { id: 'appearance', label: 'Appearance', icon: Palette },
            { id: 'scale', label: 'Display Scale', icon: Maximize2 },
            { id: 'navigation', label: 'Navigation & Startup', icon: Navigation },
            { id: 'controls', label: 'In-App Controls', icon: Sliders },
            { id: 'startpage', label: 'Start Page', icon: Sparkles },
            { id: 'privacy', label: 'Privacy & Engine', icon: Shield },
            { id: 'license', label: 'About & License', icon: FileText },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSection === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSection(tab.id as any)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-colors bouncy-tap border ${
                  isActive
                    ? 'bg-blue-600 text-white border-blue-500 shadow'
                    : 'bg-neutral-800/80 hover:bg-neutral-800 text-neutral-400 hover:text-white border-neutral-700/50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Section 1: Appearance */}
        {activeSection === 'appearance' && (
          <div className="space-y-4 pt-2">
            <div className="p-4 rounded-2xl bg-neutral-800/60 border border-neutral-700/60 space-y-3">
              <div className="font-semibold text-sm text-white">Theme Mode</div>
              <p className="text-xs text-neutral-400">
                Choose between True Black AMOLED mode for parked car cabins or Auto system match.
              </p>
              <div className="grid grid-cols-3 gap-2 pt-1">
                {(['dark', 'auto', 'light'] as AppThemeMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => {
                      onUpdateSettings({ themeMode: mode });
                      triggerToast(`Theme set to ${mode}`);
                    }}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 border bouncy-tap ${
                      settings.themeMode === mode
                        ? 'bg-blue-600 text-white border-blue-500 shadow-md'
                        : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border-neutral-700'
                    }`}
                  >
                    <span>{mode === 'dark' ? 'Dark (AMOLED)' : mode}</span>
                    {settings.themeMode === mode && <Check className="w-3.5 h-3.5" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Section 2: Display Scale */}
        {activeSection === 'scale' && (
          <div className="space-y-4 pt-2">
            <div className="p-4 rounded-2xl bg-neutral-800/60 border border-neutral-700/60 space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-white">Automotive Display Scale</span>
                  <span className="px-3 py-1 rounded-xl bg-blue-600/20 text-blue-400 font-bold text-sm border border-blue-500/30">
                    {settings.globalScalePercent}%
                  </span>
                </div>
                <p className="text-xs text-neutral-400 mt-1">
                  Adjust UI font size and web page layout to match your head unit screen distance.
                </p>
              </div>

              {/* Slider */}
              <input
                type="range"
                min="40"
                max="200"
                step="5"
                value={settings.globalScalePercent}
                onChange={(e) => onUpdateSettings({ globalScalePercent: parseInt(e.target.value, 10) })}
                className="w-full accent-blue-500 cursor-pointer h-2 bg-neutral-700 rounded-lg"
              />

              {/* Presets */}
              <div className="grid grid-cols-4 gap-2">
                {[80, 100, 120, 140].map((preset) => (
                  <button
                    key={preset}
                    onClick={() => onUpdateSettings({ globalScalePercent: preset })}
                    className={`py-2 rounded-xl text-xs font-semibold border bouncy-tap ${
                      settings.globalScalePercent === preset
                        ? 'bg-blue-600 text-white border-blue-500 shadow'
                        : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border-neutral-700'
                    }`}
                  >
                    {preset}%
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Section 3: Navigation & Startup */}
        {activeSection === 'navigation' && (
          <div className="space-y-4 pt-2">
            {/* Home page */}
            <div className="p-4 rounded-2xl bg-neutral-800/60 border border-neutral-700/60 space-y-3">
              <div className="font-semibold text-sm text-white">Home Page</div>
              <p className="text-xs text-neutral-400">
                Leave empty to use the standard automotive start page with quick link tiles.
              </p>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={homePageInput}
                  onChange={(e) => setHomePageInput(e.target.value)}
                  placeholder="https://www.google.com"
                  className="flex-1 bg-neutral-900 border border-neutral-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
                <button
                  onClick={() => {
                    if (homePageInput.trim()) {
                      const nav = formatNavigableUrl(homePageInput);
                      onUpdateSettings({ homePageUrl: nav });
                      triggerToast('Home page saved');
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs bouncy-tap"
                >
                  Save
                </button>
              </div>

              <div className="flex items-center gap-2 pt-1">
                {currentUrl && (
                  <button
                    onClick={handleSetCurrentAsHome}
                    className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium bouncy-tap"
                  >
                    Use current site
                  </button>
                )}
                {settings.homePageUrl && (
                  <button
                    onClick={handleClearHomePage}
                    className="px-3 py-1.5 rounded-xl bg-red-950/40 hover:bg-red-900/60 text-red-400 text-xs font-medium border border-red-800/50 bouncy-tap"
                  >
                    Clear home page
                  </button>
                )}
              </div>
            </div>

            {/* Startup Toggles */}
            <div className="p-4 rounded-2xl bg-neutral-800/60 border border-neutral-700/60 space-y-3">
              <div className="font-semibold text-sm text-white">Startup Behaviors</div>

              {/* Restore tabs toggle */}
              <div
                onClick={() => onUpdateSettings({ restoreTabsOnLaunch: !settings.restoreTabsOnLaunch })}
                className="flex items-center justify-between cursor-pointer py-1"
              >
                <div>
                  <div className="text-xs font-semibold text-neutral-200">Restore tabs on launch</div>
                  <div className="text-[11px] text-neutral-400">Reopen tabs from your previous session</div>
                </div>
                <div
                  className={`w-10 h-5 rounded-full transition-colors relative flex items-center px-0.5 ${
                    settings.restoreTabsOnLaunch ? 'bg-blue-600' : 'bg-neutral-700'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      settings.restoreTabsOnLaunch ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </div>
              </div>

              {/* Resume last page toggle */}
              <div
                onClick={() => onUpdateSettings({ resumeLastPageOnLaunch: !settings.resumeLastPageOnLaunch })}
                className="flex items-center justify-between cursor-pointer py-1 border-t border-neutral-700/50 pt-3"
              >
                <div>
                  <div className="text-xs font-semibold text-neutral-200">Resume last page on launch</div>
                  <div className="text-[11px] text-neutral-400">Jump directly back to where you left off</div>
                </div>
                <div
                  className={`w-10 h-5 rounded-full transition-colors relative flex items-center px-0.5 ${
                    settings.resumeLastPageOnLaunch ? 'bg-blue-600' : 'bg-neutral-700'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      settings.resumeLastPageOnLaunch ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Section 4: In-App Controls */}
        {activeSection === 'controls' && (
          <div className="space-y-4 pt-2">
            <div className="p-4 rounded-2xl bg-neutral-800/60 border border-neutral-700/60 space-y-4">
              <div className="font-semibold text-sm text-white">Floating In-App Button (FAB)</div>

              {/* Floating button action */}
              <div>
                <label className="text-xs text-neutral-300 font-medium block mb-1.5">
                  Floating Button Action
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => onUpdateSettings({ quickActionButtonMode: 'menu' })}
                    className={`py-2 rounded-xl text-xs font-semibold border bouncy-tap ${
                      settings.quickActionButtonMode === 'menu'
                        ? 'bg-blue-600 text-white border-blue-500 shadow'
                        : 'bg-neutral-800 text-neutral-300 border-neutral-700'
                    }`}
                  >
                    Open Menu
                  </button>
                  <button
                    onClick={() => onUpdateSettings({ quickActionButtonMode: 'address_bar' })}
                    className={`py-2 rounded-xl text-xs font-semibold border bouncy-tap ${
                      settings.quickActionButtonMode === 'address_bar'
                        ? 'bg-blue-600 text-white border-blue-500 shadow'
                        : 'bg-neutral-800 text-neutral-300 border-neutral-700'
                    }`}
                  >
                    Focus URL Bar
                  </button>
                </div>
              </div>

              {/* Position */}
              <div>
                <label className="text-xs text-neutral-300 font-medium block mb-1.5">
                  Button Screen Position
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'bottom_left', label: 'Bottom Left' },
                    { id: 'bottom_right', label: 'Bottom Right' },
                    { id: 'top_left', label: 'Top Left' },
                    { id: 'top_right', label: 'Top Right' },
                  ].map((pos) => (
                    <button
                      key={pos.id}
                      onClick={() => onUpdateSettings({ quickActionButtonPosition: pos.id as QuickActionButtonPosition })}
                      className={`py-2 rounded-xl text-xs font-semibold border bouncy-tap ${
                        settings.quickActionButtonPosition === pos.id
                          ? 'bg-blue-600 text-white border-blue-500 shadow'
                          : 'bg-neutral-800 text-neutral-300 border-neutral-700'
                      }`}
                    >
                      {pos.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Always visible toggle */}
              <div
                onClick={() => onUpdateSettings({ quickActionButtonAlwaysVisible: !settings.quickActionButtonAlwaysVisible })}
                className="flex items-center justify-between cursor-pointer py-1 border-t border-neutral-700/50 pt-3"
              >
                <div>
                  <div className="text-xs font-semibold text-neutral-200">Always show floating button</div>
                  <div className="text-[11px] text-neutral-400">Keep on-screen instead of auto-hiding after 3 seconds</div>
                </div>
                <div
                  className={`w-10 h-5 rounded-full transition-colors relative flex items-center px-0.5 ${
                    settings.quickActionButtonAlwaysVisible ? 'bg-blue-600' : 'bg-neutral-700'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      settings.quickActionButtonAlwaysVisible ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </div>
              </div>

              {/* Always show URL bar */}
              <div
                onClick={() => onUpdateSettings({ alwaysShowUrlBar: !settings.alwaysShowUrlBar })}
                className="flex items-center justify-between cursor-pointer py-1 border-t border-neutral-700/50 pt-3"
              >
                <div>
                  <div className="text-xs font-semibold text-neutral-200">Always show top URL bar</div>
                  <div className="text-[11px] text-neutral-400">Keep the navigation bar docked at the top</div>
                </div>
                <div
                  className={`w-10 h-5 rounded-full transition-colors relative flex items-center px-0.5 ${
                    settings.alwaysShowUrlBar ? 'bg-blue-600' : 'bg-neutral-700'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      settings.alwaysShowUrlBar ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Section 5: Start Page Settings */}
        {activeSection === 'startpage' && (
          <div className="space-y-4 pt-2">
            <div className="p-4 rounded-2xl bg-neutral-800/60 border border-neutral-700/60 space-y-4">
              <div className="font-semibold text-sm text-white">Start Page Customization</div>

              <div className="text-xs text-neutral-400">
                Currently configured: <span className="font-bold text-white">{slotCount}/6</span> quick links.
              </div>

              {/* Custom wallpaper */}
              <div className="space-y-2 border-t border-neutral-700/50 pt-3">
                <div className="text-xs font-semibold text-neutral-200">Custom Background Wallpaper</div>
                <div className="flex items-center gap-2">
                  <label className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer bouncy-tap shadow">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleCustomWallpaperUpload}
                      className="hidden"
                    />
                  </label>

                  {settings.startPageBackgroundUri && (
                    <button
                      onClick={() => {
                        onUpdateSettings({ startPageBackgroundUri: null });
                        triggerToast('Background reset to default');
                      }}
                      className="px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium bouncy-tap"
                    >
                      Clear Background
                    </button>
                  )}
                </div>
              </div>

              {/* AA Anything Promo Banner */}
              <div
                onClick={() => onUpdateSettings({ showAAAnythingPromotion: !settings.showAAAnythingPromotion })}
                className="flex items-center justify-between cursor-pointer py-1 border-t border-neutral-700/50 pt-3"
              >
                <div>
                  <div className="text-xs font-semibold text-neutral-200">Show AA Anything Banner</div>
                  <div className="text-[11px] text-neutral-400">Display introduction card on start page</div>
                </div>
                <div
                  className={`w-10 h-5 rounded-full transition-colors relative flex items-center px-0.5 ${
                    settings.showAAAnythingPromotion ? 'bg-blue-600' : 'bg-neutral-700'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      settings.showAAAnythingPromotion ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Section 6: Privacy & Engine */}
        {activeSection === 'privacy' && (
          <div className="space-y-4 pt-2">
            <div className="p-4 rounded-2xl bg-neutral-800/60 border border-neutral-700/60 space-y-4">
              <div className="font-semibold text-sm text-white">Browser Identity &amp; DRM</div>

              {/* User Agent profile */}
              <div>
                <label className="text-xs text-neutral-300 font-medium block mb-1.5">
                  User Agent Identity
                </label>
                <select
                  value={settings.userAgentProfile}
                  onChange={(e) => onUpdateSettings({ userAgentProfile: e.target.value as UserAgentProfile })}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="android_chrome">Chrome (Android default)</option>
                  <option value="safari">Safari (iOS/macOS)</option>
                  <option value="firefox">Firefox</option>
                  <option value="edge">Microsoft Edge</option>
                  <option value="samsung_internet">Samsung Internet</option>
                  <option value="custom">Custom User Agent</option>
                </select>
              </div>

              {/* Custom UA input */}
              {settings.userAgentProfile === 'custom' && (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={customUaInput}
                    onChange={(e) => setCustomUaInput(e.target.value)}
                    placeholder="Enter custom User Agent string"
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                  <button
                    onClick={() => {
                      onUpdateSettings({ customUserAgent: customUaInput });
                      triggerToast('Custom User Agent applied');
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-semibold"
                  >
                    Apply UA
                  </button>
                </div>
              )}

              {/* DRM L3 enforcer toggle */}
              <div
                onClick={() => onUpdateSettings({ drmL3Enforcer: !settings.drmL3Enforcer })}
                className="flex items-center justify-between cursor-pointer py-1 border-t border-neutral-700/50 pt-3"
              >
                <div>
                  <div className="text-xs font-semibold text-neutral-200">DRM Widevine L3 Enforcer</div>
                  <div className="text-[11px] text-neutral-400">
                    Resolves black screen video playback failures on head unit hardware
                  </div>
                </div>
                <div
                  className={`w-10 h-5 rounded-full transition-colors relative flex items-center px-0.5 ${
                    settings.drmL3Enforcer ? 'bg-blue-600' : 'bg-neutral-700'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      settings.drmL3Enforcer ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </div>
              </div>

              {/* Reset site permissions */}
              <div className="space-y-2 border-t border-neutral-700/50 pt-3">
                <div className="text-xs font-semibold text-neutral-200">Site Data &amp; Permissions</div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      onClearSitePermissions();
                      triggerToast('Site permissions reset');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium border border-neutral-700"
                  >
                    Reset Permissions
                  </button>
                  <button
                    onClick={() => {
                      onClearAllowedHttpHosts();
                      triggerToast('Allowed HTTP hosts cleared');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium border border-neutral-700"
                  >
                    Reset HTTP Hosts
                  </button>
                  <button
                    onClick={() => {
                      onClearCookiesAndData();
                      triggerToast('Cookies and local data deleted');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-red-950/40 hover:bg-red-900/60 text-red-400 text-xs font-medium border border-red-800/50"
                  >
                    Delete Cookies &amp; Data
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Section 7: License & About */}
        {activeSection === 'license' && (
          <div className="space-y-4 pt-2">
            <div className="p-4 rounded-2xl bg-neutral-800/60 border border-neutral-700/60 space-y-3">
              <div className="font-semibold text-sm text-white">License &amp; Open Source Attribution</div>
              <p className="text-xs text-neutral-300 leading-relaxed">
                This application and its source code are licensed under the GNU General Public License version 3 (GPLv3).
                If you incorporate this application or use any of its code, you must include clear attribution to the repository:
              </p>
              <div className="p-3 rounded-xl bg-neutral-900 text-blue-400 text-xs font-mono select-all">
                https://github.com/kododake/AABrowser
              </div>
              <div className="text-[11px] text-neutral-400">
                This statement cannot be modified or hidden under any circumstances.
              </div>

              <div className="pt-2 border-t border-neutral-700/50">
                <div className="text-xs font-bold text-white mb-2">Contributors</div>
                <ul className="text-xs text-neutral-300 space-y-1">
                  <li>&bull; <strong className="text-white">kododake</strong> &mdash; Project Lead &amp; Maintainer</li>
                  <li>&bull; <strong className="text-white">Colin Crowther</strong> &mdash; Original Design</li>
                  <li>&bull; <strong className="text-white">jigneshbhavani</strong> &mdash; Microphone Support</li>
                  <li>&bull; <strong className="text-white">SaveEditors</strong> &mdash; Multi-tab Support &amp; Home Screen</li>
                  <li>&bull; <strong className="text-white">gregorixG</strong> &mdash; Desktop Site UA Handling</li>
                  <li>&bull; <strong className="text-white">breakzplatform</strong> &mdash; Custom UA Handling</li>
                </ul>
              </div>

              <div className="pt-2 flex items-center gap-3">
                <a
                  href={GITHUB_REPO_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold flex items-center gap-1.5 border border-neutral-700 bouncy-tap"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>GitHub Repository</span>
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </ExpressiveModal>
  );
};
