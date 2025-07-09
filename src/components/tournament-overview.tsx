
"use client";

import { useMemo, useState, useEffect } from 'react';
import type { Tournament, Fixture, Score, Team, Round } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Flame, Swords, CheckCircle, ListTodo, Trophy, Loader, Link as LinkIcon, Clipboard, Check, User, Shield } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import Link from 'next/link';
import FixtureSettings from './fixture-settings';
import Image from 'next/image';

interface TournamentOverviewProps {
  tournament: Tournament;
  fixture: Fixture | null;
  scores: Record<string, Score>;
  teams: Team[];
  onGenerateFixture: () => void;
  onTournamentUpdate: (data: Partial<Tournament>) => void;
  isGeneratingFixture: boolean;
  isPrivilegedUser: boolean;
}

const getAllMatches = (fixture: Fixture | null): { id: string, roundName: string }[] => {
    if (!fixture) return [];

    const allMatches: { id: string, roundName: string }[] = [];
    
    const processRounds = (rounds: Round[] | undefined, groupName?: string) => {
        if (!rounds) return;
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

export default function TournamentOverview({ tournament, fixture, scores, teams, onGenerateFixture, onTournamentUpdate, isGeneratingFixture, isPrivilegedUser }: TournamentOverviewProps) {
  const [copied, setCopied] = useState(false);
  const [publicShareLink, setPublicShareLink] = useState({ label: '', url: '' });

  useEffect(() => {
    if (typeof window !== 'undefined') {
        let label = 'Registration / Share Link';
        let url = `${window.location.origin}/register/${tournament.id}`;

        if (tournament.winner) {
            label = 'Champion Page Link';
            url = `${window.location.origin}/champion/${tournament.id}`;
        } else if (fixture && (tournament.tournamentType === 'single elimination' || tournament.tournamentType === 'hybrid')) {
            label = 'Public Bracket Link';
            url = `${window.location.origin}/knockout/${tournament.id}`;
        }
        
        setPublicShareLink({ label, url });
    }
  }, [tournament.id, tournament.winner, tournament.tournamentType, fixture]);

  const handleCopyLink = () => {
      if (!publicShareLink.url) return;
      navigator.clipboard.writeText(publicShareLink.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
  };
  
  const shareLinkCard = (
    <Card className="mt-8 w-full">
        <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <LinkIcon className="w-5 h-5 text-primary" />
                Share Tournament
            </CardTitle>
            <CardDescription>
                Use this public link to invite participants or share the tournament.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <div>
                <Label className="text-xs text-muted-foreground">{publicShareLink.label}</Label>
                <div className="flex gap-2">
                    <Input readOnly value={publicShareLink.url} placeholder="Loading link..." />
                    <Button variant="outline" size="icon" onClick={handleCopyLink} disabled={!publicShareLink.url}>
                        {copied ? <Check className="text-green-500" /> : <Clipboard />}
                    </Button>
                </div>
            </div>
        </CardContent>
    </Card>
  );

  const stats = useMemo(() => {
    const allMatches = getAllMatches(fixture);
    const totalMatches = allMatches.length;

    if (totalMatches === 0) return {
        totalMatches: 0,
        playedMatches: 0,
        status: 'Upcoming' as const,
        currentRoundName: 'N/A',
        progress: 0,
    };

    const playedMatches = allMatches.filter(m => scores[m.id] && scores[m.id].score1 !== null && scores[m.id].score2 !== null).length;

    let status: 'Upcoming' | 'Ongoing' | 'Completed' = 'Upcoming';
    if (playedMatches > 0 || tournament.winner) {
        status = (playedMatches === totalMatches || !!tournament.winner) ? 'Completed' : 'Ongoing';
    }
    
    let currentRoundName = "Not Started";
    if (status === 'Ongoing') {
        const firstUnplayedMatch = allMatches.find(m => !scores[m.id] || scores[m.id].score1 === null || scores[m.id].score2 === null);
        currentRoundName = firstUnplayedMatch ? firstUnplayedMatch.roundName : "Finalizing";
    } else if (status === 'Completed' || tournament.winner) {
        currentRoundName = "Finished";
        status = 'Completed';
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
  }, [fixture, scores, tournament.winner]);

  const StatusIcon = {
      'Upcoming': <ListTodo className="w-8 h-8 text-blue-500" />,
      'Ongoing': <Flame className="w-8 h-8 text-orange-500" />,
      'Completed': <CheckCircle className="w-8 h-8 text-green-500" />,
  }[stats.status];

  if (!fixture) {
    if (!tournament.tournamentType) {
        return (
             <FixtureSettings 
                tournament={tournament}
                onUpdate={onTournamentUpdate}
                isPrivilegedUser={isPrivilegedUser}
            />
        )
    }
    return (
        <div className="flex flex-col items-center justify-center text-center">
            <h2 className="text-3xl font-bold text-primary">Tournament Setup</h2>
            <div className="mt-6 flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border py-24 text-center w-full">
                <Trophy className="mx-auto h-12 w-12 text-accent" />
                <h3 className="mt-4 text-2xl font-semibold">Settings Confirmed!</h3>
                {isPrivilegedUser ? (
                    <>
                        <p className="mt-2 text-muted-foreground">
                            You're all set. Ready to generate the tournament fixture.
                        </p>
                        <Button onClick={onGenerateFixture} disabled={isGeneratingFixture} size="lg" className="mt-6">
                            {isGeneratingFixture && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                            {isGeneratingFixture ? "Generating..." : "Generate Fixture"}
                        </Button>
                    </>
                ) : (
                    <p className="mt-2 text-muted-foreground">
                        Waiting for the tournament owner or an admin to generate the fixture.
                    </p>
                )}
            </div>
            {shareLinkCard}
        </div>
    );
  }

  return (
    <div>
      <h2 className="text-3xl font-bold text-primary">Tournament Overview</h2>
      <p className="text-muted-foreground">A summary of the tournament's progress.</p>
      
      <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {tournament.winner && (
            <Card className="md:col-span-3 bg-accent/10 border-accent">
                <CardHeader className="text-center">
                    <Trophy className="w-10 h-10 text-accent mx-auto mb-2" />
                    <CardTitle>Tournament Champion</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center gap-2">
                    {tournament.winner.logo ? 
                        <Image src={tournament.winner.logo} alt={`${tournament.winner.name} logo`} width={64} height={64} className="rounded-full ring-2 ring-accent bg-background p-1" /> : 
                        <div className="w-16 h-16 rounded-full ring-2 ring-accent bg-muted flex items-center justify-center">
                            <Shield className="w-8 h-8 text-muted-foreground" />
                        </div>
                    }
                    <span className="text-2xl font-bold">{tournament.winner.name}</span>
                    {tournament.winner.ownerName && (
                        <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                            <User className="h-4 w-4" />
                            {tournament.winner.ownerName}
                        </span>
                    )}
                </CardContent>
            </Card>
        )}
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
      {shareLinkCard}
    </div>
  );
}
