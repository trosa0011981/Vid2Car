import { BookmarkEntry, BrowserSettings, TabSessionEntry } from '../types/browser';
import { DEFAULT_URL, GAME_BOOKMARK_URL, NBA_LEAGUE_PASS_URL, displayTitleForUrl } from '../utils/urlFormatter';

const STORAGE_KEYS = {
  BOOKMARKS: 'aabrowser_bookmarks_v3',
  START_PAGE_SLOTS: 'aabrowser_start_page_slots_v3',
  NBA_MIGRATED: 'aabrowser_nba_league_pass_migrated_v1',
  TABS: 'aabrowser_tabs_v3',
  ACTIVE_TAB_INDEX: 'aabrowser_active_tab_index_v3',
  SETTINGS: 'aabrowser_settings_v3',
  LAST_VISITED_URL: 'aabrowser_last_visited_url_v3',
};

export const DEFAULT_BOOKMARK_ENTRIES: BookmarkEntry[] = [
  { url: 'https://www.google.com', title: 'Google' },
  { url: 'https://youtube.com', title: 'YouTube' },
  { url: NBA_LEAGUE_PASS_URL, title: 'NBA League Pass' },
  { url: 'https://duckduckgo.com', title: 'DuckDuckGo' },
  { url: 'https://keepandroidopen.org', title: 'Keep Android Open' },
  { url: GAME_BOOKMARK_URL, title: 'Kododake Games' },
];

export const MAX_START_PAGE_SLOTS = 6;
export const MAX_OPEN_TABS = 8;

export const DEFAULT_SETTINGS: BrowserSettings = {
  themeMode: 'dark', // car preferred dark mode
  globalScalePercent: 100,
  homePageUrl: null,
  restoreTabsOnLaunch: true,
  resumeLastPageOnLaunch: false,
  alwaysShowUrlBar: false,
  quickActionButtonMode: 'menu',
  quickActionButtonAlwaysVisible: false,
  quickActionButtonPosition: 'bottom_left',
  hideSponsors: false,
  showAAAnythingPromotion: true,
  startPageBackgroundUri: null,
  userAgentProfile: 'android_chrome',
  customUserAgent: '',
  desktopMode: false,
  fullscreenMode: false,
  drmL3Enforcer: true,
  allowedCleartextHosts: [],
  allowedLocationHosts: [],
  allowedMicrophoneHosts: [],
};

export function loadSettings(): BrowserSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: BrowserSettings): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings', e);
  }
}

export function loadBookmarks(): BookmarkEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.BOOKMARKS);
    if (!raw) {
      saveBookmarks(DEFAULT_BOOKMARK_ENTRIES);
      return DEFAULT_BOOKMARK_ENTRIES;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const hasNba = parsed.some((b: BookmarkEntry) => b.url?.includes('nba.com'));
      if (!hasNba) {
        const ytIndex = parsed.findIndex((b: BookmarkEntry) => b.url?.includes('youtube.com'));
        const updated = [...parsed];
        const insertIdx = ytIndex >= 0 ? ytIndex + 1 : 2;
        updated.splice(insertIdx, 0, { url: NBA_LEAGUE_PASS_URL, title: 'NBA League Pass' });
        saveBookmarks(updated);
        return updated;
      }
      return parsed;
    }
    return DEFAULT_BOOKMARK_ENTRIES;
  } catch {
    return DEFAULT_BOOKMARK_ENTRIES;
  }
}

export function saveBookmarks(bookmarks: BookmarkEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.BOOKMARKS, JSON.stringify(bookmarks));
  } catch (e) {
    console.error('Failed to save bookmarks', e);
  }
}

