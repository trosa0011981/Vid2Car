import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  loadSettings,
  saveSettings,
  loadBookmarks,
  saveBookmarks,
  loadStartPageSlots,
  saveStartPageSlots,
  loadTabSession,
  saveTabSession,
  getLastVisitedUrl,
  setLastVisitedUrl,
  DEFAULT_SETTINGS,
  MAX_OPEN_TABS,
} from './services/storage';
import {
  BookmarkEntry,
  BrowserSettings,
  TabSessionEntry,
} from './types/browser';
import {
  formatNavigableUrl,
  displayTitleForUrl,
  extractHost,
  GITHUB_REPO_URL,
} from './utils/urlFormatter';
import { resolveUserAgent } from './utils/userAgent';
import { CarFrameToolbar } from './components/car/CarFrameToolbar';
import { AddressBar } from './components/browser/AddressBar';
import { WavyProgressBar } from './components/browser/WavyProgressBar';
import { FloatingActionButton } from './components/browser/FloatingActionButton';
import { WebView } from './components/browser/WebView';
import { StartPage } from './components/startpage/StartPage';
import { MenuSheet } from './components/sheets/MenuSheet';
import { TabsSheet } from './components/sheets/TabsSheet';
import { BookmarksSheet } from './components/sheets/BookmarksSheet';
import { QrShareSheet } from './components/sheets/QrShareSheet';
import { VersionCheckSheet } from './components/sheets/VersionCheckSheet';
import { SettingsSheet } from './components/sheets/SettingsSheet';
import { InsecureHttpDialog } from './components/dialogs/InsecureHttpDialog';
import { PermissionDialog, PermissionType } from './components/dialogs/PermissionDialog';

