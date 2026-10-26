import { NbaGame, NbaStreamFeed, NbaTeamInfo, NbaUserSession } from '../types/nba';
import { logDiagnosticEvent } from './diagnosticsService';

const NBA_SESSION_KEY = 'aabrowser_nba_session_v1';
const NBA_HIDE_SCORES_KEY = 'aabrowser_nba_hide_scores_v1';

interface AndroidBridgeInterface {
  openNbaTopLevel?: (targetUrl: string) => void;
  returnToNbaWrapper?: () => void;
  getNbaCookieStatus?: () => string;
  promptNativeTextInput?: (
    fieldId: string,
    title: string,
    currentValue: string,
    isPassword: boolean
  ) => void;
}

declare global {
  interface Window {
    AndroidBridge?: AndroidBridgeInterface;
    __onNativeInputResult?: (fieldId: string, value: string) => void;
  }
}

export function hasNativeAndroidBridge(): boolean {
  return typeof window !== 'undefined' && Boolean(window.AndroidBridge);
}

/**
 * Opens an official NBA.com URL (such as https://www.nba.com/account/sign-in or a live game page)
 * as the top-level document inside MainActivity's native WebView.
 * This completely avoids X-Frame-Options / CSP frame-ancestors blocking (which causes the broken
 * green Android WebView icon inside <iframe> elements) while keeping navigation 100% inside AA Browser
 * with a native top bar to return to the Car Wrapper.
 */
export function openNbaTopLevelInApp(targetUrl: string): boolean {
  logDiagnosticEvent('NBA_TOP_LEVEL_NAV', `Requested top-level NBA page: ${targetUrl}`);
  if (typeof window !== 'undefined' && window.AndroidBridge?.openNbaTopLevel) {
    window.AndroidBridge.openNbaTopLevel(targetUrl);
    return true;
  }
  return false;
}

export function promptNativeAndroidInput(
  fieldId: string,
  title: string,
  currentValue: string,
  isPassword: boolean,
  onResult: (val: string) => void
): boolean {
  if (typeof window !== 'undefined' && window.AndroidBridge?.promptNativeTextInput) {
    window.__onNativeInputResult = (returnedFieldId: string, value: string) => {
      if (returnedFieldId === fieldId) {
        onResult(value);
      }
    };
    window.AndroidBridge.promptNativeTextInput(fieldId, title, currentValue, isPassword);
    return true;
  }
  return false;
}

export function loadNbaSession(): NbaUserSession {
  try {
    const raw = localStorage.getItem(NBA_SESSION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.isSignedIn) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load NBA session', e);
  }
  return {
    isSignedIn: false,
    email: '',
    displayName: 'Guest',
    subscriptionTier: 'NBA ID Guest',
  };
}

export function saveNbaSession(session: NbaUserSession): void {
  try {
    localStorage.setItem(NBA_SESSION_KEY, JSON.stringify(session));
  } catch (e) {
    console.error('Failed to save NBA session', e);
  }
}

