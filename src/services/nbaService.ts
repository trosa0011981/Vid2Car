import { NbaDateOption, NbaGame, NbaStreamFeed, NbaUserSession } from '../types/nba';

const NBA_STORAGE_KEYS = {
  SESSION: 'aabrowser_nba_id_session_v1',
  HIDE_SCORES: 'aabrowser_nba_hide_scores_v1',
  HIDE_ODDS: 'aabrowser_nba_hide_odds_v1',
};

const DEFAULT_NBA_SESSION: NbaUserSession = {
  isSignedIn: false,
  email: '',
  displayName: '',
  subscriptionTier: 'League Pass',
  favoriteTeams: ['LAL'],
};

export function loadNbaSession(): NbaUserSession {
  try {
    const raw = localStorage.getItem(NBA_STORAGE_KEYS.SESSION);
    if (!raw) return { ...DEFAULT_NBA_SESSION };
    return { ...DEFAULT_NBA_SESSION, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_NBA_SESSION };
  }
}

export function saveNbaSession(session: NbaUserSession): void {
  try {
    localStorage.setItem(NBA_STORAGE_KEYS.SESSION, JSON.stringify(session));
  } catch (e) {
    console.error('Failed to save NBA session', e);
  }
}

export function loadHideScoresPref(): boolean {
  try {
    return localStorage.getItem(NBA_STORAGE_KEYS.HIDE_SCORES) === 'true';
  } catch {
    return false;
  }
}

export function saveHideScoresPref(hide: boolean): void {
  try {
    localStorage.setItem(NBA_STORAGE_KEYS.HIDE_SCORES, String(hide));
  } catch (e) {
    console.error('Failed to save hideScores preference', e);
  }
}

export function loadHideOddsPref(): boolean {
  try {
    return localStorage.getItem(NBA_STORAGE_KEYS.HIDE_ODDS) === 'true';
  } catch {
    return false;
  }
}

export function saveHideOddsPref(hide: boolean): void {
  try {
    localStorage.setItem(NBA_STORAGE_KEYS.HIDE_ODDS, String(hide));
  } catch (e) {
    console.error('Failed to save hideOdds preference', e);
  }
}

export function getNbaTeamLogoUrl(teamId: number): string {
  return `https://cdn.nba.com/logos/nba/${teamId}/global/L/logo.svg`;
}

export const NBA_DATE_STRIP: NbaDateOption[] = [
  { dateKey: '2026-10-25', dayOfWeek: 'Sun', dayNumber: '25', monthLabel: 'October 2026' },
  { dateKey: '2026-10-26', dayOfWeek: 'Mon', dayNumber: '26', monthLabel: 'October 2026', isToday: true },
  { dateKey: '2026-10-27', dayOfWeek: 'Tue', dayNumber: '27', monthLabel: 'October 2026' },
  { dateKey: '2026-10-28', dayOfWeek: 'Wed', dayNumber: '28', monthLabel: 'October 2026' },
  { dateKey: '2026-10-29', dayOfWeek: 'Thu', dayNumber: '29', monthLabel: 'October 2026' },
  { dateKey: '2026-10-30', dayOfWeek: 'Fri', dayNumber: '30', monthLabel: 'October 2026' },
  { dateKey: '2026-10-31', dayOfWeek: 'Sat', dayNumber: '31', monthLabel: 'October 2026' },
];

function buildStreamsForMatchup(
  gameId: string,
  slug: string,
  homeName: string,
  homeBroadcaster: string,
  awayName: string,
  awayBroadcaster: string,
  recapDuration = '2:52'
): NbaStreamFeed[] {
  const baseWatchPath = `https://www.nba.com/game/${slug}-${gameId}?watch`;
  return [
    {
      id: 'home',
      label: `${homeName} Stream (Home)`,
      sublabel: 'Home team local television broadcast & commentary',
      broadcaster: homeBroadcaster,
      language: 'English (US)',
      resolution: '1080p60 HD · Widevine L3',
      inAppWatchPath: `${baseWatchPath}&stream=home`,
    },
    {
      id: 'away',
      label: `${awayName} Stream (Away)`,
      sublabel: 'Visiting team regional television broadcast & commentary',
      broadcaster: awayBroadcaster,
      language: 'English (US)',
      resolution: '1080p60 HD · Widevine L3',
      inAppWatchPath: `${baseWatchPath}&stream=away`,
    },
    {
      id: 'mobile',
      label: 'Mobile View Stream',
      sublabel: 'Zoomed-in closer courtside camera tracking the ball carrier',
      broadcaster: 'NBA League Pass Mobile Cam',
      language: 'Natural Arena Audio / Commentary',
      resolution: '1080p60 Zoomed · Widevine L3',
      isZoomedMobileView: true,
      inAppWatchPath: `${baseWatchPath}&stream=mobile`,
    },
    {
      id: 'recap',
      label: 'Full Game Recap',
      sublabel: `Condensed ${recapDuration} highlight package of key plays`,
      broadcaster: 'NBA League Pass Rapid Replay',
      language: 'English (US)',
      resolution: '1080p60 HD',
      durationLabel: recapDuration,
      inAppWatchPath: `${baseWatchPath}&stream=recap`,
    },
  ];
}

