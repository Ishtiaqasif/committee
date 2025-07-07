"use client"

import { useMemo, useState, useEffect } from 'react';
import type { Team, PointsTableEntry, Match, Round, Group, Score, Tournament } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dices, MapPin, Lock, ArrowRight, Shield, ArrowLeft, Trophy } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import ScoreEntryDialog from './score-entry-dialog';
import Image from 'next/image';
import PointsTable from './points-table';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface RoundRobinViewProps {
  fixture: { rounds?: Round[], groups?: Group[] };
  teams: Team[];
  scores: Record<string, Score>;
  onScoreUpdate: (matchIdentifier: string, newScore: Score) => void;
  onTournamentUpdate: (data: Partial<Tournament>) => void;
  isHybrid?: boolean;
  onProceedToKnockout?: () => void;
  activeRound: number;
  onActiveRoundChange: (round: number) => void;
  readOnly: boolean;
}

const GroupedRoundRobinView = ({ group, activeRound, scores, onScoreUpdate, teams, viewMode, readOnly }: { group: Group, activeRound: number, scores: RoundRobinViewProps['scores'], onScoreUpdate: RoundRobinViewProps['onScoreUpdate'], teams: Team[], viewMode: 'full' | 'short', readOnly: boolean }) => {
  const groupTeams = useMemo(() => group.teams.map(name => teams.find(t => t.name === name)!).filter(Boolean), [group.teams, teams]);

  const pointsTable = useMemo(() => {
    const table: Record<string, PointsTableEntry> = groupTeams.reduce((acc, team) => {
      acc[team.name] = { teamName: team.name, played: 0, won: 0, lost: 0, drawn: 0, points: 0, logo: team.logo, goalsFor: 0, goalsAgainst: 0, goalDifference: 0 };
      return acc;
    }, {} as Record<string, PointsTableEntry>);

    group.rounds.forEach(round => {
      round.matches.forEach(match => {
        const matchId = `g${group.groupName}r${round.round}m${match.match}`;
        const matchScores = scores[matchId];
        if (matchScores?.score1 !== null && matchScores?.score2 !== null && matchScores?.score1 !== undefined && matchScores?.score2 !== undefined) {
          const team1Name = match.team1.name;
          const team2Name = match.team2.name;
          const score1 = matchScores.score1;
          const score2 = matchScores.score2;

          if(table[team1Name]) {
            table[team1Name].played += 1;
            table[team1Name].goalsFor += score1;
            table[team1Name].goalsAgainst += score2;
          }
          if(table[team2Name]) {
            table[team2Name].played += 1;
            table[team2Name].goalsFor += score2;
            table[team2Name].goalsAgainst += score1;
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
      entry.goalDifference = entry.goalsFor - entry.goalsAgainst;
    });

    return Object.values(table).sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor);
  }, [scores, groupTeams, group]);

  const displayedRounds = group.rounds.filter(r => r.round === activeRound);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-6">
        {displayedRounds.map((round, roundIndex) => (
          <Card key={`round-${round.round}-${roundIndex}`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Dices className="text-accent"/> {round.name || `Round ${round.round}`}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {round.matches
                  .filter(match => match.team1.name.toLowerCase() !== 'bye' && match.team2.name.toLowerCase() !== 'bye')
                  .map((match) => {
                  const matchId = `g${group.groupName}r${round.round}m${match.match}`;
                  const score = scores[matchId];
                  return (
                  <div key={matchId} className="p-3 rounded-lg bg-secondary/50">
                    <div className="flex items-center justify-between">
                        <div className="flex w-1/3 items-center justify-end gap-2">
                          <span className="font-medium text-right">{match.team1.name}</span>
                          {match.team1.logo ? <Image src={match.team1.logo} alt={`${match.team1.name} logo`} width={24} height={24} className="rounded-full"/> : <Shield className="h-6 w-6 text-primary/30"/>}
                        </div>
                        <div className="flex items-center gap-2 mx-4 font-semibold text-lg">
                            <span>{score?.score1 ?? '-'}</span>
                            <span>vs</span>
                            <span>{score?.score2 ?? '-'}</span>
                        </div>
                        <div className="flex w-1/3 items-center justify-start gap-2">
                           {match.team2.logo ? <Image src={match.team2.logo} alt={`${match.team2.name} logo`} width={24} height={24} className="rounded-full"/> : <Shield className="h-6 w-6 text-primary/30"/>}
                          <span className="font-medium text-left">{match.team2.name}</span>
                        </div>
                    </div>
                    <div className="flex items-center justify-center gap-4 mt-2">
                        <ScoreEntryDialog
                            match={match}
                            currentScore={score}
                            onScoreSave={(newScore) => onScoreUpdate(matchId, newScore)}
                            readOnly={readOnly}
                        >
                            <Button variant="outline" size="sm" disabled={readOnly || score?.locked || match.team1.name.toLowerCase() === 'bye' || match.team2.name.toLowerCase() === 'bye'}>
                                {score?.score1 !== undefined ? 'Edit Score' : 'Enter Score'}
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
        {displayedRounds.length === 0 && (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              <p>No matches for this round.</p>
            </CardContent>
          </Card>
        )}
      </div>
      <div>
        <PointsTable title="Points Table" table={pointsTable} viewMode={viewMode} />
      </div>
    </div>
  )
}


export default function RoundRobinView({ fixture, teams, scores, onScoreUpdate, onTournamentUpdate, isHybrid, onProceedToKnockout, activeRound, onActiveRoundChange, readOnly }: RoundRobinViewProps) {
  const [viewMode, setViewMode] = useState<'short' | 'full'>('short');

  const { isRoundComplete, hasNextRound, maxRound } = useMemo(() => {
    if (!fixture.rounds && !fixture.groups) return { isRoundComplete: false, hasNextRound: false, maxRound: 0 };

    let matchesInActiveRound: { match: Match, id: string }[] = [];
    let currentMaxRound = 0;

    if (fixture.groups) {
        fixture.groups.forEach(group => {
            group.rounds.forEach(round => {
                if (round.round > currentMaxRound) currentMaxRound = round.round;
                if (round.round === activeRound) {
                    round.matches.forEach(match => {
                        if (match.team1.name.toLowerCase() !== 'bye' && match.team2.name.toLowerCase() !== 'bye') {
                           matchesInActiveRound.push({ match, id: `g${group.groupName}r${round.round}m${match.match}` });
                        }
                    });
                }
            });
        });
    } else if (fixture.rounds) {
        fixture.rounds.forEach(round => {
            if (round.round > currentMaxRound) currentMaxRound = round.round;
            if (round.round === activeRound) {
                round.matches.forEach(match => {
                    if (match.team1.name.toLowerCase() !== 'bye' && match.team2.name.toLowerCase() !== 'bye') {
                        matchesInActiveRound.push({ match, id: `r${round.round}m${match.match}` });
                    }
                });
            }
        });
    }
    
    if (matchesInActiveRound.length === 0) {
       return { isRoundComplete: true, hasNextRound: activeRound < currentMaxRound, maxRound: currentMaxRound };
    }

    const complete = matchesInActiveRound.every(m => {
        const score = scores[m.id];
        return score?.score1 !== null && score?.score2 !== null && score?.score1 !== undefined && score?.score2 !== undefined;
    });

    return { isRoundComplete: complete, hasNextRound: activeRound < currentMaxRound, maxRound: currentMaxRound };

  }, [activeRound, fixture, scores]);


  const handleProceed = () => {
    if (fixture.groups) {
        fixture.groups.forEach(group => {
            group.rounds.filter(r => r.round === activeRound).forEach(round => {
                round.matches.forEach(match => {
                    const matchId = `g${group.groupName}r${round.round}m${match.match}`;
                    const score = scores[matchId] || { score1: null, score2: null, locked: false };
                    onScoreUpdate(matchId, { ...score, locked: true });
                });
            });
        });
    } else if (fixture.rounds) {
        fixture.rounds.filter(r => r.round === activeRound).forEach(round => {
            round.matches.forEach(match => {
                const matchId = `r${round.round}m${match.match}`;
                const score = scores[matchId] || { score1: null, score2: null, locked: false };
                onScoreUpdate(matchId, { ...score, locked: true });
            });
        });
    }
    onActiveRoundChange(activeRound + 1);
  };

  const handleGoBack = () => {
    onActiveRoundChange(Math.max(1, activeRound - 1));
  };
  
  const allRounds = fixture.rounds || [];
  const pointsTable = useMemo(() => {
    const table: Record<string, PointsTableEntry> = teams.reduce((acc, team) => {
      acc[team.name] = { teamName: team.name, played: 0, won: 0, lost: 0, drawn: 0, points: 0, logo: team.logo, goalsFor: 0, goalsAgainst: 0, goalDifference: 0 };
      return acc;
    }, {} as Record<string, PointsTableEntry>);

    allRounds.forEach(round => {
      round.matches.forEach(match => {
        const matchScores = scores[`r${round.round}m${match.match}`];
        if (matchScores?.score1 !== null && matchScores?.score2 !== null && matchScores?.score1 !== undefined && matchScores?.score2 !== undefined) {
          const team1Name = match.team1.name;
          const team2Name = match.team2.name;

          if (team1Name.toLowerCase() === 'bye' || team2Name.toLowerCase() === 'bye') return;

          const score1 = matchScores.score1;
          const score2 = matchScores.score2;

          if(table[team1Name]) {
            table[team1Name].played += 1;
            table[team1Name].goalsFor += score1;
            table[team1Name].goalsAgainst += score2;
          }
          if(table[team2Name]) {
            table[team2Name].played += 1;
            table[team2Name].goalsFor += score2;
            table[team2Name].goalsAgainst += score1;
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
      entry.goalDifference = entry.goalsFor - entry.goalsAgainst;
    });

    return Object.values(table).sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor);
  }, [scores, teams, allRounds]);

  const finalWinner = useMemo(() => {
    const allRoundsPlayed = activeRound > maxRound;
    if (allRoundsPlayed && !isHybrid && fixture.rounds && !fixture.groups && pointsTable.length > 0) {
        const winnerEntry = pointsTable[0];
        const winnerTeam = teams.find(t => t.name === winnerEntry.teamName);
        return winnerTeam;
    }
    return null;
  }, [activeRound, maxRound, isHybrid, pointsTable, fixture, teams]);

  const NavigationFooter = () => (
    <div className="mt-8 flex flex-col items-center justify-center gap-2">
      <div className="flex items-center gap-4">
        <Button size="lg" variant="outline" onClick={handleGoBack} disabled={activeRound === 1}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Previous Round
        </Button>
        {hasNextRound && (
            <Button size="lg" onClick={handleProceed} disabled={!isRoundComplete}>
                Next Round <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
        )}
      </div>
      {hasNextRound && !isRoundComplete && (
        <p className="text-sm text-muted-foreground mt-2">
          Enter all match results for the current round to proceed.
        </p>
      )}
      {isRoundComplete && !hasNextRound && (
        <div className="mt-4 text-center">
            {isHybrid && onProceedToKnockout ? (
                <Button size="lg" onClick={onProceedToKnockout} disabled={!isRoundComplete}>
                    Proceed to Knockout Stage <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
            ) : finalWinner ? (
                 <div className="space-y-2">
                    <p className="text-lg font-semibold text-primary">
                        Tournament Complete! The winner is {finalWinner.name}.
                    </p>
                    <Button size="lg" onClick={() => onTournamentUpdate({ winner: finalWinner })}>
                        <Trophy className="mr-2 h-4 w-4" /> Crown Champion & Finish
                    </Button>
                </div>
            ) : (
                <p className="text-lg font-semibold text-primary">
                    All rounds are complete!
                </p>
            )}
        </div>
      )}
    </div>
  );
  
  const TableViewToggle = () => (
    <div className="flex items-center space-x-2 mb-4 justify-end">
        <Switch
            id="view-mode-switch-rr"
            checked={viewMode === 'full'}
            onCheckedChange={(checked) => setViewMode(checked ? 'full' : 'short')}
        />
        <Label htmlFor="view-mode-switch-rr">Show Full Table</Label>
    </div>
  );

  if (fixture.groups && fixture.groups.length > 0) {
    return (
      <>
       <TableViewToggle />
       <Tabs defaultValue={fixture.groups[0].groupName} className="w-full">
        <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${fixture.groups.length}, minmax(0, 1fr))` }}>
          {fixture.groups.map(group => (
            <TabsTrigger key={group.groupName} value={group.groupName}>{group.groupName}</TabsTrigger>
          ))}
        </TabsList>
        {fixture.groups.map(group => (
          <TabsContent key={group.groupName} value={group.groupName} className="mt-6">
            <GroupedRoundRobinView group={group} activeRound={activeRound} scores={scores} onScoreUpdate={onScoreUpdate} teams={teams} viewMode={viewMode} readOnly={readOnly}/>
          </TabsContent>
        ))}
      </Tabs>
      {!readOnly && <NavigationFooter />}
      </>
    )
  }
  
  const displayedRounds = allRounds.filter(r => r.round === activeRound);

  return (
    <>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-6">
        {displayedRounds.map((round, roundIndex) => (
          <Card key={`round-${round.round}-${roundIndex}`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Dices className="text-accent"/> {round.name || `Round ${round.round}`}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {round.matches
                  .filter(match => match.team1.name.toLowerCase() !== 'bye' && match.team2.name.toLowerCase() !== 'bye')
                  .map((match) => {
                  const matchId = `r${round.round}m${match.match}`;
                  const score = scores[matchId];
                  return (
                  <div key={matchId} className="p-3 rounded-lg bg-secondary/50">
                    <div className="flex items-center justify-between">
                         <div className="flex w-1/3 items-center justify-end gap-2">
                          <span className="font-medium text-right">{match.team1.name}</span>
                          {match.team1.logo ? <Image src={match.team1.logo} alt={`${match.team1.name} logo`} width={24} height={24} className="rounded-full"/> : <Shield className="h-6 w-6 text-primary/30"/>}
                        </div>
                        <div className="flex items-center gap-2 mx-4 font-semibold text-lg">
                            <span>{score?.score1 ?? '-'}</span>
                            <span>vs</span>
                            <span>{score?.score2 ?? '-'}</span>
                        </div>
                        <div className="flex w-1/3 items-center justify-start gap-2">
                           {match.team2.logo ? <Image src={match.team2.logo} alt={`${match.team2.name} logo`} width={24} height={24} className="rounded-full"/> : <Shield className="h-6 w-6 text-primary/30"/>}
                          <span className="font-medium text-left">{match.team2.name}</span>
                        </div>
                    </div>
                     <div className="flex items-center justify-center gap-4 mt-2">
                        <ScoreEntryDialog
                            match={match}
                            currentScore={score}
                            onScoreSave={(newScore) => onScoreUpdate(matchId, newScore)}
                            readOnly={readOnly}
                        >
                            <Button variant="outline" size="sm" disabled={readOnly || score?.locked || match.team1.name.toLowerCase() === 'bye' || match.team2.name.toLowerCase() === 'bye'}>
                                {score?.score1 !== undefined ? 'Edit Score' : 'Enter Score'}
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
         {displayedRounds.length === 0 && (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              <p>All rounds are complete.</p>
            </CardContent>
          </Card>
        )}
      </div>
      <div>
        <TableViewToggle />
        <PointsTable title="Points Table" table={pointsTable} viewMode={viewMode} />
      </div>
    </div>
    {!readOnly && <NavigationFooter />}
    </>
  )
}
