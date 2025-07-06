"use client"

import { useMemo } from 'react';
import type { Fixture, Team, Score, Tournament } from '@/types';
import { calculatePointsTable } from './points-table-view';
import PointsTable from './points-table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { ArrowRight, Trophy } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";


interface QualificationSummaryViewProps {
  groupStage: Fixture['groupStage'];
  teams: Team[];
  scores: Record<string, Score>;
  tournament: Tournament;
  onProceed: () => void;
}

export default function QualificationSummaryView({ groupStage, teams, scores, tournament, onProceed }: QualificationSummaryViewProps) {
  const { tables, teamsAdvancingPerGroup } = useMemo(() => {
    if (!groupStage?.groups) {
      return { tables: [], teamsAdvancingPerGroup: 0 };
    }
    
    const numGroups = groupStage.groups.length;
    const teamsAdvancing = tournament.teamsAdvancing ?? 0;
    const teamsPerGroup = Math.floor(teamsAdvancing / numGroups);

    const calculatedTables = groupStage.groups.map(group => {
      const groupTeams = group.teams.map(name => teams.find(t => t.name === name)!).filter(Boolean) as Team[];
      return {
        title: group.groupName,
        table: calculatePointsTable(groupTeams, group.rounds, scores, group.groupName, teamsPerGroup)
      }
    });

    return { tables: calculatedTables, teamsAdvancingPerGroup: teamsPerGroup };

  }, [groupStage, teams, scores, tournament.teamsAdvancing]);
  
  if (!groupStage?.groups) {
      return (
        <Alert variant="destructive">
          <AlertTitle>Configuration Error</AlertTitle>
          <AlertDescription>
            Automatic knockout progression is only supported for hybrid tournaments with a grouped round-robin stage.
          </AlertDescription>
        </Alert>
      );
  }

  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="text-center">
        <div className="mx-auto bg-accent text-accent-foreground rounded-full p-3 w-fit mb-4">
            <Trophy className="h-8 w-8" />
        </div>
        <CardTitle>Group Stage Complete</CardTitle>
        <CardDescription>
            The group stage has concluded. The top {teamsAdvancingPerGroup} {teamsAdvancingPerGroup === 1 ? 'team' : 'teams'} from each group (highlighted below) will advance to the knockout stage.
        </CardDescription>
      </CardHeader>
      <CardContent>
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {tables.map(t => (
                <PointsTable key={t.title} title={t.title} table={t.table} viewMode={'full'}/>
            ))}
        </div>
        <div className="text-center">
            <Button size="lg" onClick={onProceed}>
                Generate Knockout Fixture <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <p className="text-sm text-muted-foreground mt-2">
                The knockout bracket will be generated based on these standings.
            </p>
        </div>
      </CardContent>
    </Card>
  );
}
