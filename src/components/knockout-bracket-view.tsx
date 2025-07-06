"use client"

import type { Match, Round, Score, Tournament } from '@/types';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { useMemo } from 'react';
import { MapPin, Shield, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';

interface KnockoutBracketViewProps {
  fixture: { rounds: Round[] };
  scores: Record<string, Score>;
}

const MatchComponent = ({ match, round, currentScores }: { match: Match, round: number, currentScores: any }) => {
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
    <Card className={cn("w-64 bg-card shadow-md")}>
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
       {match.venue && (
         <CardFooter className="p-2">
            <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground w-full">
                <MapPin className="h-3 w-3" />
                <span>{match.venue}</span>
            </div>
        </CardFooter>
       )}
    </Card>
  )
}

export default function KnockoutBracketView({ fixture, scores }: KnockoutBracketViewProps) {
    
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

  const getRoundName = (round: Round) => {
    const numMatches = round.matches.length;
    if (numMatches === 1) return 'Final';
    if (numMatches === 2) return 'Semi-finals';
    if (numMatches === 4) return 'Quarter-finals';
    if (numMatches === 8) return 'Round of 16';

    return `Round ${round.round}`;
  };

  return (
    <div>
      <div className="flex gap-8 md:gap-16 overflow-x-auto pb-4 px-2">
        {processedFixture.rounds.map((round, roundIndex) => (
            <div key={`round-${round.round}-${roundIndex}`} className="flex flex-col items-center flex-shrink-0">
              <h3 className="text-2xl font-bold mb-6 text-primary tracking-wide">
                {round.name || getRoundName(round)}
              </h3>
              <div className="flex flex-col gap-8 justify-around h-full">
                {round.matches.map((match) => (
                  <div key={match.match} className="relative">
                    <MatchComponent match={match} round={round.round} currentScores={scores} />
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
      </div>
    </div>
  );
}
