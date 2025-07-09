
export type TournamentType = 'round-robin' | 'single elimination' | 'hybrid';

export type UserRole = 'owner' | 'admin' | 'participant' | 'guest';

export interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

export type TiebreakerRule = 'goalDifference' | 'goalsFor' | 'headToHead';

export type TournamentCreationData = {
  tournamentName: string;
  tournamentType: TournamentType;
  numberOfTeams: number;
  logo: string;
  isEsports: boolean;
  venues?: string;
  roundRobinGrouping?: 'all-play-all' | 'grouped';
  teamsPerGroup?: number;
  teamsAdvancing?: number;
  fixtureGeneration: 'random' | 'predefined';
  roundRobinHomeAndAway: boolean;
  knockoutHomeAndAway: boolean;
  awayGoalsRule?: boolean;
  tiebreakerRules?: TiebreakerRule[];
  language?: string;
};

export type Tournament = TournamentCreationData & {
  id: string;
  creatorId: string;
  createdAt: any; 
  fixture?: Fixture;
  scores?: Record<string, Score>;
  winner?: { name: string; logo?: string; ownerName?: string };
  activeRound?: number;
  hybridStage?: 'group' | 'qualification-summary' | 'knockout';
  admins?: string[];
  participants?: string[];
  isActive?: boolean;
  // Client-side property
  roles?: UserRole[];
};

export interface Team {
  id: string;
  name: string;
  ownerName: string;
  ownerId: string;
  logo?: string;
}

export interface MatchTeam {
  name: string;
  score: number | null;
  logo?: string;
  ownerName?: string;
  ownerId?: string;
}

export interface Match {
  match: number;
  team1: MatchTeam;
  team2: MatchTeam;
  winner?: string | null;
  venue?: string;
}

export interface Round {
  round: number;
  name?: string;
  matches: Match[];
}

export interface Group {
  groupName: string;
  teams: string[];
  rounds: Round[];
}

export interface Fixture {
  rounds?: Round[];
  groups?: Group[];
  groupStage?: { rounds?: Round[]; groups?: Group[] };
  knockoutStage?: { rounds: Round[] };
}

export interface PointsTableEntry {
  teamName: string;
  played: number;
  won: number;
  lost: number;
  drawn: number;
  goalsFor: number;
  goalsAgainst: number;

  goalDifference: number;
  points: number;
  logo?: string;
  qualified?: boolean;
}

export interface Score {
  score1: number | null;
  score2: number | null;
  score1_tiebreak?: number | null;
  score2_tiebreak?: number | null;
  locked: boolean;
}