export function loadStartPageSlots(): (string | null)[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.START_PAGE_SLOTS);
    const alreadyMigrated = localStorage.getItem(STORAGE_KEYS.NBA_MIGRATED) === 'true';

    if (!raw) {
      const initial: (string | null)[] = DEFAULT_BOOKMARK_ENTRIES.slice(0, MAX_START_PAGE_SLOTS).map((b) => b.url);
      while (initial.length < MAX_START_PAGE_SLOTS) initial.push(null);
      saveStartPageSlots(initial);
      localStorage.setItem(STORAGE_KEYS.NBA_MIGRATED, 'true');
      return initial;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const res: (string | null)[] = parsed.slice(0, MAX_START_PAGE_SLOTS).map((item) => (item ? String(item) : null));
      while (res.length < MAX_START_PAGE_SLOTS) res.push(null);

      // Ensure NBA League Pass is added alongside YouTube if not yet migrated
      const hasNba = res.some((u) => u && u.includes('nba.com'));
      if (!hasNba && !alreadyMigrated) {
        const ytIdx = res.findIndex((u) => u && u.includes('youtube.com'));
        const emptyIdx = res.findIndex((u) => !u);
        if (ytIdx >= 0 && ytIdx + 1 < MAX_START_PAGE_SLOTS) {
          // Shift items right from ytIdx + 1 if there is an empty slot, or place in empty slot
          if (emptyIdx >= 0) {
            res.splice(emptyIdx, 1);
            res.splice(ytIdx + 1, 0, NBA_LEAGUE_PASS_URL);
          } else {
            res[ytIdx + 1] = NBA_LEAGUE_PASS_URL;
          }
        } else if (emptyIdx >= 0) {
          res[emptyIdx] = NBA_LEAGUE_PASS_URL;
        } else {
          res[2] = NBA_LEAGUE_PASS_URL;
        }
        saveStartPageSlots(res);
      }
      localStorage.setItem(STORAGE_KEYS.NBA_MIGRATED, 'true');
      return res;
    }
  } catch (e) {
    console.error('Failed to load slots', e);
  }
  return DEFAULT_BOOKMARK_ENTRIES.slice(0, MAX_START_PAGE_SLOTS).map((b) => b.url);
}

export function saveStartPageSlots(slots: (string | null)[]): void {
  try {
    const normalized = slots.slice(0, MAX_START_PAGE_SLOTS).map((s) => (s && s.trim().length > 0 ? s.trim() : null));
    localStorage.setItem(STORAGE_KEYS.START_PAGE_SLOTS, JSON.stringify(normalized));
  } catch (e) {
    console.error('Failed to save slots', e);
  }
}

export function loadTabSession(): { tabs: TabSessionEntry[]; activeIndex: number } {
  try {
    const rawTabs = localStorage.getItem(STORAGE_KEYS.TABS);
    const rawIdx = localStorage.getItem(STORAGE_KEYS.ACTIVE_TAB_INDEX);
    const activeIndex = rawIdx ? Math.max(0, parseInt(rawIdx, 10)) : 0;

    if (!rawTabs) {
      const defaultTab: TabSessionEntry = {
        id: 'tab-1',
        url: '', // blank starts at Start Page
        title: 'Start Page',
        history: [''],
        historyIndex: 0,
        isLoading: false,
        canGoBack: false,
        canGoForward: false,
        isSecure: true,
      };
      return { tabs: [defaultTab], activeIndex: 0 };
    }

    const parsed = JSON.parse(rawTabs);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const tabs: TabSessionEntry[] = parsed.slice(0, MAX_OPEN_TABS).map((t, idx) => ({
        id: t.id || `tab-${idx + 1}`,
        url: t.url || '',
        title: t.title || (t.url ? displayTitleForUrl(t.url) : 'Start Page'),
        history: Array.isArray(t.history) && t.history.length > 0 ? t.history : [t.url || ''],
        historyIndex: typeof t.historyIndex === 'number' ? t.historyIndex : 0,
        isLoading: false,
        canGoBack: Boolean(t.history && t.historyIndex > 0),
        canGoForward: Boolean(t.history && t.historyIndex < t.history.length - 1),
        favicon: t.favicon,
        isSecure: !t.url || t.url.startsWith('https://'),
      }));
      const safeIndex = Math.min(activeIndex, tabs.length - 1);
      return { tabs, activeIndex: Math.max(0, safeIndex) };
    }
  } catch (e) {
    console.error('Failed to load tabs', e);
  }

  const defaultTab: TabSessionEntry = {
    id: 'tab-1',
    url: '',
    title: 'Start Page',
    history: [''],
    historyIndex: 0,
    isLoading: false,
    canGoBack: false,
    canGoForward: false,
    isSecure: true,
  };
  return { tabs: [defaultTab], activeIndex: 0 };
}

export function saveTabSession(tabs: TabSessionEntry[], activeIndex: number): void {
  try {
    const storable = tabs.slice(0, MAX_OPEN_TABS).map((t) => ({
      id: t.id,
      url: t.url,
      title: t.title,
      history: t.history,
      historyIndex: t.historyIndex,
      favicon: t.favicon,
    }));
    localStorage.setItem(STORAGE_KEYS.TABS, JSON.stringify(storable));
    localStorage.setItem(STORAGE_KEYS.ACTIVE_TAB_INDEX, String(activeIndex));
  } catch (e) {
    console.error('Failed to save tab session', e);
  }
}

export function getLastVisitedUrl(): string | null {
  return localStorage.getItem(STORAGE_KEYS.LAST_VISITED_URL);
}

export function setLastVisitedUrl(url: string): void {
  if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
    localStorage.setItem(STORAGE_KEYS.LAST_VISITED_URL, url);
  }
}
