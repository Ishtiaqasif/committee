export type TournamentType = 'round-robin' | 'single elimination' | 'hybrid';

export type Tournament = {
  tournamentName: string;
  tournamentType: TournamentType;
  numberOfTeams: number;
};

export interface Team {
  id: number;
  name: string;
}

export interface Match {
  round: number;
  match: number;
  team1: { name: string; score: number | null };
  team2: { name: string; score: number | null };
  winner?: string | null;
}

export interface Round {
  round: number;
  matches: Match[];
}

export interface Fixture {
  rounds?: Round[];
  groupStage?: { rounds: Round[] };
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
