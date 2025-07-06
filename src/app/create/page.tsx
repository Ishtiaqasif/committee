"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import type { Tournament, Team, TournamentCreationData } from "@/types";
import TournamentCreator from "@/components/tournament-creator";
import TeamInvitation from "@/components/team-invitation";
import TournamentHome from "@/components/tournament-home";
import { ClipboardList, Loader } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import { createTournament, getTournament, getTeamsForTournament, updateTournament } from "@/lib/firebase/firestore";
import { useToast } from "@/hooks/use-toast";

type AppState = "configuring" | "inviting" | "fixture";

function CreatePageComponent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  const [appState, setAppState] = useState<AppState>("configuring");
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const tournamentId = searchParams.get('id');
    if (tournamentId && user) {
      const loadTournament = async () => {
        setPageLoading(true);
        try {
          const tournamentData = await getTournament(tournamentId);
          if (tournamentData && tournamentData.creatorId === user.uid) {
            const teamsData = await getTeamsForTournament(tournamentId);
            setTournament(tournamentData);
            setTeams(teamsData);
            if (teamsData.length === tournamentData.numberOfTeams) {
              setAppState("fixture");
            } else {
              setAppState("inviting");
            }
          } else {
            toast({ variant: 'destructive', title: 'Error', description: 'Tournament not found or you are not the creator.' });
            router.push('/tournaments');
          }
        } catch (error) {
          console.error("Failed to load tournament:", error);
          toast({ variant: 'destructive', title: 'Error', description: 'Failed to load tournament data.' });
          router.push('/tournaments');
        } finally {
          setPageLoading(false);
        }
      };
      loadTournament();
    } else {
      setPageLoading(false);
      setAppState("configuring");
      setTournament(null);
      setTeams([]);
    }
  }, [searchParams, user, router, toast]);

  const handleTournamentCreated = async (data: TournamentCreationData) => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to create a tournament.' });
      return;
    }
    try {
      const tournamentId = await createTournament(data, user.uid);
      const newTournamentData = await getTournament(tournamentId);
      if (newTournamentData) {
        setTournament(newTournamentData);
        setAppState("inviting");
        toast({ title: 'Tournament Created!', description: 'You can now invite teams to register.' });
        router.replace(`/create?id=${tournamentId}`);
      }
    } catch(error) {
       console.error(error);
       toast({ variant: 'destructive', title: 'Error', description: 'Failed to create tournament.' });
    }
  };
  
  const handleTournamentUpdate = async (data: Partial<TournamentCreationData>) => {
    if (!tournament) return;
    try {
      await updateTournament(tournament.id, data);
      setTournament(prev => prev ? { ...prev, ...data } : null);
      toast({ title: 'Success', description: 'Tournament settings updated.' });
    } catch (error) {
      console.error("Failed to update tournament:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update tournament settings.' });
    }
  };

  const handleTeamsFinalized = (finalizedTeams: Team[]) => {
    setTeams(finalizedTeams);
    setAppState("fixture");
  };

  const handleReset = () => {
    router.push('/create');
  };

  const renderContent = () => {
    switch (appState) {
      case "configuring":
        return <TournamentCreator onTournamentCreated={handleTournamentCreated} />;
      case "inviting":
        if (!tournament) return null;
        return (
          <TeamInvitation
            tournament={tournament}
            onTeamsFinalized={handleTeamsFinalized}
          />
        );
      case "fixture":
        if (!tournament || !teams.length) return null;
        return (
          <TournamentHome
            tournament={tournament}
            teams={teams}
            onReset={handleReset}
            onTournamentUpdate={handleTournamentUpdate}
          />
        );
      default:
        return null;
    }
  };
  
  if (authLoading || pageLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <Loader className="h-8 w-8 animate-spin" />
      </div>
    );
  }

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

export default function CreatePage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen w-screen items-center justify-center">
        <Loader className="h-8 w-8 animate-spin" />
      </div>
    }>
      <CreatePageComponent />
    </Suspense>
  );
}
