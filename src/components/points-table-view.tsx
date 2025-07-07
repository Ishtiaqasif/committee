
"use client"

import { useMemo, useState } from 'react';
import { Team, PointsTableEntry, Fixture, Score, Group, Round as TournamentRound, Tournament, TiebreakerRule } from '@/types';
import PointsTable from './points-table';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { calculatePointsTable } from '@/lib/calculate-points-table';


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
