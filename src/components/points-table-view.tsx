"use client"

import { useMemo, useState } from 'react';
import type { Team, PointsTableEntry, Fixture, Score, Group, Round as TournamentRound } from '@/types';
import PointsTable from './points-table';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface PointsTableViewProps {
  fixture: Fixture;
  teams: Team[];
  scores: Record<string, Score>;
  tournamentType: string;
}

export const calculatePointsTable = (teams: Team[], rounds: TournamentRound[], scores: Record<string, Score>, groupName?: string, teamsToQualify?: number): PointsTableEntry[] => {
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

    const sortedTable = Object.values(table).sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor);

    if (teamsToQualify && teamsToQualify > 0) {
        return sortedTable.map((entry, index) => ({
            ...entry,
            qualified: index < teamsToQualify
        }));
    }

    return sortedTable;
}


export default function PointsTableView({ fixture, teams, scores, tournamentType }: PointsTableViewProps) {
  const [viewMode, setViewMode] = useState<'short' | 'full'>('short');
  
  const tables = useMemo(() => {
    let fixtureForTable: { rounds?: TournamentRound[]; groups?: Group[] } | undefined = fixture;
    if (tournamentType === 'hybrid' && fixture.groupStage) {
        fixtureForTable = fixture.groupStage;
    }

    if (fixtureForTable?.groups) {
      return fixtureForTable.groups.map(group => {
        const groupTeams = group.teams.map(name => teams.find(t => t.name === name)!).filter(Boolean) as Team[];
        return {
          title: group.groupName,
          table: calculatePointsTable(groupTeams, group.rounds, scores, group.groupName)
        }
      });
    }

    if (fixtureForTable?.rounds && tournamentType === 'round-robin') {
      return [{
        title: "Overall Standings",
        table: calculatePointsTable(teams, fixtureForTable.rounds, scores)
      }]
    }

    return [];
  }, [fixture, teams, scores, tournamentType]);

  if (tables.length === 0) {
    return (
        <div>
            <h2 className="text-3xl font-bold text-primary">Points Table</h2>
            <p className="text-muted-foreground mt-4">
                Points tables are only available for round-robin and hybrid tournaments.
            </p>
        </div>
    );
  }

  return (
    <div>
        <div className="flex justify-between items-center mb-6">
            <div>
                <h2 className="text-3xl font-bold text-primary">Points Table</h2>
                <p className="text-muted-foreground">Live standings for the tournament.</p>
            </div>
            <div className="flex items-center space-x-2">
                <Switch
                    id="view-mode-switch"
                    checked={viewMode === 'full'}
                    onCheckedChange={(checked) => setViewMode(checked ? 'full' : 'short')}
                />
                <Label htmlFor="view-mode-switch">Show Full Table</Label>
            </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {tables.map(t => (
                <PointsTable key={t.title} title={t.title} table={t.table} viewMode={viewMode}/>
            ))}
        </div>
    </div>
  );
}
