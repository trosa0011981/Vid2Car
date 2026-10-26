export const DEFAULT_URL = 'https://www.google.com';
export const NBA_LEAGUE_PASS_URL = 'https://www.nba.com/games';
export const GAME_BOOKMARK_URL = 'https://kododake.com/game/';
export const GITHUB_REPO_URL = 'https://github.com/kododake/AABrowser';
export const AA_ANYTHING_RELEASE_URL = 'https://github.com/kododake/AAAnything/releases/latest';
export const BUY_ME_A_COFFEE_URL = 'https://buymeacoffee.com/kododake';
export const KEEP_ANDROID_OPEN_URL = 'https://keepandroidopen.org';

const SEARCH_TEMPLATE = 'https://www.google.com/search?q=';

export function isHttpOrHttps(url: string): boolean {
  if (!url) return false;
  const lower = url.trim().toLowerCase();
  return lower.startsWith('http://') || lower.startsWith('https://');
}

export function isNbaUrl(url: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.hostname.toLowerCase().includes('nba.com');
  } catch {
    return url.toLowerCase().includes('nba.com');
  }
}

export function toSearchUrl(query: string): string {
  return `${SEARCH_TEMPLATE}${encodeURIComponent(query.trim())}`;
}

export function formatNavigableUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (isHttpOrHttps(trimmed)) return trimmed;

  // If there's spaces or no period, treat as search query
  if (trimmed.includes(' ') || !trimmed.includes('.')) {
    return toSearchUrl(trimmed);
  }

  const candidate = `https://${trimmed}`;
  try {
    const parsed = new URL(candidate);
    if (parsed.hostname && parsed.hostname.includes('.')) {
      return candidate;
    }
    return toSearchUrl(trimmed);
  } catch {
    return toSearchUrl(trimmed);
  }
}

export function displayTitleForUrl(url: string): string {
  if (!url) return 'New Tab';
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, '');
    if (host.includes('nba.com')) return 'NBA League Pass';
    if (host.includes('google.')) return 'Google';
    if (host.includes('youtube.com')) return 'YouTube';
    if (host.includes('duckduckgo.com')) return 'DuckDuckGo';
    if (host.includes('kododake.com')) return 'Kododake Games';
    if (host.includes('keepandroidopen.org')) return 'Keep Android Open';
    if (host.includes('github.com')) return 'GitHub';
    return host || url;
  } catch {
    return url;
  }
}

export function extractHost(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export function getFaviconUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${parsed.hostname}&sz=64`;
  } catch {
    return '';
  }
}
