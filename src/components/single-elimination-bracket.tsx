"use client"

import type { Match, Round, Score } from '@/types';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { useMemo, useState } from 'react';
import { MapPin, Lock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ScoreEntryDialog from './score-entry-dialog';
import { cn } from '@/lib/utils';

interface SingleEliminationBracketProps {
  fixture: { rounds: Round[] };
  scores: Record<string, Score>;
  onScoreUpdate: (matchIdentifier: string, newScore: Score) => void;
  knockoutHomeAndAway: boolean;
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
          <span>{match.team1.name}</span>
          <span className="font-bold text-lg">{score?.score1 ?? '-'}</span>
        </div>
        <div className="border-t border-border my-0"></div>
        <div className={getTeamClass(isTeam2Winner, match.team2.name).replace('rounded-t-md', 'rounded-b-md')}>
          <span>{match.team2.name}</span>
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

export default function SingleEliminationBracket({ fixture, onScoreUpdate, scores, knockoutHomeAndAway }: SingleEliminationBracketProps) {
    const [activeRound, setActiveRound] = useState(1);
    
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

        setActiveRound(prev => prev + 1);
    };

    const processedFixture = useMemo(() => {
        const newRounds = JSON.parse(JSON.stringify(fixture.rounds));

        for (let i = 0; i < newRounds.length - 1; i++) {
            const currentRound = newRounds[i];
            const nextRound = newRounds[i+1];

            currentRound.matches.forEach((match: Match) => {
                const matchId = `r${currentRound.round}m${match.match}`;
                const matchScores = scores[matchId];
                let winner: string | null = null;
                
                if (match.team1.name.toLowerCase() === 'bye') winner = match.team2.name;
                if (match.team2.name.toLowerCase() === 'bye') winner = match.team1.name;

                if (matchScores && matchScores.score1 !== null && matchScores.score2 !== null) {
                    if (matchScores.score1 > matchScores.score2) {
                        winner = match.team1.name;
                    } else if (matchScores.score2 > matchScores.score1) {
                        winner = match.team2.name;
                    }
                }
                
                if (winner) {
                    const nextMatchIndex = Math.floor((match.match -1) / 2);
                    const nextMatch = nextRound.matches[nextMatchIndex];
                    if(nextMatch) {
                        if ((match.match - 1) % 2 === 0) {
                            nextMatch.team1.name = winner;
                        } else {
                            nextMatch.team2.name = winner;
                        }
                    }
                }
            });
        }
        return { rounds: newRounds };
    }, [fixture, scores]);

  const finalWinner = useMemo(() => {
    if (isRoundComplete && !hasNextRound) {
      const finalMatch = processedFixture.rounds[processedFixture.rounds.length - 1].matches[0];
      const finalMatchId = `r${finalMatch.round}m${finalMatch.match}`;
      const finalScores = scores[finalMatchId];
      if (finalScores && finalScores.score1 !== null && finalScores.score2 !== null) {
          return finalScores.score1 > finalScores.score2 ? finalMatch.team1.name : finalMatch.team2.name;
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
      <div className="flex gap-8 md:gap-16 overflow-x-auto pb-4 px-2">
        {processedFixture.rounds.map((round, roundIndex) => {
          const isActive = round.round === activeRound;
          return (
            <div key={`round-${round.round}-${roundIndex}`} className="flex flex-col items-center flex-shrink-0">
              <h3 className="text-2xl font-bold mb-6 text-primary tracking-wide">
                {getRoundName(round)}
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
        {finalWinner && (
          <div className="flex flex-col items-center justify-center flex-shrink-0 ml-8 md:ml-16">
              <h3 className="text-2xl font-bold mb-6 text-accent tracking-wide">Winner</h3>
              <Card className="w-64 bg-accent shadow-lg text-accent-foreground">
                  <CardContent className="p-6 text-center">
                      <span className="text-2xl font-black">
                          {finalWinner}
                      </span>
                  </CardContent>
              </Card>
          </div>
        )}
      </div>
      {hasNextRound && (
        <div className="mt-8 flex flex-col items-center justify-center gap-2">
          <Button size="lg" onClick={handleProceed} disabled={!isRoundComplete}>
            Proceed to Next Round <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          {!isRoundComplete && (
            <p className="text-sm text-muted-foreground">
              Enter all match results for the current round to proceed.
            </p>
          )}
        </div>
      )}
       {isRoundComplete && !hasNextRound && !finalWinner && (
        <div className="mt-8 text-center text-lg font-semibold text-primary">
          Enter final match score to determine the winner!
        </div>
      )}
    </div>
  );
}
