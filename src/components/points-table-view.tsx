
"use client"

import { useMemo, useState } from 'react';
import { Team, PointsTableEntry, Fixture, Score, Group, Round as TournamentRound, Tournament, TiebreakerRule, Match } from '@/types';
import PointsTable from './points-table';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

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


interface PointsTableViewProps {
  fixture: Fixture;
  teams: Team[];
  scores: Record<string, Score>;
  tournament: Tournament;
  currentUserId?: string;
}

export default function PointsTableView({ fixture, teams, scores, tournament, currentUserId }: PointsTableViewProps) {
  const [viewMode, setViewMode] = useState<'short' | 'full'>('full');
  const userTeam = useMemo(() => teams.find(t => t.ownerId === currentUserId), [teams, currentUserId]);
  
  const tables = useMemo(() => {
    const { tournamentType, teamsAdvancing, tiebreakerRules = ['goalDifference', 'goalsFor', 'headToHead'], awayGoalsRule = false } = tournament;
    let fixtureForTable: { rounds?: TournamentRound[]; groups?: Group[] } | undefined = fixture;

    if (tournamentType === 'hybrid' && fixture.groupStage) {
        fixtureForTable = fixture.groupStage;
    }

    if (fixtureForTable?.groups) {
      const numGroups = fixtureForTable.groups.length;
      const teamsToQualify = (tournamentType === 'hybrid' && teamsAdvancing && numGroups > 0)
        ? Math.floor(teamsAdvancing / numGroups)
        : 0;

      return fixtureForTable.groups.map(group => {
        const groupTeams = group.teams.map(name => teams.find(t => t.name === name)!).filter(Boolean) as Team[];
        return {
          title: group.groupName,
          table: calculatePointsTable(groupTeams, group.rounds, scores, awayGoalsRule, group.groupName, teamsToQualify, tiebreakerRules)
        }
      });
    }

    if (fixtureForTable?.rounds && tournamentType === 'round-robin') {
      return [{
        title: "Overall Standings",
        table: calculatePointsTable(teams, fixtureForTable.rounds, scores, awayGoalsRule, undefined, undefined, tiebreakerRules)
      }]
    }

    return [];
  }, [fixture, teams, scores, tournament]);

  if (tables.length === 0) {
    return (
        <div>
            <h2 className="text-3xl font-bold text-primary">Points Table</h2>
            <p className="text-muted-foreground mt-4">
                Points tables are available for round-robin and hybrid tournaments once a fixture is generated.
            </p>
        </div>
    );
  }

  return (
    <div>
        <div className="flex justify-between items-center mb-6">
            <div>
                <h2 className="text-3xl font-bold text-primary">Points Table</h2>
                <p className="text-muted-foreground">Live standings for the tournament. Highlighted teams may advance to the next stage.</p>
            </div>
            <div className="flex items-center space-x-2">
                <Switch
                    id="view-mode-switch"
                    checked={viewMode === 'full'}
                    onCheckedChange={(checked) => setViewMode(checked ? 'full' : 'short')}
                />
                <Label htmlFor="view-mode-switch">Full Table</Label>
            </div>
        </div>
        <div className="grid grid-cols-1 gap-8">
            {tables.map(t => (
                <PointsTable key={t.title} title={t.title} table={t.table} viewMode={viewMode} userTeamName={userTeam?.name} />
            ))}
        </div>
    </div>
  );
}
