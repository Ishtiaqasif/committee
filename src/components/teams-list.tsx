
"use client";

import { Team, Fixture, Score, Match, Round, Tournament, MatchTeam } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Shield, User, Swords } from 'lucide-react';
import Image from 'next/image';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useMemo } from 'react';
import { cn } from '@/lib/utils';

// This function will process knockout rounds to fill in placeholders
const processKnockoutFixture = (knockoutRounds: Round[] | undefined, scores: Record<string, Score>, knockoutHomeAndAway: boolean, awayGoalsRule: boolean): Round[] => {
    if (!knockoutRounds) return [];
    
    const newRounds = JSON.parse(JSON.stringify(knockoutRounds));

    for (let i = 0; i < newRounds.length - 1; i++) {
        const currentRound = newRounds[i];
        const nextRound = newRounds[i + 1];
        
        const getSingleMatchWinner = (match: Match): MatchTeam | null => {
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
    return newRounds;
};


// Helper function to get all matches for a specific team from the fixture
const getMatchesForTeam = (teamName: string, fixture: Fixture | null): { match: Match, roundName: string, matchId: string }[] => {
    if (!fixture) return [];

    const teamMatches: { match: Match, roundName: string, matchId: string }[] = [];

    const processRounds = (rounds: Round[] | undefined, groupName?: string) => {
        if (!rounds) return;
        rounds.forEach(round => {
            round.matches.forEach(match => {
                if (match.team1.name.toLowerCase() === 'bye' || match.team2.name.toLowerCase() === 'bye') return;
                
                if (match.team1.name === teamName || match.team2.name === teamName) {
                    const matchId = groupName 
                        ? `g${groupName}r${round.round}m${match.match}`
                        : `r${round.round}m${match.match}`;
                    teamMatches.push({ match, roundName: round.name || `Round ${round.round}`, matchId });
                }
            });
        });
    };

    if (fixture.rounds) {
        processRounds(fixture.rounds);
    }
    if (fixture.groups) {
        fixture.groups.forEach(g => processRounds(g.rounds, g.groupName));
    }
    if (fixture.groupStage) {
        processRounds(fixture.groupStage.rounds);
        if (fixture.groupStage.groups) {
            fixture.groupStage.groups.forEach(g => processRounds(g.rounds, g.groupName));
        }
    }
    if (fixture.knockoutStage) {
        processRounds(fixture.knockoutStage.rounds);
    }
    
    // Sort matches by round
    return teamMatches.sort((a, b) => {
      const roundA = a.matchId.match(/r(\d+)/);
      const roundB = b.matchId.match(/r(\d+)/);
      if (roundA && roundB) {
        return parseInt(roundA[1]) - parseInt(roundB[1]);
      }
      return 0;
    });
};


export default function TeamsList({ teams, fixture, scores, tournament, currentUserId }: { teams: Team[]; fixture: Fixture | null; scores: Record<string, Score>, tournament: Tournament, currentUserId?: string }) {
    
    const sortedTeams = useMemo(() => {
        if (!currentUserId) return teams;

        const myTeamIndex = teams.findIndex(t => t.ownerId === currentUserId);

        if (myTeamIndex > -1) {
            const myTeam = teams[myTeamIndex];
            const otherTeams = [...teams];
            otherTeams.splice(myTeamIndex, 1);
            return [myTeam, ...otherTeams];
        }
        return teams;

    }, [teams, currentUserId]);

    const processedFixture = useMemo(() => {
        if (!fixture) return null;
        if (tournament.tournamentType === 'round-robin' && !fixture.knockoutStage) return fixture;

        const newFixture = JSON.parse(JSON.stringify(fixture));
        const knockoutRounds = newFixture.knockoutStage?.rounds ?? newFixture.rounds;
        
        const processedKnockoutRounds = processKnockoutFixture(
            knockoutRounds,
            scores,
            tournament.knockoutHomeAndAway ?? false,
            tournament.awayGoalsRule ?? false
        );

        if (newFixture.knockoutStage) {
            newFixture.knockoutStage.rounds = processedKnockoutRounds;
        } else if (newFixture.rounds) {
            newFixture.rounds = processedKnockoutRounds;
        }

        return newFixture;

    }, [fixture, scores, tournament]);

    if (!fixture) {
        // Render original view if no fixture is generated
        return (
             <div>
                <h2 className="text-3xl font-bold text-primary">Registered Teams</h2>
                <p className="text-muted-foreground">A total of {teams.length} teams are participating.</p>
                <div className="mt-6 grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]">
                    {sortedTeams.map(team => (
                        <Card key={team.id} className={cn(
                            "bg-secondary/50 transition-colors",
                            team.ownerId === currentUserId && "bg-primary/10 border-primary"
                        )}>
                            <CardContent className="p-4 flex items-center gap-3">
                               {team.logo ? (
                                    <Image src={team.logo} alt={`${team.name} logo`} width={40} height={40} className="rounded-full bg-background object-cover" />
                                ) : (
                                    <div className="h-10 w-10 flex-shrink-0 rounded-full bg-muted flex items-center justify-center">
                                        <Shield className="h-6 w-6 text-primary/80"/>
                                    </div>
                                )}
                                <div className="flex flex-col overflow-hidden">
                                    <span className="font-medium text-lg truncate">{team.name}</span>
                                    {team.ownerName && (
                                        <span className="text-sm text-muted-foreground flex items-center gap-1.5 truncate">
                                            <User className="h-3 w-3 flex-shrink-0" />
                                            {team.ownerName}
                                        </span>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div>
            <h2 className="text-3xl font-bold text-primary">Teams & Fixtures</h2>
            <p className="text-muted-foreground">Expand each team to see their schedule.</p>
            <Accordion type="single" collapsible className="w-full mt-6 space-y-2">
                {sortedTeams.map(team => {
                    const teamMatches = getMatchesForTeam(team.name, processedFixture);

                    return (
                        <AccordionItem value={team.id} key={team.id} className={cn(
                            "border rounded-lg bg-card overflow-hidden transition-colors",
                             team.ownerId === currentUserId && "bg-primary/10 border-primary"
                        )}>
                            <AccordionTrigger className="p-4 hover:no-underline">
                                <div className="flex items-center gap-3 w-full">
                                    {team.logo ? (
                                        <Image src={team.logo} alt={`${team.name} logo`} width={40} height={40} className="rounded-full bg-background object-cover" />
                                    ) : (
                                        <div className="h-10 w-10 flex-shrink-0 rounded-full bg-muted flex items-center justify-center">
                                            <Shield className="h-6 w-6 text-primary/80"/>
                                        </div>
                                    )}
                                    <div className="flex flex-col items-start overflow-hidden">
                                        <span className="font-medium text-lg truncate">{team.name}</span>
                                        {team.ownerName && (
                                            <span className="text-sm text-muted-foreground flex items-center gap-1.5 truncate">
                                                <User className="h-3 w-3 flex-shrink-0" />
                                                {team.ownerName}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="p-4 pt-0">
                                {teamMatches.length > 0 ? (
                                    <ul className="space-y-2">
                                        <li className="flex items-center justify-between text-xs text-muted-foreground px-2">
                                            <span>Opponent</span>
                                            <span>Result</span>
                                        </li>
                                        {teamMatches.map(({ match, roundName, matchId }) => {
                                            const scoreData = scores[matchId];
                                            const opponent = match.team1.name === team.name ? match.team2 : match.team1;
                                            const teamScore = match.team1.name === team.name ? scoreData?.score1 : scoreData?.score2;
                                            const opponentScore = match.team1.name === team.name ? scoreData?.score2 : scoreData?.score1;
                                            const teamTiebreakScore = match.team1.name === team.name ? scoreData?.score1_tiebreak : scoreData?.score2_tiebreak;
                                            const opponentTiebreakScore = match.team1.name === team.name ? scoreData?.score2_tiebreak : scoreData?.score1_tiebreak;
                                            
                                            let resultIndicator;
                                            if (teamScore !== null && teamScore !== undefined && opponentScore !== null && opponentScore !== undefined) {
                                                if (teamScore > opponentScore) {
                                                    resultIndicator = <span className="font-bold text-accent">W</span>;
                                                } else if (teamScore < opponentScore) {
                                                    resultIndicator = <span className="font-bold text-destructive">L</span>;
                                                } else { // Draw
                                                    if (teamTiebreakScore != null && opponentTiebreakScore != null) {
                                                        if (teamTiebreakScore > opponentTiebreakScore) {
                                                            resultIndicator = <span className="font-bold text-accent">W</span>;
                                                        } else if (teamTiebreakScore < opponentTiebreakScore) {
                                                            resultIndicator = <span className="font-bold text-destructive">L</span>;
                                                        } else {
                                                            resultIndicator = <span className="font-bold text-muted-foreground">D</span>;
                                                        }
                                                    } else {
                                                        resultIndicator = <span className="font-bold text-muted-foreground">D</span>;
                                                    }
                                                }
                                            }

                                            let scoreString = 'TBD';
                                            if (scoreData) {
                                                scoreString = `${teamScore ?? '-'} : ${opponentScore ?? '-'}`;
                                                if (teamScore !== null && teamScore === opponentScore && teamTiebreakScore != null && opponentTiebreakScore != null) {
                                                    scoreString += ` (${teamTiebreakScore} - ${opponentTiebreakScore})`;
                                                }
                                            }

                                            return (
                                                <li key={matchId} className="flex items-center justify-between text-sm p-2 bg-background rounded-md border">
                                                    <div className="flex items-center gap-3">
                                                        <Swords className="h-4 w-4 text-muted-foreground"/>
                                                        <span className="font-medium">{opponent.name}</span>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <span className="font-mono text-sm">{scoreString}</span>
                                                        <div className="w-4 text-center">{resultIndicator}</div>
                                                        <span className="text-muted-foreground text-xs w-20 text-right truncate">{roundName}</span>
                                                    </div>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                ) : (
                                    <p className="text-muted-foreground text-sm text-center py-4">This team has no scheduled matches in the current fixture.</p>
                                )}
                            </AccordionContent>
                        </AccordionItem>
                    )
                })}
            </Accordion>
        </div>
    );
}
