
"use client"

import { useMemo, useState, useEffect, useTransition } from 'react';
import { Team, Match, Round, Group, Score, Tournament, TiebreakerRule } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dices, MapPin, Lock, ArrowRight, Shield, ArrowLeft, Trophy, Loader, Bot } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import ScoreEntryDialog from './score-entry-dialog';
import Image from 'next/image';
import PointsTable from './points-table';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { calculatePointsTable } from '@/lib/calculate-points-table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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
  currentUserId?: string;
  tournament: Tournament;
  onSimulateRound: () => void;
  isSimulating: boolean;
}

const GroupedRoundRobinView = ({ group, viewedRound, activeRound, scores, onScoreUpdate, teams, viewMode, readOnly, currentUserId, userTeam, tiebreakerRules, awayGoalsRule }: { group: Group, viewedRound: number, activeRound: number, scores: RoundRobinViewProps['scores'], onScoreUpdate: RoundRobinViewProps['onScoreUpdate'], teams: Team[], viewMode: 'full' | 'short', readOnly: boolean, currentUserId?: string, userTeam?: Team | null, tiebreakerRules: TiebreakerRule[], awayGoalsRule: boolean }) => {
  const groupTeams = useMemo(() => group.teams.map(name => teams.find(t => t.name === name)!).filter(Boolean), [group.teams, teams]);

  const pointsTable = useMemo(() => {
    return calculatePointsTable(groupTeams, group.rounds, scores, awayGoalsRule, group.groupName, undefined, tiebreakerRules);
  }, [scores, groupTeams, group, tiebreakerRules, awayGoalsRule]);

  const displayedRounds = group.rounds.filter(r => r.round === viewedRound);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-6">
        {displayedRounds.map((round, roundIndex) => (
          <Card key={`round-${round.round}-${roundIndex}`} className={cn(viewedRound === activeRound && "border-primary ring-2 ring-primary")}>
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
                  const isUserMatch = userTeam && (match.team1.name === userTeam.name || match.team2.name === userTeam.name);
                  return (
                  <div key={matchId} className={cn("p-3 rounded-lg bg-secondary/50", isUserMatch && "bg-primary/10")}>
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
                            readOnly={readOnly || viewedRound !== activeRound}
                            allowTiebreaker={false}
                        >
                            <Button variant="outline" size="sm" disabled={readOnly || viewedRound !== activeRound || score?.locked || match.team1.name.toLowerCase() === 'bye' || match.team2.name.toLowerCase() === 'bye'}>
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
        <PointsTable title="Points Table" table={pointsTable} viewMode={viewMode} userTeamName={userTeam?.name} />
      </div>
    </div>
  )
}


export default function RoundRobinView({ fixture, teams, scores, onScoreUpdate, onTournamentUpdate, isHybrid, onProceedToKnockout, activeRound, onActiveRoundChange, readOnly, currentUserId, tournament, onSimulateRound, isSimulating }: RoundRobinViewProps) {
  const [viewMode, setViewMode] = useState<'short' | 'full'>('short');
  const [viewedRound, setViewedRound] = useState(activeRound);
  const [isProceeding, startProceeding] = useTransition();

  const userTeam = useMemo(() => teams.find(t => t.ownerId === currentUserId), [teams, currentUserId]);
  
  const userGroup = useMemo(() => {
    if (!userTeam || !fixture.groups) return null;
    const group = fixture.groups.find(g => g.teams.includes(userTeam.name));
    return group ? group.groupName : null;
  }, [userTeam, fixture.groups]);

  useEffect(() => {
    // When the official activeRound changes, update the view to match
    setViewedRound(activeRound);
  }, [activeRound]);

  const { isRoundComplete, hasNextRound, maxRound, isRoundLocked } = useMemo(() => {
    if (!fixture.rounds && !fixture.groups) return { isRoundComplete: false, hasNextRound: false, maxRound: 0, isRoundLocked: false };

    let matchesInActiveRound: { match: Match, id: string }[] = [];
    let currentMaxRound = 0;

    const processRound = (round: Round, groupName?: string) => {
        if (round.round > currentMaxRound) currentMaxRound = round.round;
        if (round.round === activeRound) {
            round.matches.forEach(match => {
                if (match.team1.name.toLowerCase() !== 'bye' && match.team2.name.toLowerCase() !== 'bye') {
                    const matchId = groupName ? `g${groupName}r${round.round}m${match.match}` : `r${round.round}m${match.match}`;
                    matchesInActiveRound.push({ match, id: matchId });
                }
            });
        }
    };

    if (fixture.groups) {
        fixture.groups.forEach(group => group.rounds.forEach(r => processRound(r, group.groupName)));
    } else if (fixture.rounds) {
        fixture.rounds.forEach(r => processRound(r));
    }
    
    if (matchesInActiveRound.length === 0 && currentMaxRound > 0 && activeRound <= currentMaxRound) {
       return { isRoundComplete: true, hasNextRound: activeRound < currentMaxRound, maxRound: currentMaxRound, isRoundLocked: true };
    }

    const complete = matchesInActiveRound.every(m => {
        const score = scores[m.id];
        return score?.score1 !== null && score?.score2 !== null && score?.score1 !== undefined && score?.score2 !== undefined;
    });
    
    const locked = matchesInActiveRound.every(m => {
        const score = scores[m.id];
        return !!score?.locked;
    });

    return { isRoundComplete: complete, hasNextRound: activeRound < currentMaxRound, maxRound: currentMaxRound, isRoundLocked: locked };

  }, [activeRound, fixture, scores]);


  const handleProceed = () => {
    startProceeding(() => {
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
    });
  };

  const allRounds = fixture.rounds || [];
  const tiebreakerRules = tournament.tiebreakerRules || ['goalDifference', 'goalsFor', 'headToHead'];
  const awayGoalsRule = tournament.awayGoalsRule ?? false;
  
  const pointsTable = useMemo(() => {
    if (!fixture.rounds) return [];
    return calculatePointsTable(teams, allRounds, scores, awayGoalsRule, undefined, undefined, tiebreakerRules);
  }, [scores, teams, allRounds, awayGoalsRule, tiebreakerRules, fixture.rounds]);

  const finalWinner = useMemo(() => {
    const isFinished = !hasNextRound && isRoundComplete;
    if (isFinished && !isHybrid && fixture.rounds && !fixture.groups && pointsTable.length > 0) {
        const winnerEntry = pointsTable[0];
        const winnerTeam = teams.find(t => t.name === winnerEntry.teamName);
        if (winnerTeam) {
            return {
                name: winnerTeam.name,
                logo: winnerTeam.logo,
                ownerName: winnerTeam.ownerName,
            };
        }
    }
    return null;
  }, [hasNextRound, isRoundComplete, isHybrid, pointsTable, fixture, teams]);
  
  const isViewingActiveRound = viewedRound === activeRound;
  
  const NavigationFooter = () => (
    <div className="mt-8 flex flex-col items-center justify-center gap-4">
      <div className="flex items-center gap-4">
        <Button size="lg" variant="outline" onClick={() => setViewedRound(v => Math.max(1, v - 1))} disabled={viewedRound === 1}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Previous Round
        </Button>
        <Button size="lg" variant="outline" onClick={() => setViewedRound(v => Math.min(maxRound, v + 1))} disabled={viewedRound >= maxRound}>
            Next Round <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
      
      {!readOnly && !tournament.winner && (
        <div className="text-center space-y-2 border-t pt-4 mt-4 w-full max-w-lg">
            {hasNextRound && isRoundComplete && !isRoundLocked && (
                <>
                    <p className="text-sm text-muted-foreground">All matches in the current round are complete.</p>
                    <Button size="lg" onClick={handleProceed} disabled={isProceeding}>
                        {isProceeding && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                        Lock Round & Proceed <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </>
            )}

            {hasNextRound && !isRoundComplete && isViewingActiveRound && (
                <p className="text-sm text-muted-foreground mt-2">
                Enter all match results for the current round to proceed.
                </p>
            )}

            {!hasNextRound && isRoundComplete && (
                 <>
                    {isHybrid && onProceedToKnockout ? (
                        <Button size="lg" onClick={() => startProceeding(() => onProceedToKnockout())} disabled={isProceeding}>
                            {isProceeding && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                            Proceed to Knockout Stage <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    ) : finalWinner ? (
                        <div className="space-y-2">
                            <p className="text-lg font-semibold text-primary">
                                Tournament Complete! The winner is {finalWinner.name}.
                            </p>
                            <Button size="lg" onClick={() => startProceeding(() => onTournamentUpdate({ winner: finalWinner }))} disabled={isProceeding}>
                                {isProceeding && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                                <Trophy className="mr-2 h-4 w-4" /> Crown Champion & Finish
                            </Button>
                        </div>
                    ) : (
                        <p className="text-lg font-semibold text-primary">
                            All rounds are complete!
                        </p>
                    )}
                 </>
            )}
             {process.env.NODE_ENV !== 'production' && (
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="outline" disabled={isSimulating} className="mt-2">
                            <Bot className="mr-2 h-4 w-4" />
                            Simulate Round
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                        <AlertDialogTitle>Simulate Current Round?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will generate random scores for all unplayed matches in the current round. This is for testing purposes and can be undone by manually editing scores.
                        </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={onSimulateRound} disabled={isSimulating}>
                            {isSimulating && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                            Continue
                        </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
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
       <Tabs defaultValue={userGroup || fixture.groups[0].groupName} className="w-full">
        <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${fixture.groups.length}, minmax(0, 1fr))` }}>
          {fixture.groups.map(group => (
            <TabsTrigger key={group.groupName} value={group.groupName}>{group.groupName}</TabsTrigger>
          ))}
        </TabsList>
        {fixture.groups.map(group => (
          <TabsContent key={group.groupName} value={group.groupName} className="mt-6">
            <GroupedRoundRobinView 
              group={group} 
              viewedRound={viewedRound}
              activeRound={activeRound}
              scores={scores} 
              onScoreUpdate={onScoreUpdate} 
              teams={teams} 
              viewMode={viewMode} 
              readOnly={readOnly}
              currentUserId={currentUserId}
              userTeam={userTeam}
              tiebreakerRules={tiebreakerRules}
              awayGoalsRule={awayGoalsRule}
            />
          </TabsContent>
        ))}
      </Tabs>
      <NavigationFooter />
      </>
    )
  }
  
  const displayedRounds = allRounds.filter(r => r.round === viewedRound);

  return (
    <>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-6">
        {displayedRounds.map((round, roundIndex) => (
          <Card key={`round-${round.round}-${roundIndex}`} className={cn(viewedRound === activeRound && "border-primary ring-2 ring-primary")}>
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
                  const isUserMatch = userTeam && (match.team1.name === userTeam.name || match.team2.name === userTeam.name);
                  return (
                  <div key={matchId} className={cn("p-3 rounded-lg bg-secondary/50", isUserMatch && "bg-primary/10")}>
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
                            readOnly={readOnly || viewedRound !== activeRound}
                            allowTiebreaker={false}
                        >
                            <Button variant="outline" size="sm" disabled={readOnly || viewedRound !== activeRound || score?.locked || match.team1.name.toLowerCase() === 'bye' || match.team2.name.toLowerCase() === 'bye'}>
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
         {displayedRounds.length === 0 && maxRound > 0 && (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              <p>All rounds are complete.</p>
            </CardContent>
          </Card>
        )}
      </div>
      <div>
        <TableViewToggle />
        <PointsTable title="Points Table" table={pointsTable} viewMode={viewMode} userTeamName={userTeam?.name} />
      </div>
    </div>
    <NavigationFooter />
    </>
  )
}
