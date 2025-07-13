import { calculatePointsTable } from '../calculate-points-table';
import { Team, Round, Score, PointsTableEntry, TiebreakerRule } from '@/types';

// Mock Data
const teams: Team[] = [
  { id: '1', name: 'Team A', ownerId: 'user1', ownerName: 'Owner 1', logo: '', status: 'approved' },
  { id: '2', name: 'Team B', ownerId: 'user2', ownerName: 'Owner 2', logo: '', status: 'approved' },
  { id: '3', name: 'Team C', ownerId: 'user3', ownerName: 'Owner 3', logo: '', status: 'approved' },
  { id: '4', name: 'Team D', ownerId: 'user4', ownerName: 'Owner 4', logo: '', status: 'approved' },
];

const rounds: Round[] = [
  {
    round: 1,
    matches: [
      { match: 1, team1: teams[0], team2: teams[1] },
      { match: 2, team1: teams[2], team2: teams[3] },
    ],
  },
  {
    round: 2,
    matches: [
      { match: 3, team1: teams[0], team2: teams[2] },
      { match: 4, team1: teams[1], team2: teams[3] },
    ],
  },
  {
    round: 3,
    matches: [
      { match: 5, team1: teams[0], team2: teams[3] },
      { match: 6, team1: teams[1], team2: teams[2] },
    ],
  },
];

describe('calculatePointsTable', () => {

  it('should calculate points table correctly for simple wins', () => {
    const scores: Record<string, Score> = {
      'r1m1': { score1: 1, score2: 0, locked: false }, // A wins B
      'r1m2': { score1: 2, score2: 0, locked: false }, // C wins D
      'r2m3': { score1: 3, score2: 0, locked: false }, // A wins C
      'r2m4': { score1: 4, score2: 0, locked: false }, // B wins D
      'r3m5': { score1: 5, score2: 0, locked: false }, // A wins D
      'r3m6': { score1: 6, score2: 0, locked: false }, // B wins C
    };
    
    const table = calculatePointsTable(teams, rounds, scores, false);

    expect(table[0].teamName).toBe('Team A'); // 3 wins, 9 pts
    expect(table[0].points).toBe(9);
    
    expect(table[1].teamName).toBe('Team B'); // 2 wins, 6 pts
    expect(table[1].points).toBe(6);

    expect(table[2].teamName).toBe('Team C'); // 1 win, 3 pts
    expect(table[2].points).toBe(3);

    expect(table[3].teamName).toBe('Team D'); // 0 wins, 0 pts
    expect(table[3].points).toBe(0);
  });

  it('should handle draws correctly', () => {
    const scores: Record<string, Score> = {
      'r1m1': { score1: 1, score2: 1, locked: false }, // A draws B
      'r1m2': { score1: 0, score2: 0, locked: false }, // C draws D
    };

    const table = calculatePointsTable(teams, rounds.slice(0, 1), scores, false);

    expect(table.find(t => t.teamName === 'Team A')?.points).toBe(1);
    expect(table.find(t => t.teamName === 'Team B')?.points).toBe(1);
    expect(table.find(t => t.teamName === 'Team C')?.points).toBe(1);
    expect(table.find(t => t.teamName === 'Team D')?.points).toBe(1);
  });

  it('should sort by goal difference on points tie', () => {
    const scores: Record<string, Score> = {
      // A beats B (2-1), B beats C (1-0), C beats A (1-0) -> All have 3 pts
      'r1m1': { score1: 2, score2: 1, locked: false }, // A vs B
      'r2m4': { score1: 1, score2: 0, locked: false }, // B vs D (irrelevant)
      'r3m6': { score1: 1, score2: 0, locked: false }, // B vs C
      'r2m3': { score1: 0, score2: 1, locked: false }, // A vs C
    };

    const relevantTeams = [teams[0], teams[1], teams[2]];
    const relevantRounds = rounds;

    const table = calculatePointsTable(relevantTeams, relevantRounds, scores, false);
    
    // GD: A= +0 (2-2), B= +0 (2-2), C= +0 (1-1). Should sort by next rule (goalsFor)
    // GF: A=2, B=2, C=1
    expect(table.map(t => t.teamName)).toEqual(['Team A', 'Team B', 'Team C']);
  });

  it('should sort by goals for on goal difference tie', () => {
    const scores: Record<string, Score> = {
      // A wins B 1-0, C wins D 2-0. A & C have 3pts, same GD. C has more GF.
      'r1m1': { score1: 1, score2: 0, locked: false },
      'r1m2': { score1: 2, score2: 0, locked: false },
    };

    const table = calculatePointsTable(teams, rounds.slice(0,1), scores, false);
    
    // C should be first
    expect(table[0].teamName).toBe('Team C');
    expect(table[1].teamName).toBe('Team A');
  });

  it('should handle head-to-head tiebreaker', () => {
    const tiebreakerRules: TiebreakerRule[] = ['headToHead', 'goalDifference', 'goalsFor'];
    const scores: Record<string, Score> = {
        // A and B both win their other games by 1-0. A beats B 2-1.
        // A beats D 1-0
        'r3m5': { score1: 1, score2: 0, locked: false },
        // B beats C 1-0
        'r3m6': { score1: 1, score2: 0, locked: false },
        // A beats B 2-1
        'r1m1': { score1: 2, score2: 1, locked: false },
    };
    const relevantTeams = [teams[0], teams[1]];
    const relevantRounds = rounds;

    // A and B will have same points, same GD, same GF. A should win on H2H.
    const table = calculatePointsTable(relevantTeams, relevantRounds, scores, false, undefined, undefined, tiebreakerRules);
    
    expect(table[0].teamName).toBe('Team A');
    expect(table[1].teamName).toBe('Team B');
  });

  it('should correctly identify qualified teams', () => {
    const scores: Record<string, Score> = {
      'r1m1': { score1: 1, score2: 0, locked: false }, // A wins
      'r1m2': { score1: 1, score2: 0, locked: false }, // C wins
    };
    const table = calculatePointsTable(teams, rounds.slice(0,1), scores, false, 'Group A', 2);
    
    const qualifiedTeams = table.filter(t => t.qualified).map(t => t.teamName);
    expect(qualifiedTeams).toHaveLength(2);
    expect(qualifiedTeams).toContain('Team A');
    expect(qualifiedTeams).toContain('Team C');

    const unqualifiedTeams = table.filter(t => !t.qualified).map(t => t.teamName);
    expect(unqualifiedTeams).toHaveLength(2);
    expect(unqualifiedTeams).toContain('Team B');
    expect(unqualifiedTeams).toContain('Team D');
  });

  it('should not mutate the input arrays', () => {
    const originalTeams = JSON.parse(JSON.stringify(teams));
    const originalRounds = JSON.parse(JSON.stringify(rounds));
    const scores: Record<string, Score> = {
      'r1m1': { score1: 1, score2: 0, locked: false },
    };

    calculatePointsTable(teams, rounds, scores, false);

    expect(teams).toEqual(originalTeams);
    expect(rounds).toEqual(originalRounds);
  });
});
