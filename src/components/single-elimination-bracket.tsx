

"use client"

import { Match, Round, Score, Tournament, MatchTeam } from '@/types';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { useMemo, useState, useEffect, useTransition } from 'react';
import { MapPin, Lock, ArrowRight, Shield, ArrowLeft, Trophy, Loader, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ScoreEntryDialog from './score-entry-dialog';
import { cn } from '@/lib/utils';
import Image from 'next/image';
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

interface SingleEliminationBracketProps {
  fixture: { rounds: Round[] };
  scores: Record<string, Score>;
  onScoreUpdate: (matchIdentifier: string, newScore: Score) => void;
  onTournamentUpdate: (data: Partial<Tournament>) => void;
  knockoutHomeAndAway: boolean;
  awayGoalsRule: boolean;
  activeRound: number;
  onActiveRoundChange: (round: number) => void;
  readOnly: boolean;
  currentUserId?: string;
  tournament: Tournament;
  onSimulateRound: () => void;
  isSimulating: boolean;
}

const MatchComponent = ({ match, round, onScoreUpdate, currentScores, isActive, readOnly, currentUserId }: { match: Match, round: number, onScoreUpdate: SingleEliminationBracketProps['onScoreUpdate'], currentScores: any, isActive: boolean, readOnly: boolean, currentUserId?: string }) => {
  const matchId = `r${round}m${match.match}`;
  const score = currentScores[matchId];
  
  const isDraw = score && score.score1 !== null && score.score2 !== null && score.score1 === score.score2;
  const isTeam1WinnerByTiebreak = isDraw && score.score1_tiebreak != null && score.score2_tiebreak != null && score.score1_tiebreak > score.score2_tiebreak;
  const isTeam2WinnerByTiebreak = isDraw && score.score1_tiebreak != null && score.score2_tiebreak != null && score.score2_tiebreak > score.score1_tiebreak;

  const isTeam1Winner = (score && score.score1 !== null && score.score2 !== null && score.score1 > score.score2) || isTeam1WinnerByTiebreak;
  const isTeam2Winner = (score && score.score1 !== null && score.score2 !== null && score.score2 > score.score1) || isTeam2WinnerByTiebreak;
  
  const isUserMatch = currentUserId && (match.team1.ownerId === currentUserId || match.team2.ownerId === currentUserId);

  const getTeamClass = (isWinner: boolean, teamName: string) => {
    let baseClass = "flex items-center justify-between p-2 rounded-t-md";
    if (teamName.toLowerCase() === 'bye') {
      return `${baseClass} bg-muted text-muted-foreground`;
    }
    if (isWinner) {
      return `${baseClass} bg-accent/80 text-accent-foreground font-bold`;
    }
    return `${baseClass} bg-secondary`;
  }

  return (
    <Card className={cn("w-64 bg-card shadow-md transition-all", isActive && "border-primary ring-2 ring-primary", isUserMatch && "bg-primary/10")}>
      <CardContent className="p-0">
        <div className={getTeamClass(isTeam1Winner, match.team1.name)}>
          <div className="flex items-center gap-2">
            {match.team1.logo ? <Image src={match.team1.logo} alt={`${match.team1.name} logo`} width={20} height={20} className="rounded-full" /> : <Shield className="h-5 w-5" />}
            <span>{match.team1.name}</span>
          </div>
          <span className="font-bold text-lg">
            {score?.score1 ?? '-'}
            {isDraw && score.score1_tiebreak != null ? ` (${score.score1_tiebreak})` : ''}
          </span>
        </div>
        <div className="border-t border-border my-0"></div>
        <div className={getTeamClass(isTeam2Winner, match.team2.name).replace('rounded-t-md', 'rounded-b-md')}>
          <div className="flex items-center gap-2">
            {match.team2.logo ? <Image src={match.team2.logo} alt={`${match.team2.name} logo`} width={20} height={20} className="rounded-full" /> : <Shield className="h-5 w-5" />}
            <span>{match.team2.name}</span>
          </div>
          <span className="font-bold text-lg">
             {score?.score2 ?? '-'}
             {isDraw && score.score2_tiebreak != null ? ` (${score.score2_tiebreak})` : ''}
          </span>
        </div>
      </CardContent>
       <CardFooter className="p-2 flex-col gap-2 items-stretch">
        <div className="flex items-center justify-center gap-4 w-full">
            <ScoreEntryDialog
                match={match}
                currentScore={score}
                onScoreSave={(newScore) => onScoreUpdate(matchId, newScore)}
                readOnly={readOnly || !isActive}
                allowTiebreaker={true}
            >
                <Button className="flex-grow" variant="outline" size="sm" disabled={readOnly || score?.locked || !isActive || match.team1.name.toLowerCase() === 'bye' || match.team2.name.toLowerCase() === 'bye'}>
                    {score?.score1 !== undefined ? 'Edit Score' : 'Enter Score'}
                </Button>
            </ScoreEntryDialog>
            {score?.locked && <Lock className="h-4 w-4 text-muted-foreground" />}
        </div>
        {match.venue && (
            <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground pt-2 border-t w-full">
                <MapPin className="h-3 w-3" />
                <span>{match.venue}</span>
            </div>
        )}
      </CardFooter>
    </Card>
  )
}

export default function SingleEliminationBracket({ fixture, onScoreUpdate, onTournamentUpdate, scores, knockoutHomeAndAway, awayGoalsRule, activeRound, onActiveRoundChange, readOnly, currentUserId, tournament, onSimulateRound, isSimulating }: SingleEliminationBracketProps) {
    const [isProceeding, startProceeding] = useTransition();

    const { isRoundComplete, hasNextRound, isRoundLocked } = useMemo(() => {
        const currentRound = fixture.rounds.find(r => r.round === activeRound);
        if (!currentRound) return { isRoundComplete: false, hasNextRound: false, isRoundLocked: false };

        const currentRoundMatches = currentRound.matches.filter(m => m.team1.name.toLowerCase() !== 'bye' && m.team2.name.toLowerCase() !== 'bye');
        
        if (currentRoundMatches.length === 0) {
            const next = fixture.rounds.some(r => r.round === activeRound + 1);
            return { isRoundComplete: true, hasNextRound: next, isRoundLocked: true };
        }

        const complete = currentRoundMatches.every(match => {
            const matchId = `r${currentRound.round}m${match.match}`;
            const score = scores[matchId];
            return score?.score1 !== null && score?.score2 !== null && score?.score1 !== undefined && score?.score2 !== undefined;
        });
        
        const locked = currentRoundMatches.every(match => {
            const matchId = `r${currentRound.round}m${match.match}`;
            const score = scores[matchId];
            return !!score?.locked;
        });

        const next = fixture.rounds.some(r => r.round === activeRound + 1);

        return { isRoundComplete: complete, hasNextRound: next, isRoundLocked: locked };
    }, [activeRound, fixture.rounds, scores]);

    const handleProceed = () => {
        if (readOnly) return;
        startProceeding(() => {
            const currentRound = fixture.rounds.find(r => r.round === activeRound);
            if (!currentRound) return;

            currentRound.matches.forEach(match => {
                const matchId = `r${currentRound.round}m${match.match}`;
                const score = scores[matchId] || { score1: null, score2: null, locked: false };
                onScoreUpdate(matchId, { ...score, locked: true });
            });

            onActiveRoundChange(activeRound + 1);
        });
    };

    const processedFixture = useMemo(() => {
        const newRounds = JSON.parse(JSON.stringify(fixture.rounds));

        for (let i = 0; i < newRounds.length - 1; i++) {
            const currentRound = newRounds[i];
            const nextRound = newRounds[i + 1];
            
            const getSingleMatchWinner = (match: Match) => {
                const matchId = `r${currentRound.round}m${match.match}`;
                const matchScores = scores[matchId];
                let winner: MatchTeam | null = null;
                
                if (match.team1.name.toLowerCase() === 'bye') return match.team2;
                if (match.team2.name.toLowerCase() === 'bye') return match.team1;

                if (matchScores && matchScores.score1 !== null && matchScores.score2 !== null) {
                    if (matchScores.score1 > matchScores.score2) {
                        winner = match.team1;
                    } else if (matchScores.score2 > matchScores.score1) {
                        winner = match.team2;
                    } else { // Draw, check tiebreaker
                        if (matchScores.score1_tiebreak != null && matchScores.score2_tiebreak != null) {
                            if (matchScores.score1_tiebreak > matchScores.score2_tiebreak) {
                                winner = match.team1;
                            } else if (matchScores.score2_tiebreak > matchScores.score1_tiebreak) {
                                winner = match.team2;
                            }
                        }
                    }
                }
                return winner;
            }

            const advanceWinner = (winner: MatchTeam | null, match: Match) => {
                if (!winner) return;
                const nextMatchIndex = Math.floor((match.match - 1) / 2);
                const nextMatch = nextRound.matches[nextMatchIndex];
                if(nextMatch) {
                    if ((match.match - 1) % 2 === 0) {
                        nextMatch.team1 = winner;
                    } else {
                        nextMatch.team2 = winner;
                    }
                }
            }
            
            if (knockoutHomeAndAway) {
                const ties = new Map<string, Match[]>();
                const singleMatches: Match[] = [];

                currentRound.matches.forEach((match: Match) => {
                    if (match.team1.name.toLowerCase() === 'bye' || match.team2.name.toLowerCase() === 'bye') {
                        singleMatches.push(match);
                    } else {
                        const tieKey = [match.team1.name, match.team2.name].sort().join(' vs ');
                        if (!ties.has(tieKey)) ties.set(tieKey, []);
                        ties.get(tieKey)!.push(match);
                    }
                });

                singleMatches.forEach(match => {
                    const winner = getSingleMatchWinner(match);
                    advanceWinner(winner, match);
                });

                ties.forEach(tieMatches => {
                    if (tieMatches.length !== 2) {
                        tieMatches.forEach(match => {
                            const winner = getSingleMatchWinner(match);
                            advanceWinner(winner, match);
                        })
                        return;
                    }
                    
                    const [leg1, leg2] = tieMatches.sort((a,b) => a.match - b.match);
                    const teamA = leg1.team1; 
                    const teamB = leg1.team2;

                    const leg1Id = `r${currentRound.round}m${leg1.match}`;
                    const leg2Id = `r${currentRound.round}m${leg2.match}`;

                    const score1 = scores[leg1Id];
                    const score2 = scores[leg2Id];

                    let winner: MatchTeam | null = null;

                    if (score1 && score1.score1 !== null && score1.score2 !== null && score2 && score2.score1 !== null && score2.score2 !== null) {
                        const teamA_s1 = score1.score1; // A is home in leg 1
                        const teamB_s1 = score1.score2;
                        
                        const teamA_s2 = score2.score2; // A is away in leg 2
                        const teamB_s2 = score2.score1;

                        const teamA_aggregate = teamA_s1 + teamA_s2;
                        const teamB_aggregate = teamB_s1 + teamB_s2;
                        
                        if (teamA_aggregate > teamB_aggregate) {
                            winner = teamA;
                        } else if (teamB_aggregate > teamA_aggregate) {
                            winner = teamB;
                        } else {
                            if (awayGoalsRule) {
                                const teamA_away_goals = teamA_s2;
                                const teamB_away_goals = teamB_s1;

                                if (teamA_away_goals > teamB_away_goals) {
                                    winner = teamA;
                                } else if (teamB_away_goals > teamA_away_goals) {
                                    winner = teamB;
                                }
                            }
                            
                            if (!winner && score2.score1_tiebreak != null && score2.score2_tiebreak != null) {
                               if(score2.score1_tiebreak > score2.score2_tiebreak) winner = leg2.team1;
                               else if (score2.score2_tiebreak > score2.score1_tiebreak) winner = leg2.team2;
                            }
                        }
                    }
                    advanceWinner(winner, leg1);
                });

            } else {
                 currentRound.matches.forEach((match: Match) => {
                    const winner = getSingleMatchWinner(match);
                    advanceWinner(winner, match);
                });
            }
        }
        return { rounds: newRounds };
    }, [fixture, scores, knockoutHomeAndAway, awayGoalsRule]);
    
    const roundsWithPairs = useMemo(() => {
        return processedFixture.rounds.map(round => {
            const matchPairs = [];
            for (let i = 0; i < round.matches.length; i += 2) {
                matchPairs.push(round.matches.slice(i, i + 2));
            }
            return { ...round, matchPairs };
        });
    }, [processedFixture]);

  const finalWinner = useMemo(() => {
    if (isRoundComplete && !hasNextRound) {
      const finalRound = processedFixture.rounds[processedFixture.rounds.length - 1];
      if (!finalRound || finalRound.matches.length !== 1) return null;
      
      const finalMatch = finalRound.matches[0];
      const finalMatchId = `r${finalRound.round}m${finalMatch.match}`;
      const finalScores = scores[finalMatchId];
      let winner: MatchTeam | null = null;
      if (finalScores && finalScores.score1 !== null && finalScores.score2 !== null) {
          if (finalScores.score1 > finalScores.score2) winner = finalMatch.team1;
          else if (finalScores.score2 > finalScores.score1) winner = finalMatch.team2;
          else if (finalScores.score1_tiebreak != null && finalScores.score2_tiebreak != null) {
            if (finalScores.score1_tiebreak > finalScores.score2_tiebreak) winner = finalMatch.team1;
            else if (finalScores.score2_tiebreak > finalScores.score1_tiebreak) winner = finalMatch.team2;
          }
      }
      if (winner) {
          return { name: winner.name, logo: winner.logo, ownerName: winner.ownerName };
      }
    }
    return null;
  }, [isRoundComplete, hasNextRound, scores, processedFixture.rounds]);

  const getRoundName = (round: Round) => {
    const numTies = knockoutHomeAndAway ? round.matches.length / 2 : round.matches.length;

    if (numTies === 1) return 'Final';
    if (numTies === 2) return 'Semi-final';
    if (numTies === 4) return 'Quarter-final';
    if (numTies === 8) return 'Round of 16';

    return `Round ${round.round}`;
  };

  return (
    <div>
      <div className="flex gap-8 md:gap-24 overflow-x-auto pb-8 pt-4 px-4">
        {roundsWithPairs.map((round, roundIndex) => {
          const isActive = round.round === activeRound;
          return (
            <div key={`round-${round.round}-${roundIndex}`} className="flex flex-col items-center flex-shrink-0">
              <h3 className="text-2xl font-bold mb-8 text-primary tracking-wide">
                {round.name || getRoundName(round)}
              </h3>
              <div className="flex flex-col gap-12 justify-center flex-grow">
                {round.matchPairs.map((pair, pairIndex) => (
                  <div key={pairIndex} className="relative">
                    <div className="flex flex-col gap-8">
                       {pair.map(match => (
                           <MatchComponent
                                key={match.match}
                                match={match}
                                round={round.round}
                                onScoreUpdate={onScoreUpdate}
                                currentScores={scores}
                                isActive={isActive}
                                readOnly={readOnly}
                                currentUserId={currentUserId}
                            />
                       ))}
                    </div>

                    {/* Bracket lines */}
                    {roundIndex < roundsWithPairs.length - 1 && pair.length > 1 && (
                        <>
                            {/* Top horizontal line */}
                            <div className="absolute top-1/4 left-full w-4 md:w-12 h-px bg-border"></div>
                            {/* Bottom horizontal line */}
                            <div className="absolute bottom-1/4 left-full w-4 md:w-12 h-px bg-border"></div>
                            {/* Vertical line */}
                            <div className="absolute top-1/4 left-[calc(100%_+_1rem)] md:left-[calc(100%_+_3rem)] w-px h-1/2 bg-border"></div>
                        </>
                    )}
                    
                    {roundIndex < roundsWithPairs.length - 1 && (
                       // Horizontal line to next round
                       <div className="absolute top-1/2 left-[calc(100%_+_1rem)] md:left-[calc(100%_+_3rem)] w-4 md:w-12 h-px bg-border"></div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )})}
      </div>
       <div className="mt-8 flex flex-col items-center justify-center gap-4">
            <div className="flex items-center gap-4">
                <Button size="lg" variant="outline" onClick={() => onActiveRoundChange(Math.max(1, activeRound - 1))} disabled={activeRound === 1 || readOnly}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Previous Round
                </Button>
                <Button size="lg" variant="outline" onClick={() => onActiveRoundChange(activeRound + 1)} disabled={!hasNextRound || readOnly}>
                    Next Round <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
            </div>
            
            {!readOnly && !tournament.winner && (
                <div className="text-center space-y-2 border-t pt-4 mt-4 w-full max-w-lg">
                    {isRoundComplete && hasNextRound && !isRoundLocked && (
                        <>
                            <p className="text-sm text-muted-foreground">
                                All matches in this round are complete.
                            </p>
                            <Button size="lg" onClick={handleProceed} disabled={isProceeding}>
                                {isProceeding && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                                Lock Round & Proceed <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </>
                    )}
                    
                    {hasNextRound && !isRoundComplete && (
                        <p className="text-sm text-muted-foreground mt-2">
                        Enter all match results for the current round to proceed.
                        </p>
                    )}

                    {isRoundComplete && !hasNextRound && finalWinner && (
                    <div className="mt-8 text-center space-y-2">
                        <p className="text-lg font-semibold text-primary">
                        Final match complete! {finalWinner.name} is the potential champion.
                        </p>
                        <Button size="lg" onClick={() => startProceeding(() => onTournamentUpdate({ winner: finalWinner }))} disabled={isProceeding}>
                            {isProceeding && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                            <Trophy className="mr-2 h-4 w-4" /> Crown Champion & Finish
                        </Button>
                    </div>
                    )}

                    {isRoundComplete && !hasNextRound && !finalWinner && (
                    <div className="mt-8 text-center text-lg font-semibold text-primary">
                        Enter final match score to determine the winner!
                    </div>
                    )}
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
                </div>
            )}
        </div>
    </div>
  );
}
