"use client";

import { useState, useTransition } from "react";
import { generateTournamentFixture } from "@/ai/flows/generate-tournament-fixture";
import type { Tournament, Team, Fixture, Match, Round } from "@/types";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import RoundRobinView from "@/components/round-robin-view";
import SingleEliminationBracket from "@/components/single-elimination-bracket";
import { Loader, Trophy, RefreshCw } from "lucide-react";
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


interface FixtureDisplayProps {
  tournament: Tournament;
  teams: Team[];
  fixture: Fixture | null;
  setFixture: (fixture: Fixture | null) => void;
  onReset: () => void;
}

export default function FixtureDisplay({ tournament, teams, fixture, setFixture, onReset }: FixtureDisplayProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const [scores, setScores] = useState<Record<string, { score1: number | null; score2: number | null }>>({});

  const handleGenerateFixture = () => {
    startTransition(async () => {
      try {
        const result = await generateTournamentFixture({
          tournamentType: tournament.tournamentType,
          numberOfTeams: tournament.numberOfTeams,
          tournamentName: tournament.tournamentName,
          playHomeAndAway: tournament.playHomeAndAway,
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
        }));
        
        const mapRounds = (rounds: any[]) => rounds.map((round: any, roundIndex: number) => ({
            ...round,
            round: round.round ?? (roundIndex + 1),
            matches: mapMatches(round.matches)
        }));

        let mappedFixture: Fixture;

        if (tournament.tournamentType === 'hybrid') {
            if (!parsedFixture.groupStage || !parsedFixture.knockoutStage) {
                throw new Error("Hybrid fixture is missing groupStage or knockoutStage");
            }
            mappedFixture = {
                groupStage: { rounds: mapRounds(parsedFixture.groupStage.rounds) },
                knockoutStage: { rounds: mapRounds(parsedFixture.knockoutStage.rounds) }
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

  const handleScoreChange = (matchIdentifier: string, team1Score: number | null, team2Score: number | null) => {
    setScores(prev => ({
        ...prev,
        [matchIdentifier]: { score1: team1Score, score2: team2Score }
    }))
  }

  if (!fixture) {
    return (
      <div className="text-center">
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

  const renderFixture = () => {
    if (tournament.tournamentType === 'hybrid' && fixture.groupStage && fixture.knockoutStage) {
      return (
        <Tabs defaultValue="group-stage" className="mt-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="group-stage">Group Stage</TabsTrigger>
            <TabsTrigger value="knockout-stage">Knockout Stage</TabsTrigger>
          </TabsList>
          <TabsContent value="group-stage" className="mt-6">
            <RoundRobinView fixture={fixture.groupStage} teams={teams} scores={scores} onScoreChange={handleScoreChange} />
          </TabsContent>
          <TabsContent value="knockout-stage" className="mt-6">
            <SingleEliminationBracket fixture={fixture.knockoutStage} onScoreChange={handleScoreChange} scores={scores} />
          </TabsContent>
        </Tabs>
      );
    }
    
    if (tournament.tournamentType === 'round-robin' && fixture.rounds) {
      return <RoundRobinView fixture={{rounds: fixture.rounds}} teams={teams} scores={scores} onScoreChange={handleScoreChange} />;
    }

    if (tournament.tournamentType === 'single elimination' && fixture.rounds) {
      return <SingleEliminationBracket fixture={{rounds: fixture.rounds}} onScoreChange={handleScoreChange} scores={scores}/>;
    }

    return <p>Could not display fixture.</p>;
  }


  return (
    <div>
        <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
            <div>
                <h2 className="text-3xl font-bold text-primary">{tournament.tournamentName}</h2>
                <p className="text-muted-foreground capitalize">{tournament.tournamentType.replace('-', ' ')} | {tournament.numberOfTeams} Teams</p>
            </div>
             <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="outline">
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
        </div>
        {renderFixture()}
    </div>
  );
}
