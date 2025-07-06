
"use client";

import { useState, useTransition, useEffect } from "react";
import { generateTournamentFixture } from "@/ai/flows/generate-tournament-fixture";
import type { Tournament, Team, Fixture, Score, PointsTableEntry, Round, Match, TournamentCreationData } from "@/types";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import RoundRobinView from "@/components/round-robin-view";
import SingleEliminationBracket from "@/components/single-elimination-bracket";
import TeamsList from "@/components/teams-list";
import PointsTableView, { calculatePointsTable } from "@/components/points-table-view";
import { SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarFooter, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarInset } from "@/components/ui/sidebar";
import { Loader, Trophy, RefreshCw, Gamepad2, ListOrdered, Users, Settings, LayoutDashboard, ShieldCheck } from "lucide-react";
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
import QualificationSummaryView from "./qualification-summary-view";
import { ThemeToggle } from "./theme-toggle";
import TournamentSettings from "./tournament-settings";
import TournamentOverview from "./tournament-overview";
import ChampionView from "./champion-view";
import KnockoutBracketView from "./knockout-bracket-view";

interface TournamentHomeProps {
  tournament: Tournament;
  teams: Team[];
  onReset: () => void;
  onTournamentUpdate: (data: Partial<Tournament>) => void;
}

export default function TournamentHome({ tournament, teams, onReset, onTournamentUpdate }: TournamentHomeProps) {
  const [fixture, setFixture] = useState<Fixture | null>(null);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const [scores, setScores] = useState<Record<string, Score>>({});
  const [activeView, setActiveView] = useState('overview');
  
  useEffect(() => {
    if (tournament.fixture) {
      try {
        const parsedFixture = JSON.parse(tournament.fixture);
        setFixture(parsedFixture);
        setScores(tournament.scores || {});
         if (!tournament.winner) {
            setActiveView('overview');
        } else {
            setActiveView('overview');
        }
      } catch (error) {
        console.error("Failed to parse fixture:", error);
        toast({
          variant: 'destructive',
          title: 'Error loading saved fixture',
          description: 'The saved data might be corrupted. You may need to reset.',
        });
      }
    } else {
      setFixture(null);
      setScores({});
      setActiveView('overview');
    }
  }, [tournament, toast]);


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
          language: tournament.language || 'en',
        });

        const parsedFixture = JSON.parse(result.fixture);
        
        const teamMap = teams.reduce((acc, team, index) => {
            acc[`Team ${index + 1}`] = team;
            return acc;
        }, {} as Record<string, Team>)

        const mapMatches = (matches: any[]) => matches.map((match: any, matchIndex: number) => {
            const team1Info = teamMap[match.team1] || { name: match.team1, logo: undefined, ownerName: 'TBD' };
            const team2Info = teamMap[match.team2] || { name: match.team2, logo: undefined, ownerName: 'TBD' };

            return {
                ...match,
                match: match.match ?? (matchIndex + 1),
                team1: { name: team1Info.name, score: null, logo: team1Info.logo, ownerName: team1Info.ownerName },
                team2: { name: team2Info.name, score: null, logo: team2Info.logo, ownerName: team2Info.ownerName },
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
        onTournamentUpdate({ fixture: JSON.stringify(mappedFixture), scores: {}, activeRound: 1, hybridStage: 'group' });
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
    const newScores = {
        ...scores,
        [matchIdentifier]: newScore
    };
    setScores(newScores);
    onTournamentUpdate({ scores: newScores });
  }

  const handleActiveRoundChange = (round: number) => {
    onTournamentUpdate({ activeRound: round });
  }

  const handleGroupStageComplete = () => {
    onTournamentUpdate({ hybridStage: 'qualification-summary' });
  };

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
        /^(Winner) (Group .+)$/i,
        /^(Runner-up) (Group .+)$/i,
        /^(\d+)(?:st|nd|rd|th) Place (Group .+)$/i
      ];

      for (const pattern of patterns) {
        const match = placeholder.match(pattern);
        if (match) {
          const rankStr = match[1];
          const groupName = match[2];
          const table = groupStandings[groupName];

          if (!table) continue;

          let index = -1;
          if (rankStr.toLowerCase() === 'winner') index = 0;
          else if (rankStr.toLowerCase() === 'runner-up') index = 1;
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

    if (newKnockoutStage.rounds && newKnockoutStage.rounds.length > 0) {
      const firstRound = newKnockoutStage.rounds[0];
      firstRound.matches.forEach((match: Match) => {
        // Only try to replace placeholders, not actual team names that might already be there
        // or winner placeholders from previous knockout rounds
        const isPlaceholder1 = /^(Winner|Runner-up|\d+(st|nd|rd|th) Place) Group/i.test(match.team1.name)
        if (isPlaceholder1) {
          const team1 = getTeamFromPlaceholder(match.team1.name);
          if (team1) {
            match.team1 = { name: team1.name, logo: team1.logo, score: null, ownerName: team1.ownerName };
          } else {
            allTeamsFound = false;
            console.error(`Could not find qualifying team for placeholder: ${match.team1.name}`);
          }
        }
        
        const isPlaceholder2 = /^(Winner|Runner-up|\d+(st|nd|rd|th) Place) Group/i.test(match.team2.name)
        if (isPlaceholder2) {
          const team2 = getTeamFromPlaceholder(match.team2.name);
          if (team2) {
            match.team2 = { name: team2.name, logo: team2.logo, score: null, ownerName: team2.ownerName };
          } else {
            allTeamsFound = false;
            console.error(`Could not find qualifying team for placeholder: ${match.team2.name}`);
          }
        }
      });
    } else {
      allTeamsFound = false;
      console.error('Knockout stage is missing rounds.');
    }

    if (!allTeamsFound) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not map all teams to the knockout stage. The placeholder names from the AI might not match expected formats.",
      });
      return;
    }
    
    const newFixture = { ...fixture!, knockoutStage: newKnockoutStage };
    setFixture(newFixture);
    onTournamentUpdate({ fixture: JSON.stringify(newFixture), hybridStage: 'knockout', activeRound: 1 });

    toast({
      title: "Knockout Stage Ready!",
      description: "The bracket is set with the qualifying teams.",
    });
  };

  const renderFixtureView = () => {
    if (!fixture) return null;

    if (tournament.tournamentType === 'hybrid' && fixture.groupStage && fixture.knockoutStage) {
      if (tournament.hybridStage === 'group' || !tournament.hybridStage) {
        return (
          <div className="mt-4">
            <h3 className="text-2xl font-bold mb-4 text-primary">Group Stage</h3>
            <RoundRobinView 
              fixture={fixture.groupStage} 
              teams={teams} 
              scores={scores} 
              onScoreUpdate={handleScoreUpdate}
              onTournamentUpdate={onTournamentUpdate}
              isHybrid={true}
              onProceedToKnockout={handleGroupStageComplete}
              activeRound={tournament.activeRound || 1}
              onActiveRoundChange={handleActiveRoundChange}
            />
          </div>
        )
      } else if (tournament.hybridStage === 'qualification-summary') {
         return (
          <QualificationSummaryView
            groupStage={fixture.groupStage}
            teams={teams}
            scores={scores}
            tournament={tournament}
            onProceed={handleProceedToKnockout}
          />
        );
      } else { // 'knockout' stage
        return (
          <div className="mt-4">
            <h3 className="text-2xl font-bold mb-4 text-primary">Knockout Stage</h3>
            <SingleEliminationBracket 
              fixture={fixture.knockoutStage} 
              onScoreUpdate={handleScoreUpdate} 
              onTournamentUpdate={onTournamentUpdate}
              scores={scores} 
              knockoutHomeAndAway={tournament.knockoutHomeAndAway}
              activeRound={tournament.activeRound || 1}
              onActiveRoundChange={handleActiveRoundChange}
            />
          </div>
        )
      }
    }
    
    if (tournament.tournamentType === 'round-robin' && (fixture.rounds || fixture.groups)) {
      return <RoundRobinView fixture={{rounds: fixture.rounds, groups: fixture.groups}} teams={teams} scores={scores} onScoreUpdate={handleScoreUpdate} onTournamentUpdate={onTournamentUpdate} activeRound={tournament.activeRound || 1} onActiveRoundChange={handleActiveRoundChange} />;
    }

    if (tournament.tournamentType === 'single elimination' && fixture.rounds) {
      return <SingleEliminationBracket fixture={{rounds: fixture.rounds}} onScoreUpdate={handleScoreUpdate} onTournamentUpdate={onTournamentUpdate} scores={scores} knockoutHomeAndAway={tournament.knockoutHomeAndAway} activeRound={tournament.activeRound || 1} onActiveRoundChange={handleActiveRoundChange} />;
    }

    return <p>Could not display fixture.</p>;
  }

  const renderContent = () => {
    switch (activeView) {
      case 'overview':
        return <TournamentOverview 
            tournament={tournament} 
            fixture={fixture} 
            scores={scores} 
            teams={teams}
            onGenerateFixture={handleGenerateFixture}
            isGeneratingFixture={isPending}
         />;
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
        return <PointsTableView fixture={fixture!} teams={teams} scores={scores} tournamentType={tournament.tournamentType}/>;
      case 'knockout':
        const knockoutFixture = tournament.tournamentType === 'hybrid'
            ? fixture?.knockoutStage
            : fixture;

        if (!knockoutFixture || !knockoutFixture.rounds) {
            return (
                <div>
                    <h2 className="text-3xl font-bold text-primary">Knockout Bracket</h2>
                    <p className="text-muted-foreground mt-4">
                        The knockout bracket is not available for this tournament stage.
                    </p>
                </div>
            );
        }
        return (
            <div>
                <h2 className="text-3xl font-bold text-primary">Knockout Bracket</h2>
                <p className="text-muted-foreground mb-6">A view of the tournament knockout stage.</p>
                <KnockoutBracketView
                    fixture={knockoutFixture}
                    scores={scores}
                />
            </div>
        );
      case 'settings':
        return <TournamentSettings tournament={tournament} onUpdate={onTournamentUpdate} />;
      default:
        return null;
    }
  };


  return (
    <SidebarProvider>
        <Sidebar>
            <SidebarHeader>
                <div className="flex items-center justify-between p-2">
                    <div className="flex items-center gap-2 overflow-hidden">
                        <Trophy className="w-8 h-8 text-accent flex-shrink-0" />
                        <div className="flex flex-col overflow-hidden">
                            <span className="text-lg font-semibold text-primary truncate">{tournament.tournamentName}</span>
                            <span className="text-sm text-muted-foreground capitalize truncate">{tournament.tournamentType.replace('-', ' ')}</span>
                        </div>
                    </div>
                    <ThemeToggle />
                </div>
            </SidebarHeader>
            <SidebarContent>
                 <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton onClick={() => setActiveView('overview')} isActive={activeView === 'overview'}>
                            <LayoutDashboard/>
                            Overview
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <SidebarMenuButton 
                            onClick={() => setActiveView('fixtures')} 
                            isActive={activeView === 'fixtures'}
                            disabled={!fixture || !!tournament.winner}
                            tooltip={!fixture ? "Generate a fixture first" : (!!tournament.winner ? 'Tournament is complete' : "Fixtures & Scores")}
                        >
                            <Gamepad2/>
                            Fixtures & Scores
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                     <SidebarMenuItem>
                        <SidebarMenuButton 
                            onClick={() => setActiveView('points-table')} 
                            isActive={activeView === 'points-table'}
                            disabled={!fixture || tournament.tournamentType === 'single elimination'}
                            tooltip={!fixture ? "Generate a fixture first" : (tournament.tournamentType === 'single elimination' ? 'Not available for this format' : 'Points Table')}
                        >
                            <ListOrdered/>
                            Points Table
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                     <SidebarMenuItem>
                        <SidebarMenuButton
                            onClick={() => setActiveView('knockout')}
                            isActive={activeView === 'knockout'}
                            disabled={!fixture || tournament.tournamentType === 'round-robin'}
                            tooltip={!fixture ? "Generate a fixture first" : (tournament.tournamentType === 'round-robin' ? 'Not available for this format' : 'Knockout Bracket')}
                        >
                            <ShieldCheck/>
                            Knockout Bracket
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <SidebarMenuButton onClick={() => setActiveView('teams')} isActive={activeView === 'teams'}>
                            <Users/>
                            Teams
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <SidebarMenuButton onClick={() => setActiveView('settings')} isActive={activeView === 'settings'}>
                            <Settings/>
                            Settings
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
