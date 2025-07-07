
"use client";

import { useState, useTransition, useEffect } from "react";
import { generateTournamentFixture } from "@/ai/flows/generate-tournament-fixture";
import type { Tournament, Team, Fixture, Score, PointsTableEntry, Round, Match, TournamentCreationData, UserRole } from "@/types";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import RoundRobinView from "@/components/round-robin-view";
import SingleEliminationBracket from "@/components/single-elimination-bracket";
import TeamsList from "@/components/teams-list";
import PointsTableView, { calculatePointsTable } from "@/components/points-table-view";
import { SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarFooter, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Loader, Trophy, RefreshCw, Gamepad2, ListOrdered, Users, Settings, LayoutDashboard, ShieldCheck, UserCog, Bot } from "lucide-react";
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
import AuthButton from "./auth-button";
import { useAuth } from "@/context/auth-context";
import UserManagement from "./user-management";
import { SheetTitle } from "./ui/sheet";

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
  const { user } = useAuth();
  
  const [userRole, setUserRole] = useState<UserRole>('guest');

  useEffect(() => {
    if (user && tournament) {
      if (user.uid === tournament.creatorId) {
        setUserRole('owner');
      } else if (tournament.admins?.includes(user.uid)) {
        setUserRole('admin');
      } else if (tournament.participants?.includes(user.uid)) {
        setUserRole('participant');
      } else {
        setUserRole('guest');
      }
    } else {
      setUserRole('guest');
    }
  }, [user, tournament]);

  const isPrivilegedUser = userRole === 'owner' || userRole === 'admin';
  const canAccessSettings = userRole === 'owner';
  
  useEffect(() => {
    // This effect handles syncing the local fixture/scores state
    // with the tournament prop from the parent.
    setFixture(tournament.fixture || null);
    setScores(tournament.scores || {});
  }, [tournament.fixture, tournament.scores]);

  useEffect(() => {
    // This effect handles setting the default view when major
    // tournament state changes occur (e.g., loading for the first time,
    // or a winner is declared).
    if (!tournament.id) return; // Guard against running on initial empty state
    
    const isMajorStateChange = (tournament.winner || !tournament.fixture);
    
    // Only reset the view if it's not already the default and a major change happened.
    if (isMajorStateChange && activeView !== 'overview') {
        setActiveView('overview');
    }
  }, [tournament.id, tournament.fixture, tournament.winner, activeView]);


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
            // The AI might use "Team 1", "Team 2", etc. as placeholders.
            // We map these generic names to the actual team data provided earlier.
            acc[`Team ${index + 1}`] = team;
            return acc;
        }, {} as Record<string, Team>)

        // This function replaces placeholder team names in matches with actual team data.
        const mapMatches = (matches: any[]) => matches.map((match: any, matchIndex: number) => {
            const team1Info = teamMap[match.team1] || { name: match.team1, logo: null, ownerName: 'TBD' };
            const team2Info = teamMap[match.team2] || { name: match.team2, logo: null, ownerName: 'TBD' };

            return {
                ...match,
                match: match.match ?? (matchIndex + 1), // Ensure a match number exists
                team1: { name: team1Info.name, score: null, logo: team1Info.logo || null, ownerName: team1Info.ownerName || null },
                team2: { name: team2Info.name, score: null, logo: team2Info.logo || null, ownerName: team2Info.ownerName || null },
                venue: match.venue || null,
            }
        });
        
        const mapRounds = (rounds: any[]) => rounds.map((round: any, roundIndex: number) => ({
            ...round,
            round: round.round ?? (roundIndex + 1), // Ensure a round number exists
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
        onTournamentUpdate({ fixture: mappedFixture, scores: {}, activeRound: 1, hybridStage: 'group' });
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

  const handleSimulateRound = () => {
    if (!fixture || !isPrivilegedUser) return;

    const newScores: Record<string, Score> = { ...scores };
    const activeRoundNumber = tournament.activeRound || 1;

    const simulateScoresForMatches = (matches: Match[], getMatchId: (match: Match) => string) => {
        matches.forEach(match => {
            const matchId = getMatchId(match);
            const isBye = match.team1.name.toLowerCase() === 'bye' || match.team2.name.toLowerCase() === 'bye';
            
            // Only simulate if score doesn't exist
            if (!newScores[matchId] && !isBye) {
                let score1 = Math.floor(Math.random() * 6); // 0-5
                let score2 = Math.floor(Math.random() * 6); // 0-5
                let score1_tiebreak: number | null = null;
                let score2_tiebreak: number | null = null;

                const isKnockout = tournament.tournamentType === 'single elimination' || (tournament.tournamentType === 'hybrid' && tournament.hybridStage === 'knockout');
                
                if (isKnockout && score1 === score2) {
                    // Ensure tie-breaker is not a draw
                    score1_tiebreak = Math.floor(Math.random() * 5); // 0-4
                    do {
                        score2_tiebreak = Math.floor(Math.random() * 5);
                    } while (score1_tiebreak === score2_tiebreak);
                }

                newScores[matchId] = {
                    score1,
                    score2,
                    score1_tiebreak,
                    score2_tiebreak,
                    locked: false,
                };
            }
        });
    }

    const processStage = (stage: { rounds?: Round[], groups?: Group[] }, getMatchId: (match: Match, groupName?: string) => string) => {
        if (stage.groups) {
            stage.groups.forEach(group => {
                const round = group.rounds.find(r => r.round === activeRoundNumber);
                if (round) {
                    simulateScoresForMatches(round.matches, (match) => getMatchId(match, group.groupName));
                }
            });
        } else if (stage.rounds) {
            const round = stage.rounds.find(r => r.round === activeRoundNumber);
            if (round) {
                simulateScoresForMatches(round.matches, (match) => getMatchId(match));
            }
        }
    };
    
    if (tournament.tournamentType === 'hybrid') {
        if (tournament.hybridStage === 'group' && fixture.groupStage) {
            processStage(fixture.groupStage, (match, groupName) => `g${groupName}r${activeRoundNumber}m${match.match}`);
        } else if (tournament.hybridStage === 'knockout' && fixture.knockoutStage) {
            processStage(fixture.knockoutStage, (match) => `r${activeRoundNumber}m${match.match}`);
        }
    } else if (tournament.tournamentType === 'round-robin') {
        processStage(fixture, (match, groupName) => groupName ? `g${groupName}r${activeRoundNumber}m${match.match}` : `r${activeRoundNumber}m${match.match}`);
    } else if (tournament.tournamentType === 'single elimination') {
        processStage(fixture, (match) => `r${activeRoundNumber}m${match.match}`);
    }
    
    onTournamentUpdate({ scores: newScores });
    toast({
      title: "Round Simulated",
      description: `Random scores have been generated for Round ${activeRoundNumber}.`,
    });
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
    onTournamentUpdate({ fixture: newFixture, hybridStage: 'knockout', activeRound: 1 });

    toast({
      title: "Knockout Stage Ready!",
      description: "The bracket is set with the qualifying teams.",
    });
  };

  const renderFixtureView = () => {
    if (!fixture) return null;
    const readOnly = !isPrivilegedUser;

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
              readOnly={readOnly}
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
              readOnly={readOnly}
            />
          </div>
        )
      }
    }
    
    if (tournament.tournamentType === 'round-robin' && (fixture.rounds || fixture.groups)) {
      return <RoundRobinView fixture={{rounds: fixture.rounds, groups: fixture.groups}} teams={teams} scores={scores} onScoreUpdate={handleScoreUpdate} onTournamentUpdate={onTournamentUpdate} activeRound={tournament.activeRound || 1} onActiveRoundChange={handleActiveRoundChange} readOnly={readOnly} />;
    }

    if (tournament.tournamentType === 'single elimination' && fixture.rounds) {
      return <SingleEliminationBracket fixture={{rounds: fixture.rounds}} onScoreUpdate={handleScoreUpdate} onTournamentUpdate={onTournamentUpdate} scores={scores} knockoutHomeAndAway={tournament.knockoutHomeAndAway} activeRound={tournament.activeRound || 1} onActiveRoundChange={handleActiveRoundChange} readOnly={readOnly} />;
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
            isPrivilegedUser={isPrivilegedUser}
         />;
      case 'fixtures':
        return (
            <div>
                 <div className="flex justify-between items-center mb-6">
                    <div>
                      <h2 className="text-3xl font-bold text-primary">Fixtures & Scores</h2>
                      <p className="text-muted-foreground capitalize">View matches and enter scores. { !isPrivilegedUser && '(View only)'}</p>
                    </div>
                    {isPrivilegedUser && !tournament.winner && fixture && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline">
                              <Bot className="mr-2 h-4 w-4" />
                              Simulate Round
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>Simulate Current Round?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will generate random scores for all unplayed matches in the current round. This is for testing purposes and can be undone by manually editing scores.
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleSimulateRound}>Continue</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                 </div>
                 {renderFixtureView()}
            </div>
        );
      case 'teams':
        return <TeamsList teams={teams} fixture={fixture} scores={scores} currentUserId={user?.uid} />;
      case 'points-table':
        return <PointsTableView fixture={fixture!} teams={teams} scores={scores} tournament={tournament}/>;
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
        return <TournamentSettings tournament={tournament} onUpdate={onTournamentUpdate} isPrivilegedUser={canAccessSettings} />;
      case 'user-management':
        return <UserManagement tournament={tournament} onUpdate={onTournamentUpdate} />;
      default:
        return null;
    }
  };


  return (
    <SidebarProvider>
        <Sidebar variant="inset">
            <SidebarHeader>
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 overflow-hidden">
                        <Trophy className="w-6 h-6 text-accent flex-shrink-0" />
                        <div className="flex flex-col overflow-hidden group-data-[collapsible=icon]:hidden">
                            <span className="text-base font-semibold text-primary truncate">{tournament.tournamentName}</span>
                            <span className="text-xs text-muted-foreground capitalize truncate">{tournament.tournamentType.replace('-', ' ')}</span>
                        </div>
                    </div>
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
                        <SidebarMenuButton 
                            onClick={() => setActiveView('user-management')} 
                            isActive={activeView === 'user-management'}
                            disabled={userRole !== 'owner'}
                            tooltip={userRole !== 'owner' ? 'Only the tournament owner can manage users' : 'User Management'}
                        >
                            <UserCog/>
                            User Management
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <SidebarMenuButton 
                            onClick={() => setActiveView('settings')} 
                            isActive={activeView === 'settings'}
                            disabled={!canAccessSettings}
                            tooltip={!canAccessSettings ? 'Only the owner can change settings' : 'Settings'}
                        >
                            <Settings/>
                            Settings
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarContent>
            <SidebarFooter>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="outline" className="w-full" disabled={!isPrivilegedUser}>
                            <RefreshCw className="mr-2 h-4 w-4" />
                             <span className="group-data-[collapsible=icon]:hidden">Reset Tournament</span>
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
                <div className="flex w-full items-center justify-between border-t border-sidebar-border pt-2 mt-2 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-2 group-data-[collapsible=icon]:border-none group-data-[collapsible=icon]:mt-2 group-data-[collapsible=icon]:pt-0">
                    <ThemeToggle />
                    <AuthButton />
                </div>
            </SidebarFooter>
        </Sidebar>
        <SidebarInset>
            <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between gap-4 border-b bg-background px-4 sm:px-6 md:hidden">
                <div className="flex items-center gap-2">
                    <SidebarTrigger>
                        <SheetTitle className="sr-only">Sidebar Menu</SheetTitle>
                    </SidebarTrigger>
                    <h1 className="text-lg font-semibold truncate">{tournament.tournamentName}</h1>
                </div>
                <div className="flex items-center gap-2">
                    <ThemeToggle />
                    <AuthButton />
                </div>
            </header>
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
                {renderContent()}
            </div>
        </SidebarInset>
    </SidebarProvider>
  );
}