export function loadHideScoresPref(): boolean {
  try {
    const raw = localStorage.getItem(NBA_HIDE_SCORES_KEY);
    if (raw !== null) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return false;
}

export function saveHideScoresPref(hide: boolean): void {
  try {
    localStorage.setItem(NBA_HIDE_SCORES_KEY, JSON.stringify(hide));
  } catch {
    // ignore
  }
}

export function getOfficialTeamLogoUrl(teamId: number): string {
  return `https://cdn.nba.com/logos/nba/${teamId}/global/L/logo.svg`;
}

export function getNbaTeamLogoUrl(teamId: number): string {
  return getOfficialTeamLogoUrl(teamId);
}

function buildGameStreams(
  gameId: string,
  awayTricode: string,
  awayName: string,
  homeTricode: string,
  homeName: string,
  awayBroadcaster: string,
  homeBroadcaster: string
): NbaStreamFeed[] {
  const slug = `${awayTricode.toLowerCase()}-vs-${homeTricode.toLowerCase()}-${gameId}`;
  return [
    {
      id: 'home',
      label: `${homeName} (Home Stream)`,
      sublabel: 'Primary Arena Commentary & Local Graphics',
      broadcaster: homeBroadcaster,
      language: 'English',
      resolution: '1080p60 · Widevine L3',
      isCameraZoomed: false,
      inAppWatchPath: `https://www.nba.com/game/${slug}?watch=true&stream=home`,
    },
    {
      id: 'away',
      label: `${awayName} (Away Stream)`,
      sublabel: 'Visiting Team Broadcast & Road Analysis',
      broadcaster: awayBroadcaster,
      language: 'English',
      resolution: '1080p60 · Widevine L3',
      isCameraZoomed: false,
      inAppWatchPath: `https://www.nba.com/game/${slug}?watch=true&stream=away`,
    },
    {
      id: 'mobile',
      label: 'Mobile View (Zoomed Camera)',
      sublabel: 'Tighter On-Ball Tracking for Dashboards & Screens',
      broadcaster: 'NBA League Pass Mobile Cam',
      language: 'English / Natural Sound',
      resolution: '1080p60 · 1.35x Courtside Zoom',
      isCameraZoomed: true,
      inAppWatchPath: `https://www.nba.com/game/${slug}?watch=true&stream=mobile`,
    },
    {
      id: 'recap',
      label: '10-Min Condensed Recap',
      sublabel: 'Every Key Possession & Clutch Basket',
      broadcaster: 'NBA TV Rapid Replay',
      language: 'English',
      resolution: '1080p60 · Instant Play',
      durationLabel: '10:24',
      isCameraZoomed: false,
      inAppWatchPath: `https://www.nba.com/game/${slug}?watch=true&stream=recap`,
    },
  ];
}

/**
 * Distinct curated NBA game schedules for every single date in the 7-day strip (and beyond).
 * Changing dates immediately updates the matchups, teams, scores, statuses, and stat leaders.
 */
const CURATED_GAMES_BY_DATE: Record<string, NbaGame[]> = {
  '2026-10-25': [
    {
      gameId: '0022600068',
      gameCode: '20261025/UTALAL',
      dateKey: '2026-10-25',
      gameStatus: 3,
      gameStatusText: 'FINAL',
      nationalBroadcaster: 'NBA League Pass',
      arena: 'Crypto.com Arena · Los Angeles, CA',
      isLeaguePass: true,
      awayTeam: {
        teamId: 1610612762,
        tricode: 'UTA',
        city: 'Utah',
        name: 'Jazz',
        record: '22-60',
        score: 127,
        quarterScores: [31, 29, 34, 33],
        primaryColor: '#002B5C',
        secondaryColor: '#F9A01B',
        leader: {
          playerId: '1641718',
          name: 'Keyonte George',
          jerseyNumber: '3',
          position: 'G',
          teamTricode: 'UTA',
          points: 34,
          rebounds: 4,
          assists: 8,
        },
      },
      homeTeam: {
        teamId: 1610612747,
        tricode: 'LAL',
        city: 'Los Angeles',
        name: 'Lakers',
        record: '53-29',
        score: 134,
        quarterScores: [35, 33, 30, 36],
        primaryColor: '#552583',
        secondaryColor: '#FDB927',
        leader: {
          playerId: '2544',
          name: 'LeBron James',
          jerseyNumber: '23',
          position: 'F',
          teamTricode: 'LAL',
          points: 25,
          rebounds: 6,
          assists: 10,
        },
      },
      streams: buildGameStreams(
        '0022600068',
        'UTA',
        'Jazz',
        'LAL',
        'Lakers',
        'KJZZ / Jazz+',
        'Spectrum SportsNet'
      ),
    },
    {
      gameId: '0022600069',
      gameCode: '20261025/BKNIND',
      dateKey: '2026-10-25',
      gameStatus: 3,
      gameStatusText: 'FINAL',
      nationalBroadcaster: 'NBA League Pass',
      arena: 'Gainbridge Fieldhouse · Indianapolis, IN',
      isLeaguePass: true,
      awayTeam: {
        teamId: 1610612751,
        tricode: 'BKN',
        city: 'Brooklyn',
        name: 'Nets',
        record: '20-62',
        score: 126,
        quarterScores: [28, 34, 31, 33],
        primaryColor: '#1D1D1B',
        secondaryColor: '#FFFFFF',
        leader: {
          playerId: '1630560',
          name: 'Cam Thomas',
          jerseyNumber: '24',
          position: 'G',
          teamTricode: 'BKN',
          points: 31,
          rebounds: 5,
          assists: 4,
        },
      },
      homeTeam: {
        teamId: 1610612754,
        tricode: 'IND',
        city: 'Indiana',
        name: 'Pacers',
        record: '47-35',
        score: 112,
        quarterScores: [27, 29, 26, 30],
        primaryColor: '#002D62',
        secondaryColor: '#FDBB30',
        leader: {
          playerId: '1630169',
          name: 'Tyrese Haliburton',
          jerseyNumber: '0',
          position: 'G',
          teamTricode: 'IND',
          points: 24,
          rebounds: 4,
          assists: 12,
        },
      },
      streams: buildGameStreams(
        '0022600069',
        'BKN',
        'Nets',
        'IND',
        'Pacers',
        'YES Network',
        'FanDuel Sports Indiana'
      ),
    },
    {
      gameId: '0022600070',
      gameCode: '20261025/OKCLAC',
      dateKey: '2026-10-25',
      gameStatus: 3,
      gameStatusText: 'FINAL',
      nationalBroadcaster: 'NBA TV',
      arena: 'Intuit Dome · Inglewood, CA',
      isLeaguePass: true,
      awayTeam: {
        teamId: 1610612760,
        tricode: 'OKC',
        city: 'Oklahoma City',
        name: 'Thunder',
        record: '64-18',
        score: 123,
        quarterScores: [30, 32, 33, 28],
        primaryColor: '#007AC1',
        secondaryColor: '#EF3B24',
        leader: {
          playerId: '1628983',
          name: 'Shai Gilgeous-Alexander',
          jerseyNumber: '2',
          position: 'G',
          teamTricode: 'OKC',
          points: 33,
          rebounds: 7,
          assists: 8,
        },
      },
      homeTeam: {
        teamId: 1610612746,
        tricode: 'LAC',
        city: 'LA',
        name: 'Clippers',
        record: '42-40',
        score: 103,
        quarterScores: [25, 27, 24, 27],
        primaryColor: '#C8102E',
        secondaryColor: '#1D428A',
        leader: {
          playerId: '201935',
          name: 'James Harden',
          jerseyNumber: '1',
          position: 'G',
          teamTricode: 'LAC',
          points: 22,
          rebounds: 6,
          assists: 9,
        },
      },
      streams: buildGameStreams(
        '0022600070',
        'OKC',
        'Thunder',
        'LAC',
        'Clippers',
        'FanDuel Sports OK',
        'ClipperVision / KTLA'
      ),
    },
    {
      gameId: '0022600071',
      gameCode: '20261025/BOSNYK',
      dateKey: '2026-10-25',
      gameStatus: 3,
      gameStatusText: 'FINAL',
      nationalBroadcaster: 'ESPN',
      arena: 'Madison Square Garden · New York, NY',
      isLeaguePass: true,
      awayTeam: {
        teamId: 1610612738,
        tricode: 'BOS',
        city: 'Boston',
        name: 'Celtics',
        record: '56-26',
        score: 118,
        quarterScores: [32, 28, 31, 27],
        primaryColor: '#007A33',
        secondaryColor: '#BA9653',
        leader: {
          playerId: '1628369',
          name: 'Jayson Tatum',
          jerseyNumber: '0',
          position: 'F',
          teamTricode: 'BOS',
          points: 32,
          rebounds: 9,
          assists: 6,
        },
      },
      homeTeam: {
        teamId: 1610612752,
        tricode: 'NYK',
        city: 'New York',
        name: 'Knicks',
        record: '53-29',
        score: 114,
        quarterScores: [29, 30, 27, 28],
        primaryColor: '#006BB6',
        secondaryColor: '#F58426',
        leader: {
          playerId: '1628973',
          name: 'Jalen Brunson',
          jerseyNumber: '11',
          position: 'G',
          teamTricode: 'NYK',
          points: 35,
          rebounds: 3,
          assists: 8,
        },
      },
      streams: buildGameStreams(
        '0022600071',
        'BOS',
        'Celtics',
        'NYK',
        'Knicks',
        'NBC Sports Boston',
        'MSG Network'
      ),
    },
  ],

  '2026-10-26': [
    {
      gameId: '0022600081',
      gameCode: '20261026/GSWDEN',
      dateKey: '2026-10-26',
      gameStatus: 2,
      gameStatusText: 'Q4 02:14 · LIVE',
      period: 4,
      gameClock: '02:14',
      nationalBroadcaster: 'TNT / League Pass',
      arena: 'Ball Arena · Denver, CO',
      isLeaguePass: true,
      awayTeam: {
        teamId: 1610612744,
        tricode: 'GSW',
        city: 'Golden State',
        name: 'Warriors',
        record: '48-34',
        score: 115,
        quarterScores: [29, 31, 30, 25],
        primaryColor: '#1D428A',
        secondaryColor: '#FFC72C',
        leader: {
          playerId: '201939',
          name: 'Stephen Curry',
          jerseyNumber: '30',
          position: 'G',
          teamTricode: 'GSW',
          points: 36,
          rebounds: 5,
          assists: 7,
        },
      },
      homeTeam: {
        teamId: 1610612743,
        tricode: 'DEN',
        city: 'Denver',
        name: 'Nuggets',
        record: '55-27',
        score: 117,
        quarterScores: [31, 28, 33, 25],
        primaryColor: '#0E2240',
        secondaryColor: '#FEC524',
        leader: {
          playerId: '203999',
          name: 'Nikola Jokic',
          jerseyNumber: '15',
          position: 'C',
          teamTricode: 'DEN',
          points: 29,
          rebounds: 14,
          assists: 11,
        },
      },
      streams: buildGameStreams(
        '0022600081',
        'GSW',
        'Warriors',
        'DEN',
        'Nuggets',
        'NBC Sports Bay Area',
        'Altitude Sports'
      ),
    },
    {
      gameId: '0022600082',
      gameCode: '20261026/DALPHX',
      dateKey: '2026-10-26',
      gameStatus: 2,
      gameStatusText: 'Q3 06:48 · LIVE',
      period: 3,
      gameClock: '06:48',
      nationalBroadcaster: 'NBA League Pass',
      arena: 'Footprint Center · Phoenix, AZ',
      isLeaguePass: true,
      awayTeam: {
        teamId: 1610612742,
        tricode: 'DAL',
        city: 'Dallas',
        name: 'Mavericks',
        record: '50-32',
        score: 88,
        quarterScores: [32, 29, 27, 0],
        primaryColor: '#00538C',
        secondaryColor: '#002B5E',
        leader: {
          playerId: '202681',
          name: 'Kyrie Irving',
          jerseyNumber: '11',
          position: 'G',
          teamTricode: 'DAL',
          points: 27,
          rebounds: 4,
          assists: 6,
        },
      },
      homeTeam: {
        teamId: 1610612756,
        tricode: 'PHX',
        city: 'Phoenix',
        name: 'Suns',
        record: '49-33',
        score: 91,
        quarterScores: [30, 34, 27, 0],
        primaryColor: '#1D1160',
        secondaryColor: '#E56020',
        leader: {
          playerId: '1626164',
          name: 'Devin Booker',
          jerseyNumber: '1',
          position: 'G',
          teamTricode: 'PHX',
          points: 31,
          rebounds: 5,
          assists: 7,
        },
      },
      streams: buildGameStreams(
        '0022600082',
        'DAL',
        'Mavericks',
        'PHX',
        'Suns',
        'KFAA / MavsTV',
        'Arizona Family Sports'
      ),
    },
    {
      gameId: '0022600083',
      gameCode: '20261026/MILMIA',
      dateKey: '2026-10-26',
      gameStatus: 3,
      gameStatusText: 'FINAL',
      nationalBroadcaster: 'NBA League Pass',
      arena: 'Kaseya Center · Miami, FL',
      isLeaguePass: true,
      awayTeam: {
        teamId: 1610612749,
        tricode: 'MIL',
        city: 'Milwaukee',
        name: 'Bucks',
        record: '49-33',
        score: 119,
        quarterScores: [28, 31, 30, 30],
        primaryColor: '#00471B',
        secondaryColor: '#EEE1C6',
        leader: {
          playerId: '203507',
          name: 'Giannis Antetokounmpo',
          jerseyNumber: '34',
          position: 'F',
          teamTricode: 'MIL',
          points: 34,
          rebounds: 13,
          assists: 6,
        },
      },
      homeTeam: {
        teamId: 1610612748,
        tricode: 'MIA',
        city: 'Miami',
        name: 'Heat',
        record: '44-38',
        score: 108,
        quarterScores: [26, 27, 29, 26],
        primaryColor: '#98002E',
        secondaryColor: '#F9A01B',
        leader: {
          playerId: '1629639',
          name: 'Tyler Herro',
          jerseyNumber: '14',
          position: 'G',
          teamTricode: 'MIA',
          points: 28,
          rebounds: 5,
          assists: 6,
        },
      },
      streams: buildGameStreams(
        '0022600083',
        'MIL',
        'Bucks',
        'MIA',
        'Heat',
        'FanDuel Sports WI',
        'FanDuel Sports Sun'
      ),
    },
    {
      gameId: '0022600084',
      gameCode: '20261026/MINSAC',
      dateKey: '2026-10-26',
      gameStatus: 1,
      gameStatusText: '10:00 PM ET',
      nationalBroadcaster: 'NBA TV',
      arena: 'Golden 1 Center · Sacramento, CA',
      isLeaguePass: true,
      awayTeam: {
        teamId: 1610612750,
        tricode: 'MIN',
        city: 'Minnesota',
        name: 'Timberwolves',
        record: '54-28',
        score: 0,
        quarterScores: [0, 0, 0, 0],
        primaryColor: '#0C2340',
        secondaryColor: '#236192',
        leader: {
          playerId: '1630162',
          name: 'Anthony Edwards',
          jerseyNumber: '5',
          position: 'G',
          teamTricode: 'MIN',
          points: 28,
          rebounds: 6,
          assists: 5,
        },
      },
      homeTeam: {
        teamId: 1610612758,
        tricode: 'SAC',
        city: 'Sacramento',
        name: 'Kings',
        record: '46-36',
        score: 0,
        quarterScores: [0, 0, 0, 0],
        primaryColor: '#5A2D81',
        secondaryColor: '#63727A',
        leader: {
          playerId: '1628368',
          name: "De'Aaron Fox",
          jerseyNumber: '5',
          position: 'G',
          teamTricode: 'SAC',
          points: 27,
          rebounds: 4,
          assists: 6,
        },
      },
      streams: buildGameStreams(
        '0022600084',
        'MIN',
        'Timberwolves',
        'SAC',
        'Kings',
        'FanDuel Sports North',
        'NBC Sports California'
      ),
    },
  ],

  '2026-10-27': [
    {
      gameId: '0022600091',
      gameCode: '20261027/PHICLE',
      dateKey: '2026-10-27',
      gameStatus: 3,
      gameStatusText: 'FINAL',
      nationalBroadcaster: 'Peacock / League Pass',
      arena: 'Rocket Mortgage FieldHouse · Cleveland, OH',
      isLeaguePass: true,
      awayTeam: {
        teamId: 1610612755,
        tricode: 'PHI',
        city: 'Philadelphia',
        name: '76ers',
        record: '47-35',
        score: 109,
        quarterScores: [27, 25, 31, 26],
        primaryColor: '#006BB6',
        secondaryColor: '#ED174C',
        leader: {
          playerId: '1630178',
          name: 'Tyrese Maxey',
          jerseyNumber: '0',
          position: 'G',
          teamTricode: 'PHI',
          points: 31,
          rebounds: 4,
          assists: 7,
        },
      },
      homeTeam: {
        teamId: 1610612739,
        tricode: 'CLE',
        city: 'Cleveland',
        name: 'Cavaliers',
        record: '58-24',
        score: 116,
        quarterScores: [30, 29, 28, 29],
        primaryColor: '#860038',
        secondaryColor: '#FDBB30',
        leader: {
          playerId: '1628378',
          name: 'Donovan Mitchell',
          jerseyNumber: '45',
          position: 'G',
          teamTricode: 'CLE',
          points: 35,
          rebounds: 5,
          assists: 6,
        },
      },
      streams: buildGameStreams(
        '0022600091',
        'PHI',
        '76ers',
        'CLE',
        'Cavaliers',
        'NBC Sports Philadelphia',
        'FanDuel Sports Ohio'
      ),
    },
    {
      gameId: '0022600092',
      gameCode: '20261027/HOUSAS',
      dateKey: '2026-10-27',
      gameStatus: 3,
      gameStatusText: 'FINAL / OT',
      nationalBroadcaster: 'NBA League Pass',
      arena: 'Frost Bank Center · San Antonio, TX',
      isLeaguePass: true,
      awayTeam: {
        teamId: 1610612745,
        tricode: 'HOU',
        city: 'Houston',
        name: 'Rockets',
        record: '51-31',
        score: 121,
        quarterScores: [26, 29, 28, 27],
        primaryColor: '#CE1141',
        secondaryColor: '#000000',
        leader: {
          playerId: '1630578',
          name: 'Alperen Sengun',
          jerseyNumber: '28',
          position: 'C',
          teamTricode: 'HOU',
          points: 26,
          rebounds: 12,
          assists: 8,
        },
      },
      homeTeam: {
        teamId: 1610612759,
        tricode: 'SAS',
        city: 'San Antonio',
        name: 'Spurs',
        record: '41-41',
        score: 124,
        quarterScores: [28, 27, 29, 26],
        primaryColor: '#000000',
        secondaryColor: '#C4CED4',
        leader: {
          playerId: '1641705',
          name: 'Victor Wembanyama',
          jerseyNumber: '1',
          position: 'C',
          teamTricode: 'SAS',
          points: 34,
          rebounds: 15,
          assists: 5,
        },
      },
      streams: buildGameStreams(
        '0022600092',
        'HOU',
        'Rockets',
        'SAS',
        'Spurs',
        'Space City Home Network',
        'FanDuel Sports SW'
      ),
    },
    {
      gameId: '0022600093',
      gameCode: '20261027/MEMORL',
      dateKey: '2026-10-27',
      gameStatus: 3,
      gameStatusText: 'FINAL',
      nationalBroadcaster: 'NBA League Pass',
      arena: 'Kia Center · Orlando, FL',
      isLeaguePass: true,
      awayTeam: {
        teamId: 1610612763,
        tricode: 'MEM',
        city: 'Memphis',
        name: 'Grizzlies',
        record: '48-34',
        score: 111,
        quarterScores: [29, 26, 28, 28],
        primaryColor: '#5D76A9',
        secondaryColor: '#12173F',
        leader: {
          playerId: '1629630',
          name: 'Ja Morant',
          jerseyNumber: '12',
          position: 'G',
          teamTricode: 'MEM',
          points: 29,
          rebounds: 5,
          assists: 11,
        },
      },
      homeTeam: {
        teamId: 1610612753,
        tricode: 'ORL',
        city: 'Orlando',
        name: 'Magic',
        record: '49-33',
        score: 115,
        quarterScores: [27, 30, 29, 29],
        primaryColor: '#0077C0',
        secondaryColor: '#C4CED4',
        leader: {
          playerId: '1631094',
          name: 'Paolo Banchero',
          jerseyNumber: '5',
          position: 'F',
          teamTricode: 'ORL',
          points: 32,
          rebounds: 9,
          assists: 6,
        },
      },
      streams: buildGameStreams(
        '0022600093',
        'MEM',
        'Grizzlies',
        'ORL',
        'Magic',
        'FanDuel Sports SE',
        'FanDuel Sports Florida'
      ),
    },
  ],

  '2026-10-28': [
    {
      gameId: '0022600101',
      gameCode: '20261028/LALPHX',
      dateKey: '2026-10-28',
      gameStatus: 1,
      gameStatusText: '7:30 PM ET',
      nationalBroadcaster: 'TNT / League Pass',
      arena: 'Footprint Center · Phoenix, AZ',
      isLeaguePass: true,
      awayTeam: {
        teamId: 1610612747,
        tricode: 'LAL',
        city: 'Los Angeles',
        name: 'Lakers',
        record: '54-29',
        score: 0,
        quarterScores: [0, 0, 0, 0],
        primaryColor: '#552583',
        secondaryColor: '#FDB927',
        leader: {
          playerId: '203076',
          name: 'Anthony Davis',
          jerseyNumber: '3',
          position: 'F-C',
          teamTricode: 'LAL',
          points: 28,
          rebounds: 12,
          assists: 4,
        },
      },
      homeTeam: {
        teamId: 1610612756,
        tricode: 'PHX',
        city: 'Phoenix',
        name: 'Suns',
        record: '50-33',
        score: 0,
        quarterScores: [0, 0, 0, 0],
        primaryColor: '#1D1160',
        secondaryColor: '#E56020',
        leader: {
          playerId: '201142',
          name: 'Kevin Durant',
          jerseyNumber: '35',
          position: 'F',
          teamTricode: 'PHX',
          points: 29,
          rebounds: 7,
          assists: 5,
        },
      },
      streams: buildGameStreams(
        '0022600101',
        'LAL',
        'Lakers',
        'PHX',
        'Suns',
        'Spectrum SportsNet',
        'Arizona Family Sports'
      ),
    },
    {
      gameId: '0022600102',
      gameCode: '20261028/ATLCHA',
      dateKey: '2026-10-28',
      gameStatus: 1,
      gameStatusText: '7:00 PM ET',
      nationalBroadcaster: 'NBA League Pass',
      arena: 'Spectrum Center · Charlotte, NC',
      isLeaguePass: true,
      awayTeam: {
        teamId: 1610612737,
        tricode: 'ATL',
        city: 'Atlanta',
        name: 'Hawks',
        record: '40-42',
        score: 0,
        quarterScores: [0, 0, 0, 0],
        primaryColor: '#E03A3E',
        secondaryColor: '#C1D32F',
        leader: {
          playerId: '1629027',
          name: 'Trae Young',
          jerseyNumber: '11',
          position: 'G',
          teamTricode: 'ATL',
          points: 26,
          rebounds: 3,
          assists: 11,
        },
      },
      homeTeam: {
        teamId: 1610612766,
        tricode: 'CHA',
        city: 'Charlotte',
        name: 'Hornets',
        record: '31-51',
        score: 0,
        quarterScores: [0, 0, 0, 0],
        primaryColor: '#1D1160',
        secondaryColor: '#00788C',
        leader: {
          playerId: '1630163',
          name: 'LaMelo Ball',
          jerseyNumber: '1',
          position: 'G',
          teamTricode: 'CHA',
          points: 27,
          rebounds: 6,
          assists: 8,
        },
      },
      streams: buildGameStreams(
        '0022600102',
        'ATL',
        'Hawks',
        'CHA',
        'Hornets',
        'FanDuel Sports SE',
        'FanDuel Sports Carolinas'
      ),
    },
    {
      gameId: '0022600103',
      gameCode: '20261028/DETCHI',
      dateKey: '2026-10-28',
      gameStatus: 1,
      gameStatusText: '8:00 PM ET',
      nationalBroadcaster: 'NBA League Pass',
      arena: 'United Center · Chicago, IL',
      isLeaguePass: true,
      awayTeam: {
        teamId: 1610612765,
        tricode: 'DET',
        city: 'Detroit',
        name: 'Pistons',
        record: '44-38',
        score: 0,
        quarterScores: [0, 0, 0, 0],
        primaryColor: '#C8102E',
        secondaryColor: '#1D42BA',
        leader: {
          playerId: '1630595',
          name: 'Cade Cunningham',
          jerseyNumber: '2',
          position: 'G',
          teamTricode: 'DET',
          points: 25,
          rebounds: 6,
          assists: 9,
        },
      },
      homeTeam: {
        teamId: 1610612741,
        tricode: 'CHI',
        city: 'Chicago',
        name: 'Bulls',
        record: '38-44',
        score: 0,
        quarterScores: [0, 0, 0, 0],
        primaryColor: '#CE1141',
        secondaryColor: '#000000',
        leader: {
          playerId: '1629632',
          name: 'Coby White',
          jerseyNumber: '0',
          position: 'G',
          teamTricode: 'CHI',
          points: 23,
          rebounds: 4,
          assists: 5,
        },
      },
      streams: buildGameStreams(
        '0022600103',
        'DET',
        'Pistons',
        'CHI',
        'Bulls',
        'FanDuel Sports Detroit',
        'CHSN Chicago'
      ),
    },
    {
      gameId: '0022600104',
      gameCode: '20261028/NOPPOR',
      dateKey: '2026-10-28',
      gameStatus: 1,
      gameStatusText: '10:00 PM ET',
      nationalBroadcaster: 'NBA League Pass',
      arena: 'Moda Center · Portland, OR',
      isLeaguePass: true,
      awayTeam: {
        teamId: 1610612740,
        tricode: 'NOP',
        city: 'New Orleans',
        name: 'Pelicans',
        record: '43-39',
        score: 0,
        quarterScores: [0, 0, 0, 0],
        primaryColor: '#0C2340',
        secondaryColor: '#C8102E',
        leader: {
          playerId: '1629627',
          name: 'Zion Williamson',
          jerseyNumber: '1',
          position: 'F',
          teamTricode: 'NOP',
          points: 26,
          rebounds: 7,
          assists: 5,
        },
      },
      homeTeam: {
        teamId: 1610612757,
        tricode: 'POR',
        city: 'Portland',
        name: 'Trail Blazers',
        record: '28-54',
        score: 0,
        quarterScores: [0, 0, 0, 0],
        primaryColor: '#E03A3E',
        secondaryColor: '#000000',
        leader: {
          playerId: '1630703',
          name: 'Shaedon Sharpe',
          jerseyNumber: '17',
          position: 'G',
          teamTricode: 'POR',
          points: 23,
          rebounds: 5,
          assists: 4,
        },
      },
      streams: buildGameStreams(
        '0022600104',
        'NOP',
        'Pelicans',
        'POR',
        'Trail Blazers',
        'Gulf Coast Sports',
        'Rip City TV Network'
      ),
    },
  ],

  '2026-10-29': [
    {
      gameId: '0022600111',
      gameCode: '20261029/NYKMIA',
      dateKey: '2026-10-29',
      gameStatus: 1,
      gameStatusText: '7:30 PM ET',
      nationalBroadcaster: 'ESPN',
      arena: 'Kaseya Center · Miami, FL',
      isLeaguePass: true,
      awayTeam: {
        teamId: 1610612752,
        tricode: 'NYK',
        city: 'New York',
        name: 'Knicks',
        record: '53-30',
        score: 0,
        quarterScores: [0, 0, 0, 0],
        primaryColor: '#006BB6',
        secondaryColor: '#F58426',
        leader: {
          playerId: '1626157',
          name: 'Karl-Anthony Towns',
          jerseyNumber: '32',
          position: 'C-F',
          teamTricode: 'NYK',
          points: 25,
          rebounds: 12,
          assists: 3,
        },
      },
      homeTeam: {
        teamId: 1610612748,
        tricode: 'MIA',
        city: 'Miami',
        name: 'Heat',
        record: '44-39',
        score: 0,
        quarterScores: [0, 0, 0, 0],
        primaryColor: '#98002E',
        secondaryColor: '#F9A01B',
        leader: {
          playerId: '1628389',
          name: 'Bam Adebayo',
          jerseyNumber: '13',
          position: 'C',
          teamTricode: 'MIA',
          points: 21,
          rebounds: 10,
          assists: 4,
        },
      },
      streams: buildGameStreams(
        '0022600111',
        'NYK',
        'Knicks',
        'MIA',
        'Heat',
        'MSG Network',
        'FanDuel Sports Sun'
      ),
    },
    {
      gameId: '0022600112',
      gameCode: '20261029/DENOKC',
      dateKey: '2026-10-29',
      gameStatus: 1,
      gameStatusText: '9:30 PM ET',
      nationalBroadcaster: 'ESPN / League Pass',
      arena: 'Paycom Center · Oklahoma City, OK',
      isLeaguePass: true,
      awayTeam: {
        teamId: 1610612743,
        tricode: 'DEN',
        city: 'Denver',
        name: 'Nuggets',
        record: '56-27',
        score: 0,
        quarterScores: [0, 0, 0, 0],
        primaryColor: '#0E2240',
        secondaryColor: '#FEC524',
        leader: {
          playerId: '1627750',
          name: 'Jamal Murray',
          jerseyNumber: '27',
          position: 'G',
          teamTricode: 'DEN',
          points: 24,
          rebounds: 4,
          assists: 7,
        },
      },
      homeTeam: {
        teamId: 1610612760,
        tricode: 'OKC',
        city: 'Oklahoma City',
        name: 'Thunder',
        record: '65-18',
        score: 0,
        quarterScores: [0, 0, 0, 0],
        primaryColor: '#007AC1',
        secondaryColor: '#EF3B24',
        leader: {
          playerId: '1631096',
          name: 'Chet Holmgren',
          jerseyNumber: '7',
          position: 'C-F',
          teamTricode: 'OKC',
          points: 21,
          rebounds: 10,
          assists: 3,
        },
      },
      streams: buildGameStreams(
        '0022600112',
        'DEN',
        'Nuggets',
        'OKC',
        'Thunder',
        'Altitude Sports',
        'FanDuel Sports OK'
      ),
    },
    {
      gameId: '0022600113',
      gameCode: '20261029/TORWAS',
      dateKey: '2026-10-29',
      gameStatus: 1,
      gameStatusText: '7:00 PM ET',
      nationalBroadcaster: 'NBA League Pass',
      arena: 'Capital One Arena · Washington, DC',
      isLeaguePass: true,
      awayTeam: {
        teamId: 1610612761,
        tricode: 'TOR',
        city: 'Toronto',
        name: 'Raptors',
        record: '30-52',
        score: 0,
        quarterScores: [0, 0, 0, 0],
        primaryColor: '#CE1141',
        secondaryColor: '#000000',
        leader: {
          playerId: '1630567',
          name: 'Scottie Barnes',
          jerseyNumber: '4',
          position: 'F',
          teamTricode: 'TOR',
          points: 23,
          rebounds: 8,
          assists: 6,
        },
      },
      homeTeam: {
        teamId: 1610612764,
        tricode: 'WAS',
        city: 'Washington',
        name: 'Wizards',
        record: '21-61',
        score: 0,
        quarterScores: [0, 0, 0, 0],
        primaryColor: '#002B5C',
        secondaryColor: '#E31837',
        leader: {
          playerId: '1629673',
          name: 'Jordan Poole',
          jerseyNumber: '13',
          position: 'G',
          teamTricode: 'WAS',
          points: 22,
          rebounds: 3,
          assists: 5,
        },
      },
      streams: buildGameStreams(
        '0022600113',
        'TOR',
        'Raptors',
        'WAS',
        'Wizards',
        'TSN / Sportsnet',
        'Monumental Sports'
      ),
    },
  ],

  '2026-10-30': [
    {
      gameId: '0022600121',
      gameCode: '20261030/BOSMIL',
      dateKey: '2026-10-30',
      gameStatus: 1,
      gameStatusText: '7:30 PM ET',
      nationalBroadcaster: 'Prime Video / League Pass',
      arena: 'Fiserv Forum · Milwaukee, WI',
      isLeaguePass: true,
      awayTeam: {
        teamId: 1610612738,
        tricode: 'BOS',
        city: 'Boston',
        name: 'Celtics',
        record: '57-26',
        score: 0,
        quarterScores: [0, 0, 0, 0],
        primaryColor: '#007A33',
        secondaryColor: '#BA9653',
        leader: {
          playerId: '1627759',
          name: 'Jaylen Brown',
          jerseyNumber: '7',
          position: 'G-F',
          teamTricode: 'BOS',
          points: 27,
          rebounds: 6,
          assists: 4,
        },
      },
      homeTeam: {
        teamId: 1610612749,
        tricode: 'MIL',
        city: 'Milwaukee',
        name: 'Bucks',
        record: '50-33',
        score: 0,
        quarterScores: [0, 0, 0, 0],
        primaryColor: '#00471B',
        secondaryColor: '#EEE1C6',
        leader: {
          playerId: '203081',
          name: 'Damian Lillard',
          jerseyNumber: '0',
          position: 'G',
          teamTricode: 'MIL',
          points: 26,
          rebounds: 4,
          assists: 7,
        },
      },
      streams: buildGameStreams(
        '0022600121',
        'BOS',
        'Celtics',
        'MIL',
        'Bucks',
        'NBC Sports Boston',
        'FanDuel Sports WI'
      ),
    },
    {
      gameId: '0022600122',
      gameCode: '20261030/DALGSW',
      dateKey: '2026-10-30',
      gameStatus: 1,
      gameStatusText: '10:00 PM ET',
      nationalBroadcaster: 'Prime Video / League Pass',
      arena: 'Chase Center · San Francisco, CA',
      isLeaguePass: true,
      awayTeam: {
        teamId: 1610612742,
        tricode: 'DAL',
        city: 'Dallas',
        name: 'Mavericks',
        record: '50-33',
        score: 0,
        quarterScores: [0, 0, 0, 0],
        primaryColor: '#00538C',
        secondaryColor: '#002B5E',
        leader: {
          playerId: '202691',
          name: 'Klay Thompson',
          jerseyNumber: '31',
          position: 'G-F',
          teamTricode: 'DAL',
          points: 22,
          rebounds: 4,
          assists: 3,
        },
      },
      homeTeam: {
        teamId: 1610612744,
        tricode: 'GSW',
        city: 'Golden State',
        name: 'Warriors',
        record: '48-35',
        score: 0,
        quarterScores: [0, 0, 0, 0],
        primaryColor: '#1D428A',
        secondaryColor: '#FFC72C',
        leader: {
          playerId: '201939',
          name: 'Stephen Curry',
          jerseyNumber: '30',
          position: 'G',
          teamTricode: 'GSW',
          points: 31,
          rebounds: 5,
          assists: 6,
        },
      },
      streams: buildGameStreams(
        '0022600122',
        'DAL',
        'Mavericks',
        'GSW',
        'Warriors',
        'KFAA / MavsTV',
        'NBC Sports Bay Area'
      ),
    },
  ],

  '2026-10-31': [
    {
      gameId: '0022600131',
      gameCode: '20261031/CLEORL',
      dateKey: '2026-10-31',
      gameStatus: 1,
      gameStatusText: '7:00 PM ET',
      nationalBroadcaster: 'NBA Cup · League Pass',
      arena: 'Kia Center · Orlando, FL',
      isLeaguePass: true,
      awayTeam: {
        teamId: 1610612739,
        tricode: 'CLE',
        city: 'Cleveland',
        name: 'Cavaliers',
        record: '59-24',
        score: 0,
        quarterScores: [0, 0, 0, 0],
        primaryColor: '#860038',
        secondaryColor: '#FDBB30',
        leader: {
          playerId: '1629636',
          name: 'Darius Garland',
          jerseyNumber: '10',
          position: 'G',
          teamTricode: 'CLE',
          points: 24,
          rebounds: 3,
          assists: 8,
        },
      },
      homeTeam: {
        teamId: 1610612753,
        tricode: 'ORL',
        city: 'Orlando',
        name: 'Magic',
        record: '50-33',
        score: 0,
        quarterScores: [0, 0, 0, 0],
        primaryColor: '#0077C0',
        secondaryColor: '#C4CED4',
        leader: {
          playerId: '1630532',
          name: 'Franz Wagner',
          jerseyNumber: '22',
          position: 'F',
          teamTricode: 'ORL',
          points: 25,
          rebounds: 6,
          assists: 5,
        },
      },
      streams: buildGameStreams(
        '0022600131',
        'CLE',
        'Cavaliers',
        'ORL',
        'Magic',
        'FanDuel Sports Ohio',
        'FanDuel Sports Florida'
      ),
    },
    {
      gameId: '0022600132',
      gameCode: '20261031/MINLAL',
      dateKey: '2026-10-31',
      gameStatus: 1,
      gameStatusText: '10:00 PM ET',
      nationalBroadcaster: 'ESPN / League Pass',
      arena: 'Crypto.com Arena · Los Angeles, CA',
      isLeaguePass: true,
      awayTeam: {
        teamId: 1610612750,
        tricode: 'MIN',
        city: 'Minnesota',
        name: 'Timberwolves',
        record: '55-28',
        score: 0,
        quarterScores: [0, 0, 0, 0],
        primaryColor: '#0C2340',
        secondaryColor: '#236192',
        leader: {
          playerId: '1630162',
          name: 'Anthony Edwards',
          jerseyNumber: '5',
          position: 'G',
          teamTricode: 'MIN',
          points: 30,
          rebounds: 6,
          assists: 5,
        },
      },
      homeTeam: {
        teamId: 1610612747,
        tricode: 'LAL',
        city: 'Los Angeles',
        name: 'Lakers',
        record: '54-30',
        score: 0,
        quarterScores: [0, 0, 0, 0],
        primaryColor: '#552583',
        secondaryColor: '#FDB927',
        leader: {
          playerId: '2544',
          name: 'LeBron James',
          jerseyNumber: '23',
          position: 'F',
          teamTricode: 'LAL',
          points: 27,
          rebounds: 8,
          assists: 9,
        },
      },
      streams: buildGameStreams(
        '0022600132',
        'MIN',
        'Timberwolves',
        'LAL',
        'Lakers',
        'FanDuel Sports North',
        'Spectrum SportsNet'
      ),
    },
    {
      gameId: '0022600133',
      gameCode: '20261031/SACLAC',
      dateKey: '2026-10-31',
      gameStatus: 1,
      gameStatusText: '10:30 PM ET',
      nationalBroadcaster: 'NBA League Pass',
      arena: 'Intuit Dome · Inglewood, CA',
      isLeaguePass: true,
      awayTeam: {
        teamId: 1610612758,
        tricode: 'SAC',
        city: 'Sacramento',
        name: 'Kings',
        record: '46-37',
        score: 0,
        quarterScores: [0, 0, 0, 0],
        primaryColor: '#5A2D81',
        secondaryColor: '#63727A',
        leader: {
          playerId: '1627734',
          name: 'Domantas Sabonis',
          jerseyNumber: '11',
          position: 'C',
          teamTricode: 'SAC',
          points: 21,
          rebounds: 14,
          assists: 8,
        },
      },
      homeTeam: {
        teamId: 1610612746,
        tricode: 'LAC',
        city: 'LA',
        name: 'Clippers',
        record: '43-40',
        score: 0,
        quarterScores: [0, 0, 0, 0],
        primaryColor: '#C8102E',
        secondaryColor: '#1D428A',
        leader: {
          playerId: '202695',
          name: 'Kawhi Leonard',
          jerseyNumber: '2',
          position: 'F',
          teamTricode: 'LAC',
          points: 26,
          rebounds: 6,
          assists: 4,
        },
      },
      streams: buildGameStreams(
        '0022600133',
        'SAC',
        'Kings',
        'LAC',
        'Clippers',
        'NBC Sports California',
        'ClipperVision'
      ),
    },
  ],
};

/**
 * Pool of all curated games so any arbitrary calendar date outside the 7-day strip
 * deterministically generates a unique, distinct slate of matchups.
 */
const ALL_CURATED_GAMES_POOL: NbaGame[] = Object.values(CURATED_GAMES_BY_DATE).flat();

function hashDateKey(dateKey: string): number {
  let hash = 0;
  for (let i = 0; i < dateKey.length; i++) {
    hash = (hash * 31 + dateKey.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/**
 * Synchronously returns a distinct set of NBA games for any dateKey (YYYY-MM-DD).
 */
export function getGamesForDateSync(dateKey: string): NbaGame[] {
  if (CURATED_GAMES_BY_DATE[dateKey]) {
    return CURATED_GAMES_BY_DATE[dateKey];
  }

  // Deterministic rotation for any custom calendar date so no two adjacent dates show identical games
  const seed = hashDateKey(dateKey);
  const count = 3 + (seed % 2); // 3 or 4 games
  const selected: NbaGame[] = [];
  const usedTeams = new Set<string>();

  for (let i = 0; i < ALL_CURATED_GAMES_POOL.length && selected.length < count; i++) {
    const idx = (seed + i * 3) % ALL_CURATED_GAMES_POOL.length;
    const candidate = ALL_CURATED_GAMES_POOL[idx];
    if (
      !usedTeams.has(candidate.awayTeam.tricode) &&
      !usedTeams.has(candidate.homeTeam.tricode)
    ) {
      usedTeams.add(candidate.awayTeam.tricode);
      usedTeams.add(candidate.homeTeam.tricode);
      const compactDate = dateKey.replace(/-/g, '');
      const scoreOffset = ((seed + i) % 9) - 4;
      const awayScore = Math.max(98, (candidate.awayTeam.score || 112) + scoreOffset);
      const homeScore = Math.max(
        99,
        (candidate.homeTeam.score || 115) - scoreOffset + (i % 2 === 0 ? 3 : -2)
      );

      selected.push({
        ...candidate,
        gameId: `${candidate.gameId}-${compactDate.slice(-4)}`,
        gameCode: `${compactDate}/${candidate.awayTeam.tricode}${candidate.homeTeam.tricode}`,
        dateKey,
        gameStatus: 3,
        gameStatusText: 'FINAL',
        awayTeam: {
          ...candidate.awayTeam,
          score: awayScore,
        },
        homeTeam: {
          ...candidate.homeTeam,
          score: homeScore,
        },
      });
    }
  }

  return selected;
}

/**
 * Maps ESPN NBA team IDs to official NBA.com team IDs for crisp SVG logos.
 */
const TRICODE_TO_NBA_TEAM_ID: Record<string, { id: number; color: string }> = {
  ATL: { id: 1610612737, color: '#E03A3E' },
  BOS: { id: 1610612738, color: '#007A33' },
  BKN: { id: 1610612751, color: '#1D1D1B' },
  CHA: { id: 1610612766, color: '#1D1160' },
  CHI: { id: 1610612741, color: '#CE1141' },
  CLE: { id: 1610612739, color: '#860038' },
  DAL: { id: 1610612742, color: '#00538C' },
  DEN: { id: 1610612743, color: '#0E2240' },
  DET: { id: 1610612765, color: '#C8102E' },
  GS: { id: 1610612744, color: '#1D428A' },
  GSW: { id: 1610612744, color: '#1D428A' },
  HOU: { id: 1610612745, color: '#CE1141' },
  IND: { id: 1610612754, color: '#002D62' },
  LAC: { id: 1610612746, color: '#C8102E' },
  LAL: { id: 1610612747, color: '#552583' },
  MEM: { id: 1610612763, color: '#5D76A9' },
  MIA: { id: 1610612748, color: '#98002E' },
  MIL: { id: 1610612749, color: '#00471B' },
  MIN: { id: 1610612750, color: '#0C2340' },
  NO: { id: 1610612740, color: '#0C2340' },
  NOP: { id: 1610612740, color: '#0C2340' },
  NY: { id: 1610612752, color: '#006BB6' },
  NYK: { id: 1610612752, color: '#006BB6' },
  OKC: { id: 1610612760, color: '#007AC1' },
  ORL: { id: 1610612753, color: '#0077C0' },
  PHI: { id: 1610612755, color: '#006BB6' },
  PHX: { id: 1610612756, color: '#1D1160' },
  POR: { id: 1610612757, color: '#E03A3E' },
  SAC: { id: 1610612758, color: '#5A2D81' },
  SA: { id: 1610612759, color: '#000000' },
  SAS: { id: 1610612759, color: '#000000' },
  TOR: { id: 1610612761, color: '#CE1141' },
  UTA: { id: 1610612762, color: '#002B5C' },
  UTAH: { id: 1610612762, color: '#002B5C' },
  WAS: { id: 1610612764, color: '#002B5C' },
  WSH: { id: 1610612764, color: '#002B5C' },
};

function normalizeTricode(abbr: string): string {
  const up = (abbr || 'NBA').toUpperCase();
  if (up === 'GS') return 'GSW';
  if (up === 'NO') return 'NOP';
  if (up === 'NY') return 'NYK';
  if (up === 'SA') return 'SAS';
  if (up === 'UTAH') return 'UTA';
  if (up === 'WSH') return 'WAS';
  return up;
}

/**
 * Fetches live NBA games for a specific dateKey (YYYY-MM-DD) from the public CORS-enabled
 * NBA scoreboard endpoint, falling back cleanly to the distinct per-date curated schedule.
 */
export async function fetchGamesForDate(
  dateKey: string
): Promise<{ games: NbaGame[]; source: 'live_api' | 'curated' }> {
  // If user selected one of the 7 showcase dates in October 2026, return its distinct schedule immediately
  if (CURATED_GAMES_BY_DATE[dateKey]) {
    return { games: CURATED_GAMES_BY_DATE[dateKey], source: 'curated' };
  }

  try {
    const compactDate = dateKey.replace(/-/g, '');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);
    const response = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=${compactDate}`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);

    if (response.ok) {
      const data = await response.json();
      const events = Array.isArray(data?.events) ? data.events : [];
      if (events.length > 0) {
        const parsedGames: NbaGame[] = events
          .map((ev: any): NbaGame | null => {
            const comp = ev?.competitions?.[0];
            if (!comp) return null;
            const competitors = Array.isArray(comp.competitors) ? comp.competitors : [];
            const awayComp =
              competitors.find((c: any) => c.homeAway === 'away') || competitors[1];
            const homeComp =
              competitors.find((c: any) => c.homeAway === 'home') || competitors[0];
            if (!awayComp || !homeComp) return null;

            const buildTeam = (c: any): NbaTeamInfo => {
              const tricode = normalizeTricode(c?.team?.abbreviation || 'NBA');
              const meta = TRICODE_TO_NBA_TEAM_ID[tricode] || {
                id: 1610612747,
                color: c?.team?.color ? `#${c.team.color}` : '#1D428A',
              };
              const linescores = Array.isArray(c?.linescores)
                ? c.linescores.map((ls: any) => Number(ls?.value || 0))
                : [0, 0, 0, 0];

              // Parse leader from competitor leaders
              const ptsLeaderCat = Array.isArray(c?.leaders)
                ? c.leaders.find(
                    (l: any) => l.name === 'points' || l. name === 'rating'
                  ) || c.leaders[0]
                : null;
              const athlete = ptsLeaderCat?.leaders?.[0]?.athlete;
              const ptsVal = Math.round(Number(ptsLeaderCat?.leaders?.[0]?.value || 24));

              return {
                teamId: meta.id,
                tricode,
                city: c?.team?.location || tricode,
                name: c?.team?.name || c?.team?.shortDisplayName || tricode,
                record: c?.records?.[0]?.summary || '0-0',
                score: Number(c?.score || 0),
                quarterScores: linescores.length >= 4 ? linescores.slice(0, 4) : [0, 0, 0, 0],
                primaryColor: meta.color,
                secondaryColor: '#FFFFFF',
                leader: {
                  playerId: String(athlete?.id || '0'),
                  name: athlete?.displayName || athlete?.shortName || `${tricode} Team Leader`,
                  jerseyNumber: String(athlete?.jersey || '0'),
                  position: athlete?.position?.abbreviation || 'G',
                  teamTricode: tricode,
                  points: ptsVal,
                  rebounds: 6,
                  assists: 5,
                },
              };
            };

            const awayTeam = buildTeam(awayComp);
            const homeTeam = buildTeam(homeComp);
            const state = ev?.status?.type?.state;
            const gameStatus: 1 | 2 | 3 = state === 'in' ? 2 : state === 'post' ? 3 : 1;
            const gameStatusText =
              ev?.status?.type?.shortDetail ||
              (gameStatus === 3 ? 'FINAL' : gameStatus === 2 ? 'LIVE' : 'Scheduled');
            const broadcastName =
              comp?.broadcasts?.[0]?.names?.[0] || 'NBA League Pass';
            const arenaName = comp?.venue?.fullName
              ? `${comp.venue.fullName}${
                  comp.venue.address?.city ? ` · ${comp.venue.address.city}` : ''
                }`
              : 'NBA Arena';
            const gameId = String(ev.id || `${compactDate}-${awayTeam.tricode}`);

            return {
              gameId,
              gameCode: `${compactDate}/${awayTeam.tricode}${homeTeam.tricode}`,
              dateKey,
              gameStatus,
              gameStatusText,
              nationalBroadcaster: broadcastName,
              arena: arenaName,
              isLeaguePass: true,
              awayTeam,
              homeTeam,
              streams: buildGameStreams(
                gameId,
                awayTeam.tricode,
                awayTeam.name,
                homeTeam.tricode,
                homeTeam.name,
                `${awayTeam.city} Broadcast`,
                `${homeTeam.city} Broadcast`
              ),
            };
          })
          .filter(Boolean) as NbaGame[];

        if (parsedGames.length > 0) {
          logDiagnosticEvent(
            'NBA_SCHEDULE_FETCH',
            `Loaded ${parsedGames.length} live NBA games for ${dateKey}`
          );
          return { games: parsedGames, source: 'live_api' };
        }
      }
    }
  } catch (err) {
    logDiagnosticEvent(
      'NBA_SCHEDULE_FALLBACK',
      `Using curated schedule for ${dateKey} (${err instanceof Error ? err.message : 'offline'})`
    );
  }

  return { games: getGamesForDateSync(dateKey), source: 'curated' };
}
