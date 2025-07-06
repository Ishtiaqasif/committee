"use client";

import { useState } from "react";
import type { Tournament, Team } from "@/types";
import TournamentCreator from "@/components/tournament-creator";
import TeamRegistration from "@/components/team-registration";
import TournamentHome from "@/components/tournament-home";
import { Card, CardContent } from "@/components/ui/card";
import { Users } from "lucide-react";

type AppState = "configuring" | "teams" | "fixture";

export default function Home() {
  const [appState, setAppState] = useState<AppState>("configuring");
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);

  const handleTournamentCreated = (data: Tournament) => {
    setTournament(data);
    setAppState("teams");
  };

  const handleTeamsRegistered = (registeredTeams: Team[]) => {
    setTeams(registeredTeams);
    setAppState("fixture");
  };

  const handleReset = () => {
    setTournament(null);
    setTeams([]);
    setAppState("configuring");
  };

  const renderContent = () => {
    switch (appState) {
      case "configuring":
        return <TournamentCreator onTournamentCreated={handleTournamentCreated} />;
      case "teams":
        if (!tournament) return null;
        return (
          <TeamRegistration
            numberOfTeams={tournament.numberOfTeams}
            onTeamsRegistered={handleTeamsRegistered}
          />
        );
      case "fixture":
        if (!tournament || !teams.length) return null;
        return (
          <TournamentHome
            tournament={tournament}
            teams={teams}
            onReset={handleReset}
          />
        );
      default:
        return null;
    }
  };

  return (
    <main className="min-h-screen bg-background">
      {appState === 'fixture' ? (
        renderContent()
      ) : (
         <div className="p-4 sm:p-6 md:p-8 flex flex-col items-center">
            <div className="w-full max-w-6xl">
                <header className="mb-8 text-center">
                    <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-primary font-headline flex items-center justify-center gap-3">
                        <Users className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 text-accent" />
                        Committee
                    </h1>
                    <p className="mt-2 text-lg text-muted-foreground">
                        Your Ultimate Tournament Companion
                    </p>
                </header>

                <Card className="w-full shadow-lg">
                    <CardContent className="p-4 sm:p-6 md:p-8">
                        {renderContent()}
                    </CardContent>
                </Card>
            </div>
        </div>
      )}
    </main>
  );
}
