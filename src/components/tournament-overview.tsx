
"use client";

import { useMemo } from 'react';
import type { Tournament, Fixture, Score, Team, Round } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Flame, Swords, CheckCircle, ListTodo } from 'lucide-react';

interface TournamentOverviewProps {
  tournament: Tournament;
  fixture: Fixture;
  scores: Record<string, Score>;
  teams: Team[];
}

const getAllMatches = (fixture: Fixture): { id: string, roundName: string }[] => {
    const allMatches: { id: string, roundName: string }[] = [];
    
    const processRounds = (rounds: Round[], groupName?: string) => {
        rounds.forEach(round => {
            round.matches.forEach(match => {
                if (match.team1.name.toLowerCase() !== 'bye' && match.team2.name.toLowerCase() !== 'bye') {
                    const matchId = groupName ? `g${groupName}r${round.round}m${match.match}` : `r${round.round}m${match.match}`;
                    allMatches.push({ id: matchId, roundName: round.name || `Round ${round.round}` });
                }
            });
        });
    };

    if (fixture.rounds) processRounds(fixture.rounds);
    if (fixture.groups) fixture.groups.forEach(g => processRounds(g.rounds, g.groupName));
    if (fixture.groupStage) {
        if (fixture.groupStage.rounds) processRounds(fixture.groupStage.rounds);
        if (fixture.groupStage.groups) fixture.groupStage.groups.forEach(g => processRounds(g.rounds, g.groupName));
    }
    if (fixture.knockoutStage) {
        processRounds(fixture.knockoutStage.rounds);
    }
    
    return allMatches;
};

export default function TournamentOverview({ tournament, fixture, scores, teams }: TournamentOverviewProps) {
  const stats = useMemo(() => {
    const allMatches = getAllMatches(fixture);
    const totalMatches = allMatches.length;
    if (totalMatches === 0) return {
        totalMatches: 0,
        playedMatches: 0,
        status: 'Upcoming',
        currentRoundName: 'N/A',
        progress: 0,
    };

    const playedMatches = allMatches.filter(m => scores[m.id] && scores[m.id].score1 !== null && scores[m.id].score2 !== null).length;

    let status: 'Upcoming' | 'Ongoing' | 'Completed' = 'Upcoming';
    if (playedMatches > 0) {
        status = playedMatches === totalMatches ? 'Completed' : 'Ongoing';
    }
    
    let currentRoundName = "Not Started";
    if (status === 'Ongoing') {
        const firstUnplayedMatch = allMatches.find(m => !scores[m.id] || scores[m.id].score1 === null || scores[m.id].score2 === null);
        currentRoundName = firstUnplayedMatch ? firstUnplayedMatch.roundName : "Finalizing";
    } else if (status === 'Completed') {
        currentRoundName = "Finished";
    } else if (status === 'Upcoming') {
        const firstRound = allMatches.length > 0 ? allMatches[0].roundName : "Round 1";
        currentRoundName = `Ready to start (${firstRound})`;
    }

    return {
        totalMatches,
        playedMatches,
        status,
        currentRoundName,
        progress: totalMatches > 0 ? (playedMatches / totalMatches) * 100 : 0
    };
  }, [fixture, scores]);

  const StatusIcon = {
      'Upcoming': <ListTodo className="w-8 h-8 text-blue-500" />,
      'Ongoing': <Flame className="w-8 h-8 text-orange-500" />,
      'Completed': <CheckCircle className="w-8 h-8 text-green-500" />,
  }[stats.status];

  return (
    <div>
      <h2 className="text-3xl font-bold text-primary">Tournament Overview</h2>
      <p className="text-muted-foreground">A summary of the tournament's progress.</p>
      
      <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            {StatusIcon}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.status}</div>
            <p className="text-xs text-muted-foreground">
                {
                    stats.status === 'Upcoming' ? 'The tournament has not started yet.' :
                    stats.status === 'Ongoing' ? 'The tournament is in full swing.' :
                    'The tournament has concluded.'
                }
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Round</CardTitle>
            <Swords className="w-8 h-8 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">{stats.currentRoundName}</div>
            <p className="text-xs text-muted-foreground">
                Currently active stage of the competition.
            </p>
          </CardContent>
        </Card>
        <Card className="md:col-span-2 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Match Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.playedMatches} / {stats.totalMatches}</div>
            <p className="text-xs text-muted-foreground mb-2">
                Total matches played.
            </p>
            <Progress value={stats.progress} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
