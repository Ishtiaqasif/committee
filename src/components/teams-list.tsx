
"use client";

import type { Team, Fixture, Score, Match, Round } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Shield, User, Swords } from 'lucide-react';
import Image from 'next/image';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

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


export default function TeamsList({ teams, fixture, scores }: { teams: Team[]; fixture: Fixture | null; scores: Record<string, Score> }) {
    if (!fixture) {
        // Render original view if no fixture is generated
        return (
             <div>
                <h2 className="text-3xl font-bold text-primary">Registered Teams</h2>
                <p className="text-muted-foreground">A total of {teams.length} teams are participating.</p>
                <div className="mt-6 grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]">
                    {teams.map(team => (
                        <Card key={team.id} className="bg-secondary/50">
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
                {teams.map(team => {
                    const teamMatches = getMatchesForTeam(team.name, fixture);

                    return (
                        <AccordionItem value={team.id} key={team.id} className="border rounded-lg bg-card overflow-hidden">
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
                                            
                                            let resultIndicator;
                                            if (teamScore !== null && teamScore !== undefined && opponentScore !== null && opponentScore !== undefined) {
                                                if (teamScore > opponentScore) {
                                                    resultIndicator = <span className="font-bold text-accent">W</span>;
                                                } else if (teamScore < opponentScore) {
                                                    resultIndicator = <span className="font-bold text-destructive">L</span>;
                                                } else {
                                                    resultIndicator = <span className="font-bold text-muted-foreground">D</span>;
                                                }
                                            }

                                            return (
                                                <li key={matchId} className="flex items-center justify-between text-sm p-2 bg-background rounded-md border">
                                                    <div className="flex items-center gap-3">
                                                        <Swords className="h-4 w-4 text-muted-foreground"/>
                                                        <span className="font-medium">{opponent.name}</span>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <span className="font-mono text-sm">{scoreData ? `${teamScore ?? '-'} : ${opponentScore ?? '-'}` : 'TBD'}</span>
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
