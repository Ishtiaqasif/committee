"use client"

import type { Match, Round, Score, Tournament } from '@/types';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { useMemo, useState, useEffect } from 'react';
import { MapPin, Lock, ArrowRight, Shield, ArrowLeft, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ScoreEntryDialog from './score-entry-dialog';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import ChampionView from './champion-view';

interface SingleEliminationBracketProps {
  fixture: { rounds: Round[] };
  scores: Record<string, Score>;
  onScoreUpdate: (matchIdentifier: string, newScore: Score) => void;
  onTournamentUpdate: (data: Partial<Tournament>) => void;
  knockoutHomeAndAway: boolean;
  activeRound: number;
  onActiveRoundChange: (round: number) => void;
}

const MatchComponent = ({ match, round, onScoreUpdate, currentScores, isActive }: { match: Match, round: number, onScoreUpdate: SingleEliminationBracketProps['onScoreUpdate'], currentScores: any, isActive: boolean }) => {
  const matchId = `r${round}m${match.match}`;
  const score = currentScores[matchId];
  const isTeam1Winner = score && score.score1 !== null && score.score2 !== null && score.score1 > score.score2;
  const isTeam2Winner = score && score.score1 !== null && score.score2 !== null && score.score2 > score.score1;

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
    <Card className={cn("w-64 bg-card shadow-md transition-all", isActive && !score?.locked && "border-primary ring-2 ring-primary")}>
      <CardContent className="p-0">
        <div className={getTeamClass(isTeam1Winner, match.team1.name)}>
          <div className="flex items-center gap-2">
            {match.team1.logo ? <Image src={match.team1.logo} alt={`${match.team1.name} logo`} width={20} height={20} className="rounded-full" /> : <Shield className="h-5 w-5" />}
            <span>{match.team1.name}</span>
          </div>
          <span className="font-bold text-lg">{score?.score1 ?? '-'}</span>
        </div>
        <div className="border-t border-border my-0"></div>
        <div className={getTeamClass(isTeam2Winner, match.team2.name).replace('rounded-t-md', 'rounded-b-md')}>
          <div className="flex items-center gap-2">
            {match.team2.logo ? <Image src={match.team2.logo} alt={`${match.team2.name} logo`} width={20} height={20} className="rounded-full" /> : <Shield className="h-5 w-5" />}
            <span>{match.team2.name}</span>
          </div>
          <span className="font-bold text-lg">{score?.score2 ?? '-'}</span>
        </div>
      </CardContent>
       <CardFooter className="p-2 flex-col gap-2 items-stretch">
        <div className="flex items-center justify-center gap-4 w-full">
            <ScoreEntryDialog
                match={match}
                currentScore={score}
                onScoreSave={(newScore) => onScoreUpdate(matchId, newScore)}
            >
                <Button className="flex-grow" variant="outline" size="sm" disabled={score?.locked || !isActive || match.team1.name.toLowerCase() === 'bye' || match.team2.name.toLowerCase() === 'bye'}>
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

export default function SingleEliminationBracket({ fixture, onScoreUpdate, onTournamentUpdate, scores, knockoutHomeAndAway, activeRound, onActiveRoundChange }: SingleEliminationBracketProps) {
    
    const { isRoundComplete, hasNextRound } = useMemo(() => {
        const currentRound = fixture.rounds.find(r => r.round === activeRound);
        if (!currentRound) return { isRoundComplete: false, hasNextRound: false };

        const currentRoundMatches = currentRound.matches.filter(m => m.team1.name.toLowerCase() !== 'bye' && m.team2.name.toLowerCase() !== 'bye');
        
        const complete = currentRoundMatches.every(match => {
            const matchId = `r${currentRound.round}m${match.match}`;
            const score = scores[matchId];
            return score?.score1 !== null && score?.score2 !== null && score?.score1 !== undefined && score?.score2 !== undefined;
        });

        const next = fixture.rounds.some(r => r.round === activeRound + 1);

        return { isRoundComplete: complete, hasNextRound: next };
    }, [activeRound, fixture.rounds, scores]);

    const handleProceed = () => {
        const currentRound = fixture.rounds.find(r => r.round === activeRound);
        if (!currentRound) return;

        currentRound.matches.forEach(match => {
            const matchId = `r${currentRound.round}m${match.match}`;
            const score = scores[matchId] || { score1: null, score2: null, locked: false };
            onScoreUpdate(matchId, { ...score, locked: true });
        });

        onActiveRoundChange(activeRound + 1);
    };

    const handleGoBack = () => {
        onActiveRoundChange(Math.max(1, activeRound - 1));
    };

    const processedFixture = useMemo(() => {
        const newRounds = JSON.parse(JSON.stringify(fixture.rounds));

        for (let i = 0; i < newRounds.length - 1; i++) {
            const currentRound = newRounds[i];
            const nextRound = newRounds[i+1];

            currentRound.matches.forEach((match: Match) => {
                const matchId = `r${currentRound.round}m${match.match}`;
                const matchScores = scores[matchId];
                let winner: { name: string, logo?: string } | null = null;
                
                if (match.team1.name.toLowerCase() === 'bye') winner = match.team2;
                if (match.team2.name.toLowerCase() === 'bye') winner = match.team1;

                if (matchScores && matchScores.score1 !== null && matchScores.score2 !== null) {
                    if (matchScores.score1 > matchScores.score2) {
                        winner = match.team1;
                    } else if (matchScores.score2 > matchScores.score1) {
                        winner = match.team2;
                    }
                }
                
                if (winner) {
                    const nextMatchIndex = Math.floor((match.match -1) / 2);
                    const nextMatch = nextRound.matches[nextMatchIndex];
                    if(nextMatch) {
                        if ((match.match - 1) % 2 === 0) {
                            nextMatch.team1 = winner;
                        } else {
                            nextMatch.team2 = winner;
                        }
                    }
                }
            });
        }
        return { rounds: newRounds };
    }, [fixture, scores]);

  const finalWinner = useMemo(() => {
    if (isRoundComplete && !hasNextRound) {
      const finalRound = processedFixture.rounds[processedFixture.rounds.length - 1];
      if (!finalRound || finalRound.matches.length !== 1) return null;
      
      const finalMatch = finalRound.matches[0];
      const finalMatchId = `r${finalRound.round}m${finalMatch.match}`;
      const finalScores = scores[finalMatchId];
      if (finalScores && finalScores.score1 !== null && finalScores.score2 !== null) {
          return finalScores.score1 > finalScores.score2 ? finalMatch.team1 : finalMatch.team2;
      }
    }
    return null;
  }, [isRoundComplete, hasNextRound, scores, processedFixture.rounds]);

  useEffect(() => {
    if (finalWinner) {
      onTournamentUpdate({ winner: finalWinner });
    }
  }, [finalWinner, onTournamentUpdate]);

  if (finalWinner) {
    return <ChampionView winner={finalWinner} />;
  }

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
      <div className="flex gap-8 md:gap-16 overflow-x-auto pb-4 px-2">
        {processedFixture.rounds.map((round, roundIndex) => {
          const isActive = round.round === activeRound;
          return (
            <div key={`round-${round.round}-${roundIndex}`} className="flex flex-col items-center flex-shrink-0">
              <h3 className="text-2xl font-bold mb-6 text-primary tracking-wide">
                {round.name || getRoundName(round)}
              </h3>
              <div className="flex flex-col gap-8 justify-around h-full">
                {round.matches.map((match) => (
                  <div key={match.match} className="relative">
                    <MatchComponent match={match} round={round.round} onScoreUpdate={onScoreUpdate} currentScores={scores} isActive={isActive} />
                    {roundIndex < processedFixture.rounds.length -1 && (
                        <div className="absolute top-1/2 -right-4 md:-right-8 w-4 md:w-8 h-px bg-border -translate-y-1/2"></div>
                    )}
                    {roundIndex > 0 && (
                        <div className="absolute top-1/2 -left-4 md:-left-8 w-4 md:w-8 h-px bg-border -translate-y-1/2"></div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )})}
      </div>
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
      </div>
       {isRoundComplete && !hasNextRound && !finalWinner && (
        <div className="mt-8 text-center text-lg font-semibold text-primary">
          Enter final match score to determine the winner!
        </div>
      )}
    </div>
  );
}
