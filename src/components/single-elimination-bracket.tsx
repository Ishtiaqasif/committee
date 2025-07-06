"use client"

import type { Match, Round } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useMemo } from 'react';
import { MapPin } from 'lucide-react';

interface SingleEliminationBracketProps {
  fixture: { rounds: Round[] };
  scores: Record<string, { score1: number | null, score2: number | null }>;
  onScoreChange: (matchIdentifier: string, team1Score: number | null, team2Score: number | null) => void;
}

const MatchComponent = ({ match, round, onScoreChange, currentScores }: { match: Match, round: number, onScoreChange: SingleEliminationBracketProps['onScoreChange'], currentScores: any }) => {
  const matchId = `r${round}m${match.match}`;
  const scores = currentScores[matchId];
  const isTeam1Winner = scores && scores.score1 !== null && scores.score2 !== null && scores.score1 > scores.score2;
  const isTeam2Winner = scores && scores.score1 !== null && scores.score2 !== null && scores.score2 > scores.score1;

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
    <Card className="w-64 bg-card shadow-md">
      <CardContent className="p-0">
        <div className={getTeamClass(isTeam1Winner, match.team1.name)}>
          <span>{match.team1.name}</span>
          <Input
            type="number"
            className="w-16 h-8 text-center"
            placeholder="-"
            min="0"
            disabled={match.team1.name.toLowerCase() === 'bye' || match.team2.name.toLowerCase() === 'bye'}
            value={scores?.score1 ?? ''}
            onChange={(e) => onScoreChange(matchId, e.target.value === '' ? null : Number(e.target.value), scores?.score2 ?? null)}
          />
        </div>
        <div className="border-t border-border my-0 h-0"></div>
        <div className={getTeamClass(isTeam2Winner, match.team2.name).replace('rounded-t-md', 'rounded-b-md')}>
          <span>{match.team2.name}</span>
          <Input
            type="number"
            className="w-16 h-8 text-center"
            placeholder="-"
            min="0"
            disabled={match.team1.name.toLowerCase() === 'bye' || match.team2.name.toLowerCase() === 'bye'}
            value={scores?.score2 ?? ''}
            onChange={(e) => onScoreChange(matchId, scores?.score1 ?? null, e.target.value === '' ? null : Number(e.target.value))}
          />
        </div>
      </CardContent>
      {match.venue && (
        <div className="flex items-center justify-center gap-1.5 p-1.5 text-xs text-muted-foreground border-t">
            <MapPin className="h-3 w-3" />
            <span>{match.venue}</span>
        </div>
      )}
    </Card>
  )
}

export default function SingleEliminationBracket({ fixture, onScoreChange, scores }: SingleEliminationBracketProps) {
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


  return (
    <div className="flex gap-8 md:gap-16 overflow-x-auto pb-4 px-2">
      {processedFixture.rounds.map((round, roundIndex) => (
        <div key={`round-${round.round}-${roundIndex}`} className="flex flex-col items-center flex-shrink-0">
          <h3 className="text-2xl font-bold mb-6 text-primary tracking-wide">
            {roundIndex === processedFixture.rounds.length - 1 && round.matches.length === 1 ? 'Final' : `Round ${round.round}`}
          </h3>
          <div className="flex flex-col gap-8 justify-around h-full">
            {round.matches.map((match) => (
              <div key={match.match} className="relative">
                 <MatchComponent match={match} round={round.round} onScoreChange={onScoreChange} currentScores={scores}/>
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
      ))}
       {processedFixture.rounds[processedFixture.rounds.length - 1].matches.length === 1 && (
        <div className="flex flex-col items-center justify-center flex-shrink-0 ml-8 md:ml-16">
            <h3 className="text-2xl font-bold mb-6 text-accent tracking-wide">Winner</h3>
            <Card className="w-64 bg-accent shadow-lg text-accent-foreground">
                <CardContent className="p-6 text-center">
                    <span className="text-2xl font-black">
                        {(() => {
                            const finalMatch = processedFixture.rounds[processedFixture.rounds.length - 1].matches[0];
                            const finalMatchId = `r${finalMatch.round}m${finalMatch.match}`;
                            const finalScores = scores[finalMatchId];
                            if (finalScores && finalScores.score1 !== null && finalScores.score2 !== null) {
                                return finalScores.score1 > finalScores.score2 ? finalMatch.team1.name : finalMatch.team2.name;
                            }
                            return 'TBD';
                        })()}
                    </span>
                </CardContent>
            </Card>
        </div>
       )}
    </div>
  );
}
