export type NbaStreamFeedType = 'home' | 'away' | 'mobile' | 'recap';

export interface NbaStreamFeed {
  id: NbaStreamFeedType;
  label: string;
  sublabel: string;
  broadcaster: string;
  language: string;
  resolution: string;
  isZoomedMobileView?: boolean;
  isCameraZoomed?: boolean;
  durationLabel?: string;
  inAppWatchPath: string;
  videoUrl?: string;
  hlsUrl?: string;
  fallbackVideoUrl?: string;
}

export interface NbaPlayerLeader {
  playerId?: string;
  name: string;
  jerseyNumber: string;
  position: string;
  teamTricode: string;
  points: number;
  rebounds: number;
  assists: number;
}

export interface NbaTeamInfo {
  teamId: number;
  tricode: string;
  name: string;
  city: string;
  record: string;
  score: number;
  primaryColor: string;
  secondaryColor?: string;
  leader: NbaPlayerLeader;
  quarterScores?: number[];
}

export type NbaGameStatus = 1 | 2 | 3; // 1 = Scheduled, 2 = Live, 3 = Final

export interface NbaGame {
  gameId: string;
  gameCode: string;
  dateKey: string; // e.g. '2026-10-25'
  gameStatus: NbaGameStatus;
  gameStatusText: string; // e.g. 'FINAL', 'Q4 02:14', '7:30 PM ET'
  period?: number;
  gameClock?: string;
  arena: string;
  awayTeam: NbaTeamInfo;
  homeTeam: NbaTeamInfo;
  isLeaguePass: boolean;
  nationalBroadcast?: string;
  nationalBroadcaster?: string;
  recapDuration?: string;
  streams: NbaStreamFeed[];
}

export interface NbaDateOption {
  dateKey: string;
  dayOfWeek: string;
  dayNumber: string;
  monthLabel: string;
  isToday?: boolean;
}

export interface NbaUserSession {
  isSignedIn: boolean;
  email: string;
  displayName: string;
  subscriptionTier: string;
  favoriteTeams?: string[]; // array of tricodes, e.g. ['LAL']
  lastSignInAt?: string;
  lastLoginAt?: number;
}
