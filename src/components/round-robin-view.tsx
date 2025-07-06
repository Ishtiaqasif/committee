"use client"

import { useMemo } from 'react';
import type { Team, PointsTableEntry, Match, Round, Group, Score } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dices, MapPin, Lock } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import ScoreEntryDialog from './score-entry-dialog';


interface RoundRobinViewProps {
  fixture: { rounds?: Round[], groups?: Group[] };
  teams: Team[];
  scores: Record<string, Score>;
  onScoreUpdate: (matchIdentifier: string, newScore: Score) => void;
}

const GroupedRoundRobinView = ({ group, scores, onScoreUpdate }: { group: Group, scores: RoundRobinViewProps['scores'], onScoreUpdate: RoundRobinViewProps['onScoreUpdate']}) => {
  const groupTeams = useMemo(() => group.teams.map(name => ({ name })), [group.teams]);

  const pointsTable = useMemo(() => {
    const table: Record<string, PointsTableEntry> = groupTeams.reduce((acc, team) => {
      acc[team.name] = { teamName: team.name, played: 0, won: 0, lost: 0, drawn: 0, points: 0 };
      return acc;
    }, {} as Record<string, PointsTableEntry>);

    group.rounds.forEach(round => {
      round.matches.forEach(match => {
        const matchScores = scores[`r${round.round}m${match.match}`];
        if (matchScores?.score1 !== null && matchScores?.score2 !== null && matchScores?.score1 !== undefined && matchScores?.score2 !== undefined) {
          const team1Name = match.team1.name;
          const team2Name = match.team2.name;
          const score1 = matchScores.score1;
          const score2 = matchScores.score2;

          if(table[team1Name]) table[team1Name].played += 1;
          if(table[team2Name]) table[team2Name].played += 1;

          if (score1 > score2) {
            if(table[team1Name]) table[team1Name].won += 1;
            if(table[team2Name]) table[team2Name].lost += 1;
          } else if (score2 > score1) {
            if(table[team2Name]) table[team2Name].won += 1;
            if(table[team1Name]) table[team1Name].lost += 1;
          } else {
            if(table[team1Name]) table[team1Name].drawn += 1;
            if(table[team2Name]) table[team2Name].drawn += 1;
          }
        }
      });
    });

    Object.values(table).forEach(entry => {
      entry.points = entry.won * 3 + entry.drawn * 1;
    });

    return Object.values(table).sort((a, b) => b.points - a.points || (b.won - a.won));
  }, [scores, groupTeams, group]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-6">
        {group.rounds.map((round, roundIndex) => (
          <Card key={`round-${round.round}-${roundIndex}`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Dices className="text-accent"/> Round {round.round}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {round.matches.map((match) => {
                  const matchId = `r${round.round}m${match.match}`;
                  const score = scores[matchId];
                  return (
                  <div key={matchId} className="p-3 rounded-lg bg-secondary/50">
                    <div className="flex items-center justify-between">
                        <span className="w-1/3 text-right font-medium">{match.team1.name}</span>
                        <div className="flex items-center gap-2 mx-4 font-semibold text-lg">
                            <span>{score?.score1 ?? '-'}</span>
                            <span>vs</span>
                            <span>{score?.score2 ?? '-'}</span>
                        </div>
                        <span className="w-1/3 text-left font-medium">{match.team2.name}</span>
                    </div>
                    <div className="flex items-center justify-center gap-4 mt-2">
                        <ScoreEntryDialog
                            match={match}
                            currentScore={score}
                            onScoreSave={(newScore) => onScoreUpdate(matchId, newScore)}
                        >
                            <Button variant="outline" size="sm" disabled={score?.locked}>
                                {score?.score1 !== null ? 'Edit Score' : 'Enter Score'}
                            </Button>
                        </ScoreEntryDialog>
                        {score?.locked && <Lock className="h-4 w-4 text-muted-foreground" />}
                    </div>
                     {match.venue && (
                        <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground mt-2">
                            <MapPin className="h-3 w-3" />
                            <span>{match.venue}</span>
                        </div>
                    )}
                  </div>
                )})}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div>
        <Card>
          <CardHeader>
            <CardTitle>Points Table</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Team</TableHead>
                  <TableHead>P</TableHead>
                  <TableHead>W</TableHead>
                  <TableHead>D</TableHead>
                  <TableHead>L</TableHead>
                  <TableHead>Pts</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pointsTable.map(entry => (
                  <TableRow key={entry.teamName}>
                    <TableCell className="font-medium">{entry.teamName}</TableCell>
                    <TableCell>{entry.played}</TableCell>
                    <TableCell>{entry.won}</TableCell>
                    <TableCell>{entry.drawn}</TableCell>
                    <TableCell>{entry.lost}</TableCell>
                    <TableCell className="font-bold">{entry.points}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


export default function RoundRobinView({ fixture, teams, scores, onScoreUpdate }: RoundRobinViewProps) {
  if (fixture.groups && fixture.groups.length > 0) {
    return (
       <Tabs defaultValue={fixture.groups[0].groupName} className="w-full">
        <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${fixture.groups.length}, minmax(0, 1fr))` }}>
          {fixture.groups.map(group => (
            <TabsTrigger key={group.groupName} value={group.groupName}>{group.groupName}</TabsTrigger>
          ))}
        </TabsList>
        {fixture.groups.map(group => (
          <TabsContent key={group.groupName} value={group.groupName} className="mt-6">
            <GroupedRoundRobinView group={group} scores={scores} onScoreUpdate={onScoreUpdate} />
          </TabsContent>
        ))}
      </Tabs>
    )
  }
  
  const allRounds = fixture.rounds || [];

  const pointsTable = useMemo(() => {
    const table: Record<string, PointsTableEntry> = teams.reduce((acc, team) => {
      acc[team.name] = { teamName: team.name, played: 0, won: 0, lost: 0, drawn: 0, points: 0 };
      return acc;
    }, {} as Record<string, PointsTableEntry>);

    allRounds.forEach(round => {
      round.matches.forEach(match => {
        const matchScores = scores[`r${round.round}m${match.match}`];
        if (matchScores?.score1 !== null && matchScores?.score2 !== null && matchScores?.score1 !== undefined && matchScores?.score2 !== undefined) {
          const team1Name = match.team1.name;
          const team2Name = match.team2.name;
          const score1 = matchScores.score1;
          const score2 = matchScores.score2;

          if(table[team1Name]) {
            table[team1Name].played += 1;
          }
          if(table[team2Name]) {
            table[team2Name].played += 1;
          }

          if (score1 > score2) {
            if(table[team1Name]) table[team1Name].won += 1;
            if(table[team2Name]) table[team2Name].lost += 1;
          } else if (score2 > score1) {
            if(table[team2Name]) table[team2Name].won += 1;
            if(table[team1Name]) table[team1Name].lost += 1;
          } else {
            if(table[team1Name]) table[team1Name].drawn += 1;
            if(table[team2Name]) table[team2Name].drawn += 1;
          }
        }
      });
    });

    Object.values(table).forEach(entry => {
      entry.points = entry.won * 3 + entry.drawn * 1;
    });

    return Object.values(table).sort((a, b) => b.points - a.points || (b.won - a.won));
  }, [scores, teams, allRounds]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-6">
        {allRounds.map((round, roundIndex) => (
          <Card key={`round-${round.round}-${roundIndex}`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Dices className="text-accent"/> Round {round.round}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {round.matches.map((match) => {
                  const matchId = `r${round.round}m${match.match}`;
                  const score = scores[matchId];
                  return (
                  <div key={matchId} className="p-3 rounded-lg bg-secondary/50">
                    <div className="flex items-center justify-between">
                        <span className="w-1/3 text-right font-medium">{match.team1.name}</span>
                        <div className="flex items-center gap-2 mx-4 font-semibold text-lg">
                            <span>{score?.score1 ?? '-'}</span>
                            <span>vs</span>
                            <span>{score?.score2 ?? '-'}</span>
                        </div>
                        <span className="w-1/3 text-left font-medium">{match.team2.name}</span>
                    </div>
                     <div className="flex items-center justify-center gap-4 mt-2">
                        <ScoreEntryDialog
                            match={match}
                            currentScore={score}
                            onScoreSave={(newScore) => onScoreUpdate(matchId, newScore)}
                        >
                            <Button variant="outline" size="sm" disabled={score?.locked}>
                                {score?.score1 !== null ? 'Edit Score' : 'Enter Score'}
                            </Button>
                        </ScoreEntryDialog>
                        {score?.locked && <Lock className="h-4 w-4 text-muted-foreground" />}
                    </div>
                     {match.venue && (
                        <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground mt-2">
                            <MapPin className="h-3 w-3" />
                            <span>{match.venue}</span>
                        </div>
                    )}
                  </div>
                )})}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div>
        <Card>
          <CardHeader>
            <CardTitle>Points Table</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Team</TableHead>
                  <TableHead>P</TableHead>
                  <TableHead>W</TableHead>
                  <TableHead>D</TableHead>
                  <TableHead>L</TableHead>
                  <TableHead>Pts</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pointsTable.map(entry => (
                  <TableRow key={entry.teamName}>
                    <TableCell className="font-medium">{entry.teamName}</TableCell>
                    <TableCell>{entry.played}</TableCell>
                    <TableCell>{entry.won}</TableCell>
                    <TableCell>{entry.drawn}</TableCell>
                    <TableCell>{entry.lost}</TableCell>
                    <TableCell className="font-bold">{entry.points}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
