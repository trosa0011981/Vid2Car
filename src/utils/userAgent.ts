import { UserAgentProfile } from '../types/browser';

const CHROME_VERSION = '154.0.0.0';
const FIREFOX_VERSION = '155.0';
const SAMSUNG_VERSION = '28.0';
const SAMSUNG_CHROMIUM_VERSION = '130.0.0.0';

export const USER_AGENTS = {
  mobileChrome: `Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${CHROME_VERSION} Mobile Safari/537.36`,
  desktopChrome: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${CHROME_VERSION} Safari/537.36`,
  safariMac: `Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15`,
  safariIos: `Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1`,
  mobileFirefox: `Mozilla/5.0 (Android 10; Mobile; rv:${FIREFOX_VERSION}) Gecko/${FIREFOX_VERSION} Firefox/${FIREFOX_VERSION}`,
  desktopFirefox: `Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:${FIREFOX_VERSION}) Gecko/20100101 Firefox/${FIREFOX_VERSION}`,
  mobileEdge: `Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${CHROME_VERSION} Mobile Safari/537.36 EdgA/${CHROME_VERSION}`,
  desktopEdge: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${CHROME_VERSION} Safari/537.36 Edg/${CHROME_VERSION}`,
  mobileSamsung: `Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/${SAMSUNG_VERSION} Chrome/${SAMSUNG_CHROMIUM_VERSION} Mobile Safari/537.36`,
};

export function resolveUserAgent(
  profile: UserAgentProfile,
  desktop: boolean,
  customUa?: string
): string {
  switch (profile) {
    case 'android_chrome':
      return desktop ? USER_AGENTS.desktopChrome : USER_AGENTS.mobileChrome;
    case 'safari':
      return desktop ? USER_AGENTS.safariMac : USER_AGENTS.safariIos;
    case 'firefox':
      return desktop ? USER_AGENTS.desktopFirefox : USER_AGENTS.mobileFirefox;
    case 'edge':
      return desktop ? USER_AGENTS.desktopEdge : USER_AGENTS.mobileEdge;
    case 'samsung_internet':
      return desktop ? USER_AGENTS.desktopChrome : USER_AGENTS.mobileSamsung;
    case 'custom':
      if (customUa && customUa.trim()) {
        return customUa.trim();
      }
      return desktop ? USER_AGENTS.desktopChrome : USER_AGENTS.mobileChrome;
  }
}