export const CURATED_GAMES_BY_DATE: Record<string, NbaGame[]> = {
  '2026-10-25': [
    {
      gameId: '0022600081',
      gameCode: '20261025/UTALAL',
      dateKey: '2026-10-25',
      gameStatus: 3,
      gameStatusText: 'FINAL',
      arena: 'Crypto.com Arena · Los Angeles, CA',
      isLeaguePass: true,
      recapDuration: '2:52',
      homeTeam: {
        teamId: 1610612747,
        tricode: 'LAL',
        name: 'Lakers',
        city: 'Los Angeles',
        record: '3-0',
        score: 132,
        primaryColor: '#552583',
        quarterScores: [36, 32, 34, 30],
        leader: {
          name: 'Luka Dončić',
          jerseyNumber: '77',
          position: 'PG',
          teamTricode: 'LAL',
          points: 52,
          rebounds: 8,
          assists: 10,
        },
      },
      awayTeam: {
        teamId: 1610612762,
        tricode: 'UTA',
        name: 'Jazz',
        city: 'Utah',
        record: '1-2',
        score: 123,
        primaryColor: '#002B5C',
        quarterScores: [28, 31, 33, 31],
        leader: {
          name: 'Keyonte George',
          jerseyNumber: '3',
          position: 'PG',
          teamTricode: 'UTA',
          points: 24,
          rebounds: 9,
          assists: 10,
        },
      },
      streams: buildStreamsForMatchup(
        '0022600081',
        'uta-vs-lal',
        'Lakers',
        'Spectrum SportsNet',
        'Jazz',
        'KJZZ 14 / Jazz+',
        '2:52'
      ),
    },
    {
      gameId: '0022600082',
      gameCode: '20261025/BKNIND',
      dateKey: '2026-10-25',
      gameStatus: 3,
      gameStatusText: 'FINAL',
      arena: 'Gainbridge Fieldhouse · Indianapolis, IN',
      isLeaguePass: true,
      recapDuration: '2:51',
      homeTeam: {
        teamId: 1610612754,
        tricode: 'IND',
        name: 'Pacers',
        city: 'Indiana',
        record: '2-1',
        score: 136,
        primaryColor: '#002D62',
        quarterScores: [35, 38, 31, 32],
        leader: {
          name: 'Tyrese Haliburton',
          jerseyNumber: '0',
          position: 'PG',
          teamTricode: 'IND',
          points: 24,
          rebounds: 4,
          assists: 10,
        },
      },
      awayTeam: {
        teamId: 1610612751,
        tricode: 'BKN',
        name: 'Nets',
        city: 'Brooklyn',
        record: '0-3',
        score: 109,
        primaryColor: '#26282A',
        quarterScores: [26, 29, 27, 27],
        leader: {
          name: 'Josh Minott',
          jerseyNumber: '00',
          position: 'F',
          teamTricode: 'BKN',
          points: 15,
          rebounds: 8,
          assists: 2,
        },
      },
      streams: buildStreamsForMatchup(
        '0022600082',
        'bkn-vs-ind',
        'Pacers',
        'FanDuel Sports Indiana',
        'Nets',
        'YES Network',
        '2:51'
      ),
    },
    {
      gameId: '0022600083',
      gameCode: '20261025/OKCLAC',
      dateKey: '2026-10-25',
      gameStatus: 3,
      gameStatusText: 'FINAL',
      arena: 'Intuit Dome · Inglewood, CA',
      isLeaguePass: true,
      recapDuration: '2:52',
      homeTeam: {
        teamId: 1610612746,
        tricode: 'LAC',
        name: 'Clippers',
        city: 'LA',
        record: '1-2',
        score: 101,
        primaryColor: '#C8102E',
        quarterScores: [27, 24, 26, 24],
        leader: {
          name: 'Kris Dunn',
          jerseyNumber: '8',
          position: 'SG',
          teamTricode: 'LAC',
          points: 15,
          rebounds: 4,
          assists: 6,
        },
      },
      awayTeam: {
        teamId: 1610612760,
        tricode: 'OKC',
        name: 'Thunder',
        city: 'Oklahoma City',
        record: '3-0',
        score: 108,
        primaryColor: '#007AC1',
        quarterScores: [25, 28, 29, 26],
        leader: {
          name: 'Shai Gilgeous-Alexander',
          jerseyNumber: '2',
          position: 'PG',
          teamTricode: 'OKC',
          points: 34,
          rebounds: 6,
          assists: 5,
        },
      },
      streams: buildStreamsForMatchup(
        '0022600083',
        'okc-vs-lac',
        'Clippers',
        'ClipperVision / FanDuel SoCal',
        'Thunder',
        'FanDuel Sports Oklahoma',
        '2:52'
      ),
    },
    {
      gameId: '0022600084',
      gameCode: '20261025/BOSNYK',
      dateKey: '2026-10-25',
      gameStatus: 3,
      gameStatusText: 'FINAL',
      arena: 'Madison Square Garden · New York, NY',
      isLeaguePass: true,
      recapDuration: '3:04',
      homeTeam: {
        teamId: 1610612752,
        tricode: 'NYK',
        name: 'Knicks',
        city: 'New York',
        record: '2-1',
        score: 114,
        primaryColor: '#F58426',
        quarterScores: [29, 30, 27, 28],
        leader: {
          name: 'Jalen Brunson',
          jerseyNumber: '11',
          position: 'PG',
          teamTricode: 'NYK',
          points: 31,
          rebounds: 4,
          assists: 9,
        },
      },
      awayTeam: {
        teamId: 1610612738,
        tricode: 'BOS',
        name: 'Celtics',
        city: 'Boston',
        record: '3-0',
        score: 119,
        primaryColor: '#007A33',
        quarterScores: [31, 28, 30, 30],
        leader: {
          name: 'Jayson Tatum',
          jerseyNumber: '0',
          position: 'SF',
          teamTricode: 'BOS',
          points: 37,
          rebounds: 10,
          assists: 6,
        },
      },
      streams: buildStreamsForMatchup(
        '0022600084',
        'bos-vs-nyk',
        'Knicks',
        'MSG Network',
        'Celtics',
        'NBC Sports Boston',
        '3:04'
      ),
    },
  ],
  '2026-10-26': [
    {
      gameId: '0022600091',
      gameCode: '20261026/PHXLAL',
      dateKey: '2026-10-26',
      gameStatus: 2,
      gameStatusText: 'LIVE · Q4 03:42',
      arena: 'Crypto.com Arena · Los Angeles, CA',
      isLeaguePass: true,
      recapDuration: '2:45',
      homeTeam: {
        teamId: 1610612747,
        tricode: 'LAL',
        name: 'Lakers',
        city: 'Los Angeles',
        record: '3-0',
        score: 118,
        primaryColor: '#552583',
        quarterScores: [32, 30, 31, 25],
        leader: {
          name: 'Luka Dončić',
          jerseyNumber: '77',
          position: 'PG',
          teamTricode: 'LAL',
          points: 39,
          rebounds: 9,
          assists: 11,
        },
      },
      awayTeam: {
        teamId: 1610612756,
        tricode: 'PHX',
        name: 'Suns',
        city: 'Phoenix',
        record: '2-1',
        score: 112,
        primaryColor: '#E56020',
        quarterScores: [29, 28, 30, 25],
        leader: {
          name: 'Devin Booker',
          jerseyNumber: '1',
          position: 'SG',
          teamTricode: 'PHX',
          points: 33,
          rebounds: 5,
          assists: 7,
        },
      },
      streams: buildStreamsForMatchup(
        '0022600091',
        'phx-vs-lal',
        'Lakers',
        'Spectrum SportsNet',
        'Suns',
        'Arizona Family Sports',
        '2:45'
      ),
    },
    {
      gameId: '0022600092',
      gameCode: '20261026/DENGSV',
      dateKey: '2026-10-26',
      gameStatus: 2,
      gameStatusText: 'LIVE · Q3 06:18',
      arena: 'Chase Center · San Francisco, CA',
      isLeaguePass: true,
      recapDuration: '2:50',
      homeTeam: {
        teamId: 1610612744,
        tricode: 'GSW',
        name: 'Warriors',
        city: 'Golden State',
        record: '2-1',
        score: 89,
        primaryColor: '#1D428A',
        quarterScores: [31, 33, 25, 0],
        leader: {
          name: 'Stephen Curry',
          jerseyNumber: '30',
          position: 'PG',
          teamTricode: 'GSW',
          points: 28,
          rebounds: 4,
          assists: 8,
        },
      },
      awayTeam: {
        teamId: 1610612743,
        tricode: 'DEN',
        name: 'Nuggets',
        city: 'Denver',
        record: '2-1',
        score: 86,
        primaryColor: '#0E2240',
        quarterScores: [28, 30, 28, 0],
        leader: {
          name: 'Nikola Jokić',
          jerseyNumber: '15',
          position: 'C',
          teamTricode: 'DEN',
          points: 26,
          rebounds: 13,
          assists: 10,
        },
      },
      streams: buildStreamsForMatchup(
        '0022600092',
        'den-vs-gsw',
        'Warriors',
        'NBC Sports Bay Area',
        'Nuggets',
        'Altitude Sports',
        '2:50'
      ),
    },
    {
      gameId: '0022600093',
      gameCode: '20261026/MILMIA',
      dateKey: '2026-10-26',
      gameStatus: 3,
      gameStatusText: 'FINAL',
      arena: 'Kaseya Center · Miami, FL',
      isLeaguePass: true,
      recapDuration: '2:58',
      homeTeam: {
        teamId: 1610612748,
        tricode: 'MIA',
        name: 'Heat',
        city: 'Miami',
        record: '2-1',
        score: 107,
        primaryColor: '#98002E',
        quarterScores: [26, 27, 28, 26],
        leader: {
          name: 'Bam Adebayo',
          jerseyNumber: '13',
          position: 'C',
          teamTricode: 'MIA',
          points: 25,
          rebounds: 12,
          assists: 4,
        },
      },
      awayTeam: {
        teamId: 1610612749,
        tricode: 'MIL',
        name: 'Bucks',
        city: 'Milwaukee',
        record: '2-2',
        score: 111,
        primaryColor: '#00471B',
        quarterScores: [29, 25, 29, 28],
        leader: {
          name: 'Giannis Antetokounmpo',
          jerseyNumber: '34',
          position: 'PF',
          teamTricode: 'MIL',
          points: 36,
          rebounds: 14,
          assists: 7,
        },
      },
      streams: buildStreamsForMatchup(
        '0022600093',
        'mil-vs-mia',
        'Heat',
        'FanDuel Sports Sun',
        'Bucks',
        'FanDuel Sports Wisconsin',
        '2:58'
      ),
    },
    {
      gameId: '0022600094',
      gameCode: '20261026/DALMIN',
      dateKey: '2026-10-26',
      gameStatus: 1,
      gameStatusText: '9:30 PM ET',
      arena: 'Target Center · Minneapolis, MN',
      isLeaguePass: true,
      recapDuration: '2:40',
      homeTeam: {
        teamId: 1610612750,
        tricode: 'MIN',
        name: 'Timberwolves',
        city: 'Minnesota',
        record: '2-1',
        score: 0,
        primaryColor: '#0C2340',
        leader: {
          name: 'Anthony Edwards',
          jerseyNumber: '5',
          position: 'SG',
          teamTricode: 'MIN',
          points: 29,
          rebounds: 6,
          assists: 5,
        },
      },
      awayTeam: {
        teamId: 1610612742,
        tricode: 'DAL',
        name: 'Mavericks',
        city: 'Dallas',
        record: '2-1',
        score: 0,
        primaryColor: '#00538C',
        leader: {
          name: 'Kyrie Irving',
          jerseyNumber: '11',
          position: 'PG',
          teamTricode: 'DAL',
          points: 26,
          rebounds: 5,
          assists: 6,
        },
      },
      streams: buildStreamsForMatchup(
        '0022600094',
        'dal-vs-min',
        'Timberwolves',
        'FanDuel Sports North',
        'Mavericks',
        'KFAA / MavsTV',
        '2:40'
      ),
    },
  ],
};

export async function fetchGamesForDate(dateKey: string): Promise<NbaGame[]> {
  // Return exact curated schedule if matching Oct 25 or Oct 26, or synthesize matchups for other days in the strip
  if (CURATED_GAMES_BY_DATE[dateKey]) {
    // Also merge Oct 25 screenshot matchups onto Oct 26 so the user sees both live games and the exact screenshot games immediately
    if (dateKey === '2026-10-26') {
      return [...CURATED_GAMES_BY_DATE['2026-10-25'], ...CURATED_GAMES_BY_DATE['2026-10-26']];
    }
    return CURATED_GAMES_BY_DATE[dateKey];
  }

  // Synthesize scheduled games for Oct 27 - Oct 31
  const baseGames = CURATED_GAMES_BY_DATE['2026-10-25'];
  return baseGames.map((g, idx) => ({
    ...g,
    gameId: `${g.gameId}-${dateKey.slice(-2)}`,
    dateKey,
    gameStatus: dateKey > '2026-10-26' ? 1 : 3,
    gameStatusText: dateKey > '2026-10-26' ? `${7 + idx}:30 PM ET` : 'FINAL',
  }));
}
