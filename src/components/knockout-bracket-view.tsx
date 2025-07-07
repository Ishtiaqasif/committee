
"use client"

import type { Match, Round, Score, MatchTeam } from '@/types';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { useMemo } from 'react';
import { MapPin, Shield, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';

interface KnockoutBracketViewProps {
  fixture: { rounds: Round[] };
  scores: Record<string, Score>;
  knockoutHomeAndAway: boolean;
  awayGoalsRule: boolean;
}

const MatchComponent = ({ match, round, currentScores }: { match: Match, round: number, currentScores: any }) => {
  const matchId = `r${round}m${match.match}`;
  const score = currentScores[matchId];

  const isDraw = score && score.score1 !== null && score.score2 !== null && score.score1 === score.score2;
  const isTeam1WinnerByTiebreak = isDraw && score.score1_tiebreak != null && score.score2_tiebreak != null && score.score1_tiebreak > score.score2_tiebreak;
  const isTeam2WinnerByTiebreak = isDraw && score.score1_tiebreak != null && score.score2_tiebreak != null && score.score2_tiebreak > score.score1_tiebreak;

  const isTeam1Winner = (score && score.score1 !== null && score.score2 !== null && score.score1 > score.score2) || isTeam1WinnerByTiebreak;
  const isTeam2Winner = (score && score.score1 !== null && score.score2 !== null && score.score2 > score.score1) || isTeam2WinnerByTiebreak;

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

export default function KnockoutBracketView({ fixture, scores, knockoutHomeAndAway, awayGoalsRule }: KnockoutBracketViewProps) {
    
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

  const getRoundName = (round: Round) => {
    const numMatches = round.matches.length;
    if (numMatches === 1) return 'Final';
    if (numMatches === 2) return 'Semi-finals';
    if (numMatches === 4) return 'Quarter-finals';
    if (numMatches === 8) return 'Round of 16';

    return `Round ${round.round}`;
  };

  const roundsWithPairs = useMemo(() => {
    return processedFixture.rounds.map(round => {
        const matchPairs = [];
        for (let i = 0; i < round.matches.length; i+=2) {
            matchPairs.push(round.matches.slice(i, i + 2));
        }
        return { ...round, matchPairs };
    });
  }, [processedFixture]);


  return (
    <div>
      <div className="flex gap-8 md:gap-24 overflow-x-auto pb-8 pt-4 px-4">
        {roundsWithPairs.map((round, roundIndex) => (
            <div key={`round-${round.round}-${roundIndex}`} className="flex flex-col items-center flex-shrink-0">
              <h3 className="text-2xl font-bold mb-8 text-primary tracking-wide">
                {round.name || getRoundName(round)}
              </h3>
              <div className="flex flex-col gap-12 justify-center flex-grow">
                {round.matchPairs.map((pair, pairIndex) => (
                  <div key={pairIndex} className="relative">
                    <div className="flex flex-col gap-8">
                       {pair.map(match => (
                           <MatchComponent key={match.match} match={match} round={round.round} currentScores={scores} />
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
          ))}
      </div>
    </div>
  );
}
