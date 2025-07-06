"use client";

import { useState, useEffect } from "react";
import type { Tournament, Team } from "@/types";
import TournamentCreator from "@/components/tournament-creator";
import TeamRegistration from "@/components/team-registration";
import TournamentHome from "@/components/tournament-home";
import { ClipboardList, Loader } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";

type AppState = "configuring" | "teams" | "fixture";

export default function CreatePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  
  const [appState, setAppState] = useState<AppState>("configuring");
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <Loader className="h-8 w-8 animate-spin" />
      </div>
    );
  }

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
         <div className="relative min-h-screen flex flex-col items-center justify-center p-4 overflow-hidden">
            <div className="absolute top-4 right-4 z-20 flex items-center gap-4">
                <Link href="/" className="text-sm font-medium text-primary hover:underline">
                    &larr; Back to Home
                </Link>
                <ThemeToggle />
            </div>
            <div className="absolute inset-0 bg-gradient-to-br from-background via-card to-background opacity-40"></div>
            <div className="relative z-10 w-full max-w-6xl">
                <header className="mb-12 text-center">
                    <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-wider uppercase text-primary flex items-center justify-center gap-4">
                        <ClipboardList className="w-12 h-12 sm:w-16 md:w-20 text-accent" />
                        Committee
                    </h1>
                    <p className="mt-4 text-xl text-muted-foreground">
                        Your Ultimate Tournament Companion
                    </p>
                </header>

                <div className="w-full">
                    {renderContent()}
                </div>
            </div>
        </div>
      )}
    </main>
  );
}
