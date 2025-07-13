import { Team, Round as TournamentRound, Score, TiebreakerRule, PointsTableEntry, Match } from '@/types';

export const calculatePointsTable = (teams: Team[], rounds: TournamentRound[], scores: Record<string, Score>, awayGoalsRule: boolean, groupName?: string, teamsToQualify?: number, tiebreakerRules: TiebreakerRule[] = ['goalDifference', 'goalsFor', 'headToHead']): PointsTableEntry[] => {
    const table: Record<string, PointsTableEntry> = teams.reduce((acc, team) => {
      acc[team.name] = { teamName: team.name, played: 0, won: 0, lost: 0, drawn: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0, logo: team.logo };
      return acc;
    }, {} as Record<string, PointsTableEntry>);

    rounds.forEach(round => {
      round.matches.forEach(match => {
        const matchId = groupName 
            ? `g${groupName}r${round.round}m${match.match}`
            : `r${round.round}m${match.match}`;
        const matchScores = scores[matchId];
        
        if (matchScores?.score1 !== null && matchScores?.score2 !== null && matchScores?.score1 !== undefined && matchScores?.score2 !== undefined) {
          const team1Name = match.team1.name;
          const team2Name = match.team2.name;

          if (!table[team1Name] || !table[team2Name]) return;

          const score1 = matchScores.score1;
          const score2 = matchScores.score2;

          table[team1Name].played += 1;
          table[team2Name].played += 1;

          table[team1Name].goalsFor += score1;
          table[team1Name].goalsAgainst += score2;
          table[team2Name].goalsFor += score2;
          table[team2Name].goalsAgainst += score1;

          if (score1 > score2) {
            table[team1Name].won += 1;
            table[team2Name].lost += 1;
          } else if (score2 > score1) {
            table[team2Name].won += 1;
            table[team1Name].lost += 1;
          } else {
            table[team1Name].drawn += 1;
            table[team2Name].drawn += 1;
          }
        }
      });
    });

    Object.values(table).forEach(entry => {
      entry.points = entry.won * 3 + entry.drawn * 1;
      entry.goalDifference = entry.goalsFor - entry.goalsAgainst;
    });

    const sortedTable = Object.values(table).sort((a, b) => {
        if (a.points !== b.points) {
            return b.points - a.points;
        }
        for (const rule of tiebreakerRules) {
            if (rule === 'goalDifference') {
                if (a.goalDifference !== b.goalDifference) {
                    return b.goalDifference - a.goalDifference;
                }
            } else if (rule === 'goalsFor') {
                if (a.goalsFor !== b.goalsFor) {
                    return b.goalsFor - a.goalsFor;
                }
            } else if (rule === 'headToHead') {
                const allMatchesWithRound: (Match & { roundNumber: number })[] = rounds.flatMap(r => r.matches.map(m => ({ ...m, roundNumber: r.round })));
                const h2hMatches = allMatchesWithRound.filter(
                    m => (m.team1.name === a.teamName && m.team2.name === b.teamName) || (m.team1.name === b.teamName && m.team2.name === a.teamName)
                );

                if (h2hMatches.length > 0) {
                    let a_aggregate_score = 0;
                    let b_aggregate_score = 0;
                    let a_away_goals = 0;
                    let b_away_goals = 0;

                    h2hMatches.forEach(match => {
                        const matchId = groupName
                           ? `g${groupName}r${match.roundNumber}m${match.match}`
                           : `r${match.roundNumber}m${match.match}`;
                       const score = scores[matchId];

                       if (score && score.score1 !== null && score.score2 !== null) {
                           if (match.team1.name === a.teamName) { // a is home
                               a_aggregate_score += score.score1;
                               b_aggregate_score += score.score2;
                               b_away_goals += score.score2;
                           } else { // b is home
                               b_aggregate_score += score.score1;
                               a_aggregate_score += score.score2;
                               a_away_goals += score.score2;
                           }
                       }
                    });

                    if (a_aggregate_score !== b_aggregate_score) {
                        return b_aggregate_score - a_aggregate_score;
                    }
                    
                    if (awayGoalsRule && a_away_goals !== b_away_goals) {
                        return b_away_goals - a_away_goals;
                    }
                }
            }
        }
        return a.teamName.localeCompare(b.teamName);
    });

    if (teamsToQualify && teamsToQualify > 0) {
        return sortedTable.map((entry, index) => ({
            ...entry,
            qualified: index < teamsToQualify
        }));
    }

    return sortedTable;
}
