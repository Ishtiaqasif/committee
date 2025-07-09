
"use client"

import { useMemo, useTransition } from 'react';
import { Fixture, Team, Score, Tournament } from '@/types';
import { calculatePointsTable } from '@/lib/calculate-points-table';
import PointsTable from './points-table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { ArrowRight, Trophy, Loader } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";


interface QualificationSummaryViewProps {
  groupStage: Fixture['groupStage'];
  teams: Team[];
  scores: Record<string, Score>;
  tournament: Tournament;
  onProceed: () => void;
  isPrivilegedUser: boolean;
}

export default function QualificationSummaryView({ groupStage, teams, scores, tournament, onProceed, isPrivilegedUser }: QualificationSummaryViewProps) {
  const [isProceeding, startProceeding] = useTransition();

  const { tables, teamsAdvancingPerGroup } = useMemo(() => {
    if (!groupStage?.groups) {
      return { tables: [], teamsAdvancingPerGroup: 0 };
    }
    
    const numGroups = groupStage.groups.length;
    const teamsAdvancing = tournament.teamsAdvancing ?? 0;
    const teamsPerGroup = Math.floor(teamsAdvancing / numGroups);
    const tiebreakerRules = tournament.tiebreakerRules || ['goalDifference', 'goalsFor'];
    const awayGoalsRule = tournament.awayGoalsRule ?? false;

    const calculatedTables = groupStage.groups.map(group => {
      const groupTeams = group.teams.map(name => teams.find(t => t.name === name)!).filter(Boolean) as Team[];
      return {
        title: group.groupName,
        table: calculatePointsTable(groupTeams, group.rounds, scores, awayGoalsRule, group.groupName, teamsPerGroup, tiebreakerRules)
      }
    });

    return { tables: calculatedTables, teamsAdvancingPerGroup: teamsPerGroup };

  }, [groupStage, teams, scores, tournament]);
  
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
            {isPrivilegedUser ? (
              <>
                <Button size="lg" onClick={() => startProceeding(onProceed)} disabled={isProceeding}>
                    {isProceeding && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                    Generate Knockout Fixture <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <p className="text-sm text-muted-foreground mt-2">
                    The knockout bracket will be generated based on these standings.
                </p>
              </>
            ) : (
               <p className="text-sm text-muted-foreground mt-2">
                  Waiting for the tournament owner or an admin to generate the knockout fixture.
              </p>
            )}
        </div>
      </CardContent>
    </Card>
  );
}