export const App: React.FC = () => {
  // Settings & Storage State
  const [settings, setSettings] = useState<BrowserSettings>(() => loadSettings());
  const [bookmarks, setBookmarks] = useState<BookmarkEntry[]>(() => loadBookmarks());
  const [startPageSlots, setStartPageSlots] = useState<(string | null)[]>(() => loadStartPageSlots());

  // Tab Session State
  const [tabs, setTabs] = useState<TabSessionEntry[]>(() => {
    const loaded = loadTabSession();
    return loaded.tabs;
  });
  const [activeTabIndex, setActiveTabIndex] = useState<number>(() => {
    const loaded = loadTabSession();
    return loaded.activeIndex;
  });

  // Last interaction timestamp (for FAB auto-hide timer)
  const [lastInteractionTime, setLastInteractionTime] = useState<number>(Date.now());
  const [isLoadingPage, setIsLoadingPage] = useState<boolean>(false);
  const [isCarBezelMode, setIsCarBezelMode] = useState<boolean>(false);

  // Sheets & Dialog Modals
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isTabsOpen, setIsTabsOpen] = useState(false);
  const [isBookmarksOpen, setIsBookmarksOpen] = useState(false);
  const [isQrShareOpen, setIsQrShareOpen] = useState(false);
  const [isVersionCheckOpen, setIsVersionCheckOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAddressBarFocused, setIsAddressBarFocused] = useState(false);

  // Security & Permission Prompts
  const [pendingInsecureUrl, setPendingInsecureUrl] = useState<string | null>(null);
  const [pendingPermission, setPendingPermission] = useState<{
    type: PermissionType;
    url: string;
  } | null>(null);

  // Current active tab
  const activeTab = useMemo(() => {
    return tabs[activeTabIndex] || tabs[0] || {
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
  }, [tabs, activeTabIndex]);

  const isStartPage = !activeTab.url;
  const lastVisitedUrl = getLastVisitedUrl();

  // Save settings when modified
  const updateSettings = useCallback((newSettings: Partial<BrowserSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      saveSettings(updated);
      return updated;
    });
  }, []);

  // Save tabs on state change
  useEffect(() => {
    saveTabSession(tabs, activeTabIndex);
  }, [tabs, activeTabIndex]);

  // Sync theme to root class
  useEffect(() => {
    const root = document.documentElement;
    if (settings.themeMode === 'light') {
      root.classList.remove('dark');
      root.classList.add('light');
    } else {
      root.classList.remove('light');
      root.classList.add('dark');
    }
  }, [settings.themeMode]);

  // Auto-resume last visited page if setting enabled and on clean launch
  useEffect(() => {
    if (settings.resumeLastPageOnLaunch && lastVisitedUrl && isStartPage && !settings.homePageUrl) {
      handleNavigate(lastVisitedUrl);
    }
  }, []);

  // Record user interaction (for FAB auto-hide), throttled and skipped while typing in inputs
  const registerInteraction = useCallback(() => {
    const activeEl = document.activeElement;
    if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
      return;
    }
    const now = Date.now();
    setLastInteractionTime((prev) => (now - prev > 3000 ? now : prev));
  }, []);

  // Navigation logic
  const handleNavigate = useCallback(
    (targetUrl: string) => {
      const formatted = formatNavigableUrl(targetUrl);
      if (!formatted) return;

      // Insecure HTTP check
      if (formatted.toLowerCase().startsWith('http://')) {
        const host = extractHost(formatted);
        if (!settings.allowedCleartextHosts.includes(host)) {
          setPendingInsecureUrl(formatted);
          return;
        }
      }

      setLastVisitedUrl(formatted);
      registerInteraction();

      setTabs((prevTabs) => {
        const nextTabs = [...prevTabs];
        const current = nextTabs[activeTabIndex] || {
          id: `tab-${Date.now()}`,
          url: '',
          title: 'Start Page',
          history: [''],
          historyIndex: 0,
          isLoading: false,
          canGoBack: false,
          canGoForward: false,
        };

        const newHistory = current.history.slice(0, current.historyIndex + 1);
        newHistory.push(formatted);

        nextTabs[activeTabIndex] = {
          ...current,
          url: formatted,
          title: displayTitleForUrl(formatted),
          history: newHistory,
          historyIndex: newHistory.length - 1,
          canGoBack: true,
          canGoForward: false,
          isSecure: formatted.startsWith('https://'),
        };
        return nextTabs;
      });
    },
    [activeTabIndex, settings.allowedCleartextHosts, registerInteraction]
  );

  const handleBack = useCallback(() => {
    registerInteraction();
    setTabs((prevTabs) => {
      const nextTabs = [...prevTabs];
      const current = nextTabs[activeTabIndex];
      if (!current || current.historyIndex <= 0) return prevTabs;

      const newIndex = current.historyIndex - 1;
      const targetUrl = current.history[newIndex];

      nextTabs[activeTabIndex] = {
        ...current,
        url: targetUrl,
        title: targetUrl ? displayTitleForUrl(targetUrl) : 'Start Page',
        historyIndex: newIndex,
        canGoBack: newIndex > 0,
        canGoForward: true,
        isSecure: !targetUrl || targetUrl.startsWith('https://'),
      };
      return nextTabs;
    });
  }, [activeTabIndex, registerInteraction]);

  const handleForward = useCallback(() => {
    registerInteraction();
    setTabs((prevTabs) => {
      const nextTabs = [...prevTabs];
      const current = nextTabs[activeTabIndex];
      if (!current || current.historyIndex >= current.history.length - 1) return prevTabs;

      const newIndex = current.historyIndex + 1;
      const targetUrl = current.history[newIndex];

      nextTabs[activeTabIndex] = {
        ...current,
        url: targetUrl,
        title: targetUrl ? displayTitleForUrl(targetUrl) : 'Start Page',
        historyIndex: newIndex,
        canGoBack: true,
        canGoForward: newIndex < current.history.length - 1,
        isSecure: !targetUrl || targetUrl.startsWith('https://'),
      };
      return nextTabs;
    });
  }, [activeTabIndex, registerInteraction]);

  const handleReload = useCallback(() => {
    registerInteraction();
    setIsLoadingPage(true);
    setTimeout(() => setIsLoadingPage(false), 800);
  }, [registerInteraction]);

  const handleHome = useCallback(() => {
    registerInteraction();
    if (settings.homePageUrl) {
      handleNavigate(settings.homePageUrl);
    } else {
      // Go to start page
      setTabs((prevTabs) => {
        const nextTabs = [...prevTabs];
        const current = nextTabs[activeTabIndex];
        if (!current) return prevTabs;

        const newHistory = current.history.slice(0, current.historyIndex + 1);
        newHistory.push('');

        nextTabs[activeTabIndex] = {
          ...current,
          url: '',
          title: 'Start Page',
          history: newHistory,
          historyIndex: newHistory.length - 1,
          canGoBack: true,
          canGoForward: false,
          isSecure: true,
        };
        return nextTabs;
      });
    }
  }, [activeTabIndex, settings.homePageUrl, handleNavigate, registerInteraction]);

  // Tab management
  const handleNewTab = useCallback((initialUrl = '') => {
    if (tabs.length >= MAX_OPEN_TABS) return;
    const newId = `tab-${Date.now()}`;
    const newTab: TabSessionEntry = {
      id: newId,
      url: initialUrl,
      title: initialUrl ? displayTitleForUrl(initialUrl) : 'Start Page',
      history: [initialUrl],
      historyIndex: 0,
      isLoading: false,
      canGoBack: false,
      canGoForward: false,
      isSecure: true,
    };
    setTabs((prev) => [...prev, newTab]);
    setActiveTabIndex(tabs.length);
  }, [tabs.length]);

  const handleCloseTab = useCallback((indexToClose: number) => {
    setTabs((prev) => {
      if (prev.length <= 1) {
        // Reset the single tab to start page
        return [
          {
            id: 'tab-1',
            url: '',
            title: 'Start Page',
            history: [''],
            historyIndex: 0,
            isLoading: false,
            canGoBack: false,
            canGoForward: false,
            isSecure: true,
          },
        ];
      }
      return prev.filter((_, idx) => idx !== indexToClose);
    });

    setActiveTabIndex((prevIdx) => {
      if (prevIdx >= indexToClose && prevIdx > 0) {
        return prevIdx - 1;
      }
      return prevIdx;
    });
  }, []);

  const handleMoveTab = useCallback((from: number, to: number) => {
    setTabs((prev) => {
      const copy = [...prev];
      const [item] = copy.splice(from, 1);
      copy.splice(to, 0, item);
      return copy;
    });
    setActiveTabIndex(to);
  }, []);

  // Bookmarks management
  const handleToggleBookmark = useCallback(() => {
    if (!activeTab.url) return;
    const isBookmarked = bookmarks.some((b) => b.url === activeTab.url);
    if (isBookmarked) {
      setBookmarks((prev) => {
        const next = prev.filter((b) => b.url !== activeTab.url);
        saveBookmarks(next);
        return next;
      });
    } else {
      const newEntry: BookmarkEntry = {
        url: activeTab.url,
        title: activeTab.title || displayTitleForUrl(activeTab.url),
      };
      setBookmarks((prev) => {
        const next = [newEntry, ...prev];
        saveBookmarks(next);
        return next;
      });
    }
  }, [activeTab.url, activeTab.title, bookmarks]);

  const handleAddBookmark = useCallback((url: string, title: string) => {
    setBookmarks((prev) => {
      if (prev.some((b) => b.url === url)) return prev;
      const next = [{ url, title: title || displayTitleForUrl(url) }, ...prev];
      saveBookmarks(next);
      return next;
    });
  }, []);

  const handleUpdateBookmarkTitle = useCallback((url: string, newTitle: string) => {
    setBookmarks((prev) => {
      const next = prev.map((b) => (b.url === url ? { ...b, title: newTitle } : b));
      saveBookmarks(next);
      return next;
    });
  }, []);

  const handleDeleteBookmark = useCallback((url: string) => {
    setBookmarks((prev) => {
      const next = prev.filter((b) => b.url !== url);
      saveBookmarks(next);
      return next;
    });
  }, []);

  // Start page slots management
  const handleUpdateSlot = useCallback((index: number, url: string | null) => {
    setStartPageSlots((prev) => {
      const copy = [...prev];
      copy[index] = url;
      saveStartPageSlots(copy);
      return copy;
    });
  }, []);

  const handleMoveSlot = useCallback((from: number, to: number) => {
    setStartPageSlots((prev) => {
      const copy = [...prev];
      const temp = copy[from];
      copy[from] = copy[to];
      copy[to] = temp;
      saveStartPageSlots(copy);
      return copy;
    });
  }, []);

  const handlePinBookmarkToSlot = useCallback((url: string, slotIndex: number) => {
    handleUpdateSlot(slotIndex, url);
  }, [handleUpdateSlot]);

  // Privacy reset handlers
  const handleClearSitePermissions = useCallback(() => {
    updateSettings({
      allowedLocationHosts: [],
      allowedMicrophoneHosts: [],
    });
  }, [updateSettings]);

  const handleClearCookiesAndData = useCallback(() => {
    try {
      sessionStorage.clear();
      // Keep primary bookmarks and settings, clean transient caches
    } catch (e) {
      console.error(e);
    }
  }, []);

  const handleClearAllowedHttpHosts = useCallback(() => {
    updateSettings({
      allowedCleartextHosts: [],
    });
  }, [updateSettings]);

  // Floating Action Button click handler
  const handleFabClick = () => {
    if (settings.quickActionButtonMode === 'address_bar') {
      setIsAddressBarFocused(true);
      // If address bar is hidden, toggle showing it
      if (!settings.alwaysShowUrlBar) {
        updateSettings({ alwaysShowUrlBar: true });
      }
    } else {
      setIsMenuOpen(true);
    }
  };

  const isCurrentBookmarked = Boolean(
    activeTab.url && bookmarks.some((b) => b.url === activeTab.url)
  );

  const resolvedUA = resolveUserAgent(
    settings.userAgentProfile,
    settings.desktopMode,
    settings.customUserAgent
  );

  return (
    <div
      className={`w-screen h-screen flex flex-col bg-black text-white overflow-hidden ${
        settings.fullscreenMode ? 'fullscreen' : ''
      }`}
      onMouseMove={registerInteraction}
      onTouchStart={registerInteraction}
    >
      {/* Car Frame Simulation Toolbar */}
      <CarFrameToolbar
        isCarBezelMode={isCarBezelMode}
        onToggleCarBezel={() => setIsCarBezelMode((prev) => !prev)}
        scalePercent={settings.globalScalePercent}
      />

      {/* Main Automotive Head Unit Container */}
      <div
        className={`flex-1 flex flex-col relative overflow-hidden transition-all duration-300 ${
          isCarBezelMode
            ? 'max-w-5xl w-full mx-auto my-3 rounded-[36px] border-[12px] border-neutral-900 shadow-[0_0_50px_rgba(0,0,0,0.9)] overflow-hidden ring-1 ring-neutral-700/60'
            : 'w-full'
        }`}
      >
        {/* Optional Always-Show Top Address Bar */}
        {(settings.alwaysShowUrlBar || !isStartPage) && (
          <AddressBar
            url={activeTab.url}
            isSecure={activeTab.isSecure}
            canGoBack={activeTab.canGoBack}
            canGoForward={activeTab.canGoForward}
            tabCount={tabs.length}
            isBookmarked={isCurrentBookmarked}
            onNavigate={handleNavigate}
            onBack={handleBack}
            onForward={handleForward}
            onReload={handleReload}
            onHome={handleHome}
            onToggleBookmark={handleToggleBookmark}
            onOpenTabs={() => setIsTabsOpen(true)}
            onOpenMenu={() => setIsMenuOpen(true)}
            onSecurityClick={() => {
              if (!activeTab.isSecure && activeTab.url) {
                setPendingInsecureUrl(activeTab.url);
              }
            }}
            autoFocus={isAddressBarFocused}
          />
        )}

        {/* Wavy loading progress bar */}
        <WavyProgressBar isLoading={isLoadingPage} progress={75} />

        {/* Viewport Content Area: StartPage or WebView */}
        <div className="flex-1 relative overflow-hidden">
          {isStartPage ? (
            <StartPage
              slots={startPageSlots}
              bookmarks={bookmarks}
              hasResumePage={Boolean(lastVisitedUrl)}
              lastVisitedUrl={lastVisitedUrl}
              customBackgroundUri={settings.startPageBackgroundUri}
              hideSponsors={settings.hideSponsors}
              showAAAnythingPromotion={settings.showAAAnythingPromotion}
              onNavigate={handleNavigate}
              onResumeLastPage={() => {
                if (lastVisitedUrl) handleNavigate(lastVisitedUrl);
              }}
              onUpdateSlot={handleUpdateSlot}
              onMoveSlot={handleMoveSlot}
              onDismissAAAnything={() => updateSettings({ showAAAnythingPromotion: false })}
            />
          ) : (
            <WebView
              url={activeTab.url}
              title={activeTab.title}
              desktopMode={settings.desktopMode}
              scalePercent={settings.globalScalePercent}
              drmL3Enforcer={settings.drmL3Enforcer}
              userAgent={resolvedUA}
              onNavigate={handleNavigate}
              onTitleLoaded={(newTitle) => {
                setTabs((prev) => {
                  const copy = [...prev];
                  if (copy[activeTabIndex]) {
                    copy[activeTabIndex] = { ...copy[activeTabIndex], title: newTitle };
                  }
                  return copy;
                });
              }}
              onLoadingChange={setIsLoadingPage}
              onInteraction={registerInteraction}
            />
          )}

          {/* Floating Action Button (FAB) */}
          <FloatingActionButton
            mode={settings.quickActionButtonMode}
            position={settings.quickActionButtonPosition}
            alwaysVisible={settings.quickActionButtonAlwaysVisible}
            isStartPage={isStartPage}
            isInFullscreen={settings.fullscreenMode}
            onClick={handleFabClick}
            lastInteractionTime={lastInteractionTime}
          />
        </div>
      </div>

      {/* Sheets & Bottom Modals */}
      <MenuSheet
        isOpen={isMenuOpen}
        pageTitle={activeTab.title}
        currentUrl={activeTab.url}
        canGoBack={activeTab.canGoBack}
        canGoForward={activeTab.canGoForward}
        isDesktopMode={settings.desktopMode}
        isFullscreenMode={settings.fullscreenMode}
        tabCount={tabs.length}
        bookmarkCount={bookmarks.length}
        versionName="3.3"
        onClose={() => setIsMenuOpen(false)}
        onNavigate={handleNavigate}
        onBack={handleBack}
        onForward={handleForward}
        onReload={handleReload}
        onHome={handleHome}
        onOpenBookmarks={() => setIsBookmarksOpen(true)}
        onOpenQrShare={() => setIsQrShareOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenTabs={() => setIsTabsOpen(true)}
        onNewTab={() => handleNewTab('')}
        onToggleDesktop={() => updateSettings({ desktopMode: !settings.desktopMode })}
        onToggleFullscreen={() => updateSettings({ fullscreenMode: !settings.fullscreenMode })}
        onCheckUpdates={() => setIsVersionCheckOpen(true)}
        onOpenGitHub={() => window.open(GITHUB_REPO_URL, '_blank')}
      />

      <TabsSheet
        isOpen={isTabsOpen}
        tabs={tabs}
        activeTabIndex={activeTabIndex}
        onClose={() => setIsTabsOpen(false)}
        onSelectTab={setActiveTabIndex}
        onCloseTab={handleCloseTab}
        onNewTab={() => handleNewTab('')}
        onMoveTab={handleMoveTab}
      />

      <BookmarksSheet
        isOpen={isBookmarksOpen}
        bookmarks={bookmarks}
        currentUrl={activeTab.url}
        currentPageTitle={activeTab.title}
        startPageSlots={startPageSlots}
        onClose={() => setIsBookmarksOpen(false)}
        onSelectBookmark={handleNavigate}
        onAddBookmark={handleAddBookmark}
        onUpdateBookmarkTitle={handleUpdateBookmarkTitle}
        onDeleteBookmark={handleDeleteBookmark}
        onPinToSlot={handlePinBookmarkToSlot}
      />

      <QrShareSheet
        isOpen={isQrShareOpen}
        url={activeTab.url || GITHUB_REPO_URL}
        onClose={() => setIsQrShareOpen(false)}
      />

      <VersionCheckSheet
        isOpen={isVersionCheckOpen}
        installedVersion="3.3"
        onClose={() => setIsVersionCheckOpen(false)}
      />

      <SettingsSheet
        isOpen={isSettingsOpen}
        settings={settings}
        slotCount={startPageSlots.filter(Boolean).length}
        currentUrl={activeTab.url}
        onClose={() => setIsSettingsOpen(false)}
        onUpdateSettings={updateSettings}
        onClearSitePermissions={handleClearSitePermissions}
        onClearCookiesAndData={handleClearCookiesAndData}
        onClearAllowedHttpHosts={handleClearAllowedHttpHosts}
      />

      {/* Security Warning Dialog */}
      {pendingInsecureUrl && (
        <InsecureHttpDialog
          isOpen={true}
          url={pendingInsecureUrl}
          onAllowOnce={() => {
            const url = pendingInsecureUrl;
            setPendingInsecureUrl(null);
            setTabs((prev) => {
              const copy = [...prev];
              copy[activeTabIndex] = {
                ...copy[activeTabIndex],
                url,
                title: displayTitleForUrl(url),
                isSecure: false,
              };
              return copy;
            });
          }}
          onAllowHost={(host) => {
            updateSettings({
              allowedCleartextHosts: [...settings.allowedCleartextHosts, host],
            });
            const url = pendingInsecureUrl;
            setPendingInsecureUrl(null);
            setTabs((prev) => {
              const copy = [...prev];
              copy[activeTabIndex] = {
                ...copy[activeTabIndex],
                url,
                title: displayTitleForUrl(url),
                isSecure: false,
              };
              return copy;
            });
          }}
          onCancel={() => setPendingInsecureUrl(null)}
        />
      )}

      {/* Permission Request Dialog */}
      {pendingPermission && (
        <PermissionDialog
          isOpen={true}
          type={pendingPermission.type}
          url={pendingPermission.url}
          onAllowOnce={() => setPendingPermission(null)}
          onAllowHost={(host) => {
            if (pendingPermission.type === 'microphone') {
              updateSettings({
                allowedMicrophoneHosts: [...settings.allowedMicrophoneHosts, host],
              });
            } else {
              updateSettings({
                allowedLocationHosts: [...settings.allowedLocationHosts, host],
              });
            }
            setPendingPermission(null);
          }}
          onDeny={() => setPendingPermission(null)}
        />
      )}
    </div>
  );
};

export default App;
