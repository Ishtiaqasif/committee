export type TournamentType = 'round-robin' | 'single elimination' | 'hybrid';

export type Tournament = {
  tournamentName: string;
  tournamentType: TournamentType;
  numberOfTeams: number;
  roundRobinGrouping?: 'all-play-all' | 'grouped';
  teamsPerGroup?: number;
  teamsAdvancing?: number;
  fixtureGeneration: 'random' | 'predefined';
  roundRobinHomeAndAway: boolean;
  knockoutHomeAndAway: boolean;
};

export interface Team {
  id: number;
  name: string;
}

export interface Match {
  match: number;
  team1: { name: string; score: number | null };
  team2: { name: string; score: number | null };
  winner?: string | null;
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
  points: number;
}
