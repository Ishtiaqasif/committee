
"use client";

import { useState, useTransition } from "react";
import { generateTournamentFixture } from "@/ai/flows/generate-tournament-fixture";
import type { Tournament, Team, Fixture, Score, PointsTableEntry, Round, Match } from "@/types";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import RoundRobinView from "@/components/round-robin-view";
import SingleEliminationBracket from "@/components/single-elimination-bracket";
import TeamsList from "@/components/teams-list";
import PointsTableView, { calculatePointsTable } from "@/components/points-table-view";
import { SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarFooter, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarInset } from "@/components/ui/sidebar";
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
  const [hybridStage, setHybridStage] = useState<'group' | 'knockout'>('group');

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
            acc[`Team ${index + 1}`] = team;
            return acc;
        }, {} as Record<string, Team>)

        const mapMatches = (matches: any[]) => matches.map((match: any, matchIndex: number) => {
            const team1Info = teamMap[match.team1] || { name: match.team1, logo: undefined };
            const team2Info = teamMap[match.team2] || { name: match.team2, logo: undefined };

            return {
                ...match,
                match: match.match ?? (matchIndex + 1),
                team1: { name: team1Info.name, score: null, logo: team1Info.logo },
                team2: { name: team2Info.name, score: null, logo: team2Info.logo },
                venue: match.venue,
            }
        });
        
        const mapRounds = (rounds: any[]) => rounds.map((round: any, roundIndex: number) => ({
            ...round,
            round: round.round ?? (roundIndex + 1),
            matches: mapMatches(round.matches)
        }));

        const mapGroups = (groups: any[]) => groups.map((group: any, groupIndex: number) => ({
            ...group,
            groupName: group.groupName ?? `Group ${String.fromCharCode(65 + groupIndex)}`,
            teams: group.teams.map((teamName: string) => (teamMap[teamName] || {name: teamName}).name),
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

  const handleProceedToKnockout = () => {
    if (!fixture || !fixture.groupStage || !fixture.knockoutStage) return;

    if (!fixture.groupStage.groups) {
      toast({
        variant: "destructive",
        title: "Configuration Error",
        description: "Hybrid tournaments with an 'all-play-all' group stage are not yet supported for automatic knockout progression.",
      });
      return;
    }

    const groupStandings: Record<string, PointsTableEntry[]> = {};
    fixture.groupStage.groups.forEach(group => {
      const groupTeams = group.teams.map(name => teams.find(t => t.name === name)!).filter(Boolean) as Team[];
      const table = calculatePointsTable(groupTeams, group.rounds, scores, group.groupName);
      groupStandings[group.groupName] = table;
    });

    const getTeamFromPlaceholder = (placeholder: string): Team | undefined => {
      const patterns = [
        /^(Winner) (Group .+)$/,
        /^(Runner-up) (Group .+)$/,
        /^(\d+)(?:st|nd|rd|th) Place (Group .+)$/
      ];

      for (const pattern of patterns) {
        const match = placeholder.match(pattern);
        if (match) {
          const rankStr = match[1];
          const groupName = match[2];
          const table = groupStandings[groupName];

          if (!table) continue;

          let index = -1;
          if (rankStr === 'Winner') index = 0;
          else if (rankStr === 'Runner-up') index = 1;
          else {
            const rankNum = parseInt(rankStr, 10);
            if (!isNaN(rankNum)) index = rankNum - 1;
          }

          if (index !== -1 && table[index]) {
            return teams.find(t => t.name === table[index].teamName);
          }
        }
      }
      return undefined;
    };

    const newKnockoutStage = JSON.parse(JSON.stringify(fixture.knockoutStage));
    let allTeamsFound = true;

    newKnockoutStage.rounds.forEach((round: Round) => {
      round.matches.forEach((match: Match) => {
        if (match.team1.name.toLowerCase() !== 'bye' && !teams.some(t => t.name === match.team1.name)) {
          const team1 = getTeamFromPlaceholder(match.team1.name);
          if (team1) {
            match.team1 = { name: team1.name, logo: team1.logo, score: null };
          } else {
            allTeamsFound = false;
            console.error(`Could not find qualifying team for placeholder: ${match.team1.name}`);
          }
        }
        if (match.team2.name.toLowerCase() !== 'bye' && !teams.some(t => t.name === match.team2.name)) {
          const team2 = getTeamFromPlaceholder(match.team2.name);
          if (team2) {
            match.team2 = { name: team2.name, logo: team2.logo, score: null };
          } else {
            allTeamsFound = false;
            console.error(`Could not find qualifying team for placeholder: ${match.team2.name}`);
          }
        }
      });
    });

    if (!allTeamsFound) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not map all teams to the knockout stage. The placeholder names from the AI might not match expected formats.",
      });
      return;
    }
    
    setFixture(prev => ({ ...prev!, knockoutStage: newKnockoutStage }));
    setHybridStage('knockout');
    toast({
      title: "Knockout Stage Ready!",
      description: "The bracket is set with the qualifying teams.",
    });
  };

  const renderFixtureView = () => {
    if (!fixture) return null;

    if (tournament.tournamentType === 'hybrid' && fixture.groupStage && fixture.knockoutStage) {
      if (hybridStage === 'group') {
        return (
          <div className="mt-4">
            <h3 className="text-2xl font-bold mb-4 text-primary">Group Stage</h3>
            <RoundRobinView 
              fixture={fixture.groupStage} 
              teams={teams} 
              scores={scores} 
              onScoreUpdate={handleScoreUpdate}
              isHybrid={true}
              onProceedToKnockout={handleProceedToKnockout}
            />
          </div>
        )
      } else { // 'knockout' stage
        return (
          <div className="mt-4">
            <h3 className="text-2xl font-bold mb-4 text-primary">Knockout Stage</h3>
            <SingleEliminationBracket 
              fixture={fixture.knockoutStage} 
              onScoreUpdate={handleScoreUpdate} 
              scores={scores} 
              knockoutHomeAndAway={tournament.knockoutHomeAndAway}
            />
          </div>
        )
      }
    }
    
    if (tournament.tournamentType === 'round-robin' && (fixture.rounds || fixture.groups)) {
      return <RoundRobinView fixture={{rounds: fixture.rounds, groups: fixture.groups}} teams={teams} scores={scores} onScoreUpdate={handleScoreUpdate} />;
    }

    if (tournament.tournamentType === 'single elimination' && fixture.rounds) {
      return <SingleEliminationBracket fixture={{rounds: fixture.rounds}} onScoreUpdate={handleScoreUpdate} scores={scores} knockoutHomeAndAway={tournament.knockoutHomeAndAway}/>;
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
