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
      { match: 1, team1: { name: 'Team A' }, team2: { name: 'Team B' } },
      { match: 2, team1: { name: 'Team C' }, team2: { name: 'Team D' } },
    ],
  },
  {
    round: 2,
    matches: [
      { match: 3, team1: { name: 'Team A' }, team2: { name: 'Team C' } },
      { match: 4, team1: { name: 'Team B' }, team2: { name: 'Team D' } },
    ],
  },
  {
    round: 3,
    matches: [
      { match: 5, team1: { name: 'Team A' }, team2: { name: 'Team D' } },
      { match: 6, team1: { name: 'Team B' }, team2: { name: 'Team C' } },
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
        // A beats B 2-0. C beats D 1-0. Both have 3 points. A has better GD.
      'r1m1': { score1: 2, score2: 0, locked: false },
      'r1m2': { score1: 1, score2: 0, locked: false },
    };
    const table = calculatePointsTable(teams, rounds.slice(0,1), scores, false, 'GroupA');
    expect(table.map(t => t.teamName)).toEqual(['Team A', 'Team C', 'Team D', 'Team B']);
    expect(table[0].teamName).toBe('Team A');
    expect(table[0].goalDifference).toBe(2);
    expect(table[1].teamName).toBe('Team C');
    expect(table[1].goalDifference).toBe(1);
  });

  it('should sort by goals for on goal difference tie', () => {
    const scores: Record<string, Score> = {
      // A wins B 1-0 (+1 GD), C wins D 2-1 (+1 GD). A & C have 3pts, same GD. C has more GF.
      'r1m1': { score1: 1, score2: 0, locked: false },
      'r1m2': { score1: 2, score2: 1, locked: false },
    };

    const table = calculatePointsTable(teams, rounds.slice(0,1), scores, false);
    
    // C should be first
    expect(table[0].teamName).toBe('Team C');
    expect(table[1].teamName).toBe('Team A');
  });

  it('should handle head-to-head tiebreaker with aggregate score', () => {
    const tiebreakerRules: TiebreakerRule[] = ['headToHead', 'goalDifference', 'goalsFor'];
    const scores: Record<string, Score> = {
        // A and B both have 6 points, GD of +1, and GF of 2.
        // A beat C 1-0. B beat C 1-0
        // A beat B 2-1
        'r1m1': { score1: 2, score2: 1, locked: false }, // A vs B
        'r2m3': { score1: 1, score2: 0, locked: false }, // A vs C
        'r3m6': { score1: 1, score2: 0, locked: false }, // B vs C
    };
    
    const table = calculatePointsTable([teams[0], teams[1], teams[2]], rounds, scores, false, undefined, undefined, tiebreakerRules);
    
    expect(table[0].teamName).toBe('Team A');
    expect(table[1].teamName).toBe('Team B');
  });

  it('should handle head-to-head with away goals rule', () => {
    const tiebreakerRules: TiebreakerRule[] = ['headToHead', 'goalDifference', 'goalsFor'];
     const twoLegRounds: Round[] = [
      { round: 1, matches: [{ match: 1, team1: { name: 'Team A' }, team2: { name: 'Team B' } }] }, // A hosts
      { round: 2, matches: [{ match: 2, team1: { name: 'Team B' }, team2: { name: 'Team A' } }] }, // B hosts
    ];
    const scores: Record<string, Score> = {
        // Aggregate is 3-3. A scored 2 away goals, B scored 1. A should win.
        'r1m1': { score1: 1, score2: 2, locked: false }, // A 1-2 B
        'r2m2': { score1: 1, score2: 2, locked: false }, // B 1-2 A
    };
     const table = calculatePointsTable([teams[0], teams[1]], twoLegRounds, scores, true, undefined, undefined, tiebreakerRules);
     // Since they both have one win and one loss, they are tied on points. H2H should decide.
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

  it('should handle bye matches correctly', () => {
    const roundsWithBye: Round[] = [{
      round: 1,
      matches: [
        { match: 1, team1: { name: 'Team A' }, team2: { name: 'Bye' } },
        { match: 2, team1: { name: 'Team B' }, team2: { name: 'Team C' } }
      ]
    }];
    const scores: Record<string, Score> = {
      'r1m2': { score1: 2, score2: 1, locked: false } // B beats C
    };
    
    const table = calculatePointsTable([teams[0], teams[1], teams[2]], roundsWithBye, scores, false);

    const teamA = table.find(t => t.teamName === 'Team A')!;
    const teamB = table.find(t => t.teamName === 'Team B')!;
    const teamC = table.find(t => t.teamName === 'Team C')!;

    expect(teamA.played).toBe(0);
    expect(teamA.points).toBe(0);
    expect(teamB.played).toBe(1);
    expect(teamB.points).toBe(3);
    expect(teamC.played).toBe(1);
    expect(teamC.points).toBe(0);
  });
  
  it('should handle unscored matches correctly', () => {
    const scores: Record<string, Score> = {
      // Only one match scored
      'r1m1': { score1: 1, score2: 0, locked: false } // A beats B
    };
    const table = calculatePointsTable(teams, rounds.slice(0,1), scores, false);
    
    const teamA = table.find(t => t.teamName === 'Team A')!;
    const teamB = table.find(t => t.teamName === 'Team B')!;
    const teamC = table.find(t => t.teamName === 'Team C')!;
    const teamD = table.find(t => t.teamName === 'Team D')!;

    expect(teamA.played).toBe(1);
    expect(teamA.points).toBe(3);
    expect(teamB.played).toBe(1);
    expect(teamB.points).toBe(0);
    // C and D haven't played
    expect(teamC.played).toBe(0);
    expect(teamC.points).toBe(0);
    expect(teamD.played).toBe(0);
    expect(teamD.points).toBe(0);
  });
  
  it('should handle match IDs with group names', () => {
    const scores: Record<string, Score> = {
      'gGroupAr1m1': { score1: 5, score2: 0, locked: false }, // A wins B in Group A
    };
    const table = calculatePointsTable([teams[0], teams[1]], rounds.slice(0,1), scores, false, 'GroupA');
    
    const teamA = table.find(t => t.teamName === 'Team A')!;
    const teamB = table.find(t => t.teamName === 'Team B')!;

    expect(teamA.played).toBe(1);
    expect(teamA.points).toBe(3);
    expect(teamB.played).toBe(1);
    expect(teamB.points).toBe(0);
  });
  
  it('should use alphabetical sort as final tie-breaker', () => {
    const tiebreakerRules: TiebreakerRule[] = ['goalDifference', 'goalsFor', 'headToHead'];
    // Two teams, complete mirror match
    const newTeams = [
        { id: '1', name: 'Z-Team', ownerId: 'user1', ownerName: 'Owner 1', logo: '', status: 'approved' },
        { id: '2', name: 'A-Team', ownerId: 'user2', ownerName: 'Owner 2', logo: '', status: 'approved' },
    ];
    const twoLegRounds: Round[] = [
      { round: 1, matches: [{ match: 1, team1: { name: 'A-Team' }, team2: { name: 'Z-Team' } }] },
    ];
    const scores: Record<string, Score> = {
        'r1m1': { score1: 1, score2: 1, locked: false }, // A-Team draws Z-Team
    };
     const table = calculatePointsTable(newTeams, twoLegRounds, scores, false, undefined, undefined, tiebreakerRules);
     
     // All stats are equal, so A-Team should come before Z-Team alphabetically
     expect(table.map(t => t.teamName)).toEqual(['A-Team', 'Z-Team']);
  });
});
