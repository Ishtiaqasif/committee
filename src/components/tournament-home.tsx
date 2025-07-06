"use client";

import { useState, useTransition } from "react";
import { generateTournamentFixture } from "@/ai/flows/generate-tournament-fixture";
import type { Tournament, Team, Fixture, Score } from "@/types";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import RoundRobinView from "@/components/round-robin-view";
import SingleEliminationBracket from "@/components/single-elimination-bracket";
import TeamsList from "@/components/teams-list";
import PointsTableView from "@/components/points-table-view";
import { SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarFooter, SidebarInset, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar";
import { Loader, Trophy, RefreshCw, Gamepad2, ListOrdered, Users } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface TournamentHomeProps {
  tournament: Tournament;
  teams: Team[];
  onReset: () => void;
}

export default function TournamentHome({ tournament, teams, onReset }: TournamentHomeProps) {
  const [fixture, setFixture] = useState<Fixture | null>(null);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const [scores, setScores] = useState<Record<string, Score>>({});
  const [activeView, setActiveView] = useState('fixtures');

  const handleGenerateFixture = () => {
    startTransition(async () => {
      try {
        const result = await generateTournamentFixture({
          tournamentType: tournament.tournamentType,
          numberOfTeams: tournament.numberOfTeams,
          tournamentName: tournament.tournamentName,
          isEsports: tournament.isEsports,
          venues: tournament.venues,
          roundRobinGrouping: tournament.roundRobinGrouping,
          teamsPerGroup: tournament.teamsPerGroup,
          roundRobinHomeAndAway: tournament.roundRobinHomeAndAway,
          knockoutHomeAndAway: tournament.knockoutHomeAndAway,
          teamsAdvancing: tournament.teamsAdvancing,
          fixtureGeneration: tournament.fixtureGeneration,
        });

        const parsedFixture = JSON.parse(result.fixture);
        
        const teamMap = teams.reduce((acc, team, index) => {
            acc[`Team ${index + 1}`] = team.name;
            return acc;
        }, {} as Record<string, string>)

        const mapMatches = (matches: any[]) => matches.map((match: any, matchIndex: number) => ({
            ...match,
            match: match.match ?? (matchIndex + 1),
            team1: { name: teamMap[match.team1] || match.team1, score: null },
            team2: { name: teamMap[match.team2] || match.team2, score: null },
            venue: match.venue,
        }));
        
        const mapRounds = (rounds: any[]) => rounds.map((round: any, roundIndex: number) => ({
            ...round,
            round: round.round ?? (roundIndex + 1),
            matches: mapMatches(round.matches)
        }));

        const mapGroups = (groups: any[]) => groups.map((group: any, groupIndex: number) => ({
            ...group,
            groupName: group.groupName ?? `Group ${String.fromCharCode(65 + groupIndex)}`,
            teams: group.teams.map((teamName: string) => teamMap[teamName] || teamName),
            rounds: mapRounds(group.rounds)
        }));

        let mappedFixture: Fixture;

        if (tournament.tournamentType === 'hybrid') {
            if (!parsedFixture.groupStage || !parsedFixture.knockoutStage) {
                throw new Error("Hybrid fixture is missing groupStage or knockoutStage");
            }
            
            const groupStage = parsedFixture.groupStage.groups 
                ? { groups: mapGroups(parsedFixture.groupStage.groups) } 
                : { rounds: mapRounds(parsedFixture.groupStage.rounds) };

            mappedFixture = {
                groupStage: groupStage,
                knockoutStage: { rounds: mapRounds(parsedFixture.knockoutStage.rounds) }
            };
        } else if (tournament.tournamentType === 'round-robin' && parsedFixture.groups) {
             mappedFixture = {
                groups: mapGroups(parsedFixture.groups)
            };
        } else {
            if (!parsedFixture.rounds) {
                throw new Error("Fixture is missing rounds");
            }
            mappedFixture = {
                rounds: mapRounds(parsedFixture.rounds)
            };
        }

        setFixture(mappedFixture);
        toast({
          title: "Fixture Generated!",
          description: "The tournament fixture is ready.",
        });
      } catch (error) {
        console.error("Failed to generate fixture:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Could not generate or parse the fixture. Please try again.",
        });
      }
    });
  };

  const handleScoreUpdate = (matchIdentifier: string, newScore: Score) => {
    setScores(prev => ({
        ...prev,
        [matchIdentifier]: newScore
    }))
  }

  const renderFixtureView = () => {
    if (!fixture) return null;

    if (tournament.tournamentType === 'hybrid' && fixture.groupStage && fixture.knockoutStage) {
      return (
        <Tabs defaultValue="group-stage" className="mt-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="group-stage">Group Stage</TabsTrigger>
            <TabsTrigger value="knockout-stage">Knockout Stage</TabsTrigger>
          </TabsList>
          <TabsContent value="group-stage" className="mt-6">
            <RoundRobinView fixture={fixture.groupStage} teams={teams} scores={scores} onScoreUpdate={handleScoreUpdate} />
          </TabsContent>
          <TabsContent value="knockout-stage" className="mt-6">
            <SingleEliminationBracket fixture={fixture.knockoutStage} onScoreUpdate={handleScoreUpdate} scores={scores} />
          </TabsContent>
        </Tabs>
      );
    }
    
    if (tournament.tournamentType === 'round-robin' && (fixture.rounds || fixture.groups)) {
      return <RoundRobinView fixture={{rounds: fixture.rounds, groups: fixture.groups}} teams={teams} scores={scores} onScoreUpdate={handleScoreUpdate} />;
    }

    if (tournament.tournamentType === 'single elimination' && fixture.rounds) {
      return <SingleEliminationBracket fixture={{rounds: fixture.rounds}} onScoreUpdate={handleScoreUpdate} scores={scores}/>;
    }

    return <p>Could not display fixture.</p>;
  }

  const renderContent = () => {
    if (!fixture) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center">
            <Trophy className="mx-auto h-12 w-12 text-accent" />
            <h2 className="mt-4 text-2xl font-semibold">Teams Registered!</h2>
            <p className="mt-2 text-muted-foreground">Ready to generate the tournament fixture.</p>
            <Button onClick={handleGenerateFixture} disabled={isPending} size="lg" className="mt-6">
            {isPending && <Loader className="mr-2 h-4 w-4 animate-spin" />}
            {isPending ? "Generating..." : "Generate Fixture"}
            </Button>
        </div>
      );
    }

    switch (activeView) {
      case 'fixtures':
        return (
            <div>
                 <h2 className="text-3xl font-bold text-primary">Fixtures & Scores</h2>
                 <p className="text-muted-foreground capitalize">View matches and enter scores.</p>
                 {renderFixtureView()}
            </div>
        );
      case 'teams':
        return <TeamsList teams={teams} />;
      case 'points-table':
        return <PointsTableView fixture={fixture} teams={teams} scores={scores} tournamentType={tournament.tournamentType}/>;
      default:
        return null;
    }
  };


  return (
    <SidebarProvider>
        <Sidebar>
            <SidebarHeader>
                <div className="flex items-center gap-2 p-2">
                    <Trophy className="w-8 h-8 text-accent" />
                    <div className="flex flex-col">
                        <span className="text-lg font-semibold text-primary truncate">{tournament.tournamentName}</span>
                        <span className="text-sm text-muted-foreground capitalize">{tournament.tournamentType.replace('-', ' ')}</span>
                    </div>
                </div>
            </SidebarHeader>
            <SidebarContent>
                 <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton onClick={() => setActiveView('fixtures')} isActive={activeView === 'fixtures'}>
                            <Gamepad2/>
                            Fixtures & Scores
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                     <SidebarMenuItem>
                        <SidebarMenuButton onClick={() => setActiveView('points-table')} isActive={activeView === 'points-table'}>
                            <ListOrdered/>
                            Points Table
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <SidebarMenuButton onClick={() => setActiveView('teams')} isActive={activeView === 'teams'}>
                            <Users/>
                            Teams
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarContent>
            <SidebarFooter>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="outline" className="w-full">
                            <RefreshCw className="mr-2 h-4 w-4" /> Reset Tournament
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will reset the entire tournament, including teams and fixtures.
                        </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={onReset}>Continue</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </SidebarFooter>
        </Sidebar>
        <SidebarInset>
            <div className="p-4 sm:p-6 lg:p-8 h-full">
                {renderContent()}
            </div>
        </SidebarInset>
    </SidebarProvider>
  );
}
