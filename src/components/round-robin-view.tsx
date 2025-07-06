"use client"

import { useMemo } from 'react';
import type { Team, PointsTableEntry, Match, Round } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dices } from 'lucide-react';

interface RoundRobinViewProps {
  fixture: { rounds: Round[] };
  teams: Team[];
  scores: Record<string, { score1: number | null, score2: number | null }>;
  onScoreChange: (matchIdentifier: string, team1Score: number | null, team2Score: number | null) => void;
}

export default function RoundRobinView({ fixture, teams, scores, onScoreChange }: RoundRobinViewProps) {
    const pointsTable = useMemo(() => {
    const table: Record<string, PointsTableEntry> = teams.reduce((acc, team) => {
      acc[team.name] = { teamName: team.name, played: 0, won: 0, lost: 0, drawn: 0, points: 0 };
      return acc;
    }, {} as Record<string, PointsTableEntry>);

    fixture.rounds.forEach(round => {
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
  }, [scores, teams, fixture]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-6">
        {fixture.rounds.map((round, roundIndex) => (
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
                  return (
                  <div key={matchId} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                     <span className="w-1/3 text-right font-medium">{match.team1.name}</span>
                      <div className="flex items-center gap-2 mx-4">
                          <Input
                            type="number"
                            className="w-16 text-center"
                            placeholder="-"
                            min="0"
                            value={scores[matchId]?.score1 ?? ''}
                            onChange={(e) => onScoreChange(matchId, e.target.value === '' ? null : Number(e.target.value), scores[matchId]?.score2 ?? null)}
                           />
                          <span>vs</span>
                          <Input
                            type="number"
                            className="w-16 text-center"
                            placeholder="-"
                             min="0"
                            value={scores[matchId]?.score2 ?? ''}
                            onChange={(e) => onScoreChange(matchId, scores[matchId]?.score1 ?? null, e.target.value === '' ? null : Number(e.target.value))}
                          />
                      </div>
                      <span className="w-1/3 text-left font-medium">{match.team2.name}</span>
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
