
"use client";

import { useState, useEffect, Suspense, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { Tournament, Team, TournamentCreationData } from "@/types";
import TournamentCreator from "@/components/tournament-creator";
import TeamInvitation from "@/components/team-invitation";
import TournamentHome from "@/components/tournament-home";
import { Loader } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import { createTournament, getTournament, getTeamsForTournament, updateTournament } from "@/lib/firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import AuthButton from "@/components/auth-button";
import { FootballLoader } from "@/components/football-loader";
import isEqual from 'lodash.isequal';


type AppState = "configuring" | "inviting" | "fixture";

function TournamentPageComponent() {
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
      if (tournament?.id === tournamentId) {
        setPageLoading(false);
        return;
      }
      const loadTournament = async () => {
        setPageLoading(true);
        try {
          const tournamentData = await getTournament(tournamentId);
          if (tournamentData && (tournamentData.creatorId === user.uid || tournamentData.admins?.includes(user.uid) || tournamentData.participants?.includes(user.uid))) {
            const teamsData = await getTeamsForTournament(tournamentId);
            setTournament(tournamentData);
            setTeams(teamsData);
            
            const approvedTeamsCount = teamsData.filter(t => t.status === 'approved').length;
            const isReadyForDashboard = tournamentData.isTeamCountFixed 
              ? approvedTeamsCount === tournamentData.numberOfTeams
              : !!tournamentData.numberOfTeams; 

            if (isReadyForDashboard) {
              setAppState("fixture");
            } else {
              setAppState("inviting");
            }
          } else {
            toast({ variant: 'destructive', title: 'Error', description: 'Tournament not found or you do not have access.' });
            router.push('/profile');
          }
        } catch (error) {
          console.error("Failed to load tournament:", error);
          toast({ variant: 'destructive', title: 'Error', description: 'Failed to load tournament data.' });
          router.push('/profile');
        } finally {
          setPageLoading(false);
        }
      };
      loadTournament();
    } else if (!tournamentId) {
      setPageLoading(false);
      setAppState("configuring");
      setTournament(null);
      setTeams([]);
    }
  }, [searchParams, user, router, toast, tournament?.id]);

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
        router.replace(`/tournament?id=${tournamentId}`);
      }
    } catch(error) {
       console.error(error);
       toast({ variant: 'destructive', title: 'Error', description: 'Failed to create tournament.' });
       // Re-throw the error so the calling component's finally block can execute
       throw error;
    }
  };
  
  const handleTournamentUpdate = async (data: Partial<Tournament>) => {
    if (!tournament) return;
    try {
      const updatedTournament = { ...tournament, ...data };
      
      const currentSettings: Partial<Tournament> = {};
      Object.keys(data).forEach(key => {
        currentSettings[key as keyof Tournament] = tournament[key as keyof Tournament];
      });

      if (!isEqual(currentSettings, data)) {
        await updateTournament(tournament.id, data);
        toast({ title: 'Success', description: 'Tournament settings updated.' });
      }

      setTournament(updatedTournament);
      
      // Check if we finalized registration and should move to the next step
      if ('numberOfTeams' in data && !data.fixture) {
          const approvedTeams = teams.filter(t => t.status === 'approved');
          handleTeamsFinalized(approvedTeams);
      }

    } catch (error) {
      console.error("Failed to update tournament:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update tournament settings.' });
    }
  };

  const handleTeamsFinalized = (finalizedTeams: Team[]) => {
    setTeams(finalizedTeams);
    setAppState("fixture");
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
            onTournamentUpdate={handleTournamentUpdate}
          />
        );
      case "fixture":
        if (!tournament || !teams.length) return null;
        return (
          <TournamentHome
            tournament={tournament}
            teams={teams}
            onTournamentUpdate={handleTournamentUpdate}
          />
        );
      default:
        return null;
    }
  };
  
  if (authLoading || pageLoading) {
    return <FootballLoader className="h-screen w-screen" />;
  }

  return (
    <main className="min-h-screen bg-background">
      {appState === 'fixture' ? (
        renderContent()
      ) : (
         <div className="relative flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4">
            <div className="absolute top-4 right-4 z-20 flex items-center gap-4">
                <AuthButton />
                <ThemeToggle />
            </div>
            <div className="w-full max-w-2xl">
                {renderContent()}
            </div>
        </div>
      )}
    </main>
  );
}

export default function TournamentPage() {
  return (
    <Suspense fallback={<FootballLoader className="h-screen w-screen" />}>
      <TournamentPageComponent />
    </Suspense>
  );
}
