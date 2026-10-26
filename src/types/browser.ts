export type AppThemeMode = 'auto' | 'light' | 'dark';

export type QuickActionButtonMode = 'menu' | 'address_bar';

export type QuickActionButtonPosition =
  | 'bottom_left'
  | 'bottom_right'
  | 'top_left'
  | 'top_right';

export type UserAgentProfile =
  | 'android_chrome'
  | 'safari'
  | 'firefox'
  | 'edge'
  | 'samsung_internet'
  | 'custom';

export interface BookmarkEntry {
  url: string;
  title: string;
}

export interface TabSessionEntry {
  id: string;
  url: string;
  title: string;
  history: string[];
  historyIndex: number;
  isLoading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
  favicon?: string;
  isSecure?: boolean;
}

export interface StartPageSlot {
  index: number;
  url: string | null;
  title: string;
}

export interface BrowserSettings {
  themeMode: AppThemeMode;
  globalScalePercent: number; // 40 - 200, default 100
  homePageUrl: string | null;
  restoreTabsOnLaunch: boolean;
  resumeLastPageOnLaunch: boolean;
  alwaysShowUrlBar: boolean;
  quickActionButtonMode: QuickActionButtonMode;
  quickActionButtonAlwaysVisible: boolean;
  quickActionButtonPosition: QuickActionButtonPosition;
  hideSponsors: boolean;
  showAAAnythingPromotion: boolean;
  startPageBackgroundUri: string | null;
  userAgentProfile: UserAgentProfile;
  customUserAgent: string;
  desktopMode: boolean;
  fullscreenMode: boolean;
  drmL3Enforcer: boolean;
  allowedCleartextHosts: string[];
  allowedLocationHosts: string[];
  allowedMicrophoneHosts: string[];
}

export interface SponsorInfo {
  name: string;
  github?: string;
  amount: number;
  message?: string;
  date?: string;
}
