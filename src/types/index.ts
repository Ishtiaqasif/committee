export type TournamentType = 'round-robin' | 'single elimination' | 'hybrid';

export type TournamentCreationData = {
  tournamentName: string;
  tournamentType: TournamentType;
  numberOfTeams: number;
  isEsports: boolean;
  venues?: string;
  roundRobinGrouping?: 'all-play-all' | 'grouped';
  teamsPerGroup?: number;
  teamsAdvancing?: number;
  fixtureGeneration: 'random' | 'predefined';
  roundRobinHomeAndAway: boolean;
  knockoutHomeAndAway: boolean;
};

export type Tournament = TournamentCreationData & {
  id: string;
  creatorId: string;
  createdAt: any; 
};

export interface Team {
  id: string;
  name: string;
  logo?: string;
}

export interface Match {
  match: number;
  team1: { name:string; score: number | null; logo?: string; };
  team2: { name: string; score: number | null; logo?: string; };
  winner?: string | null;
  venue?: string;
}

export interface Round {
  round: number;
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
  locked: boolean;
}
