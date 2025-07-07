
"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getTournament, getTeamsForTournament } from '@/lib/firebase/firestore';
import { Tournament, Team, Fixture } from '@/types';
import { Loader, ClipboardList, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import KnockoutBracketView from '@/components/knockout-bracket-view';
import { ThemeToggle } from '@/components/theme-toggle';
import { useAuth } from '@/context/auth-context';

export default function KnockoutPage() {
  const params = useParams();
  const router = useRouter();
  const tournamentId = params.tournamentId as string;
  const { user, loading: authLoading } = useAuth();

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      const currentPath = `/knockout/${tournamentId}`;
      router.push(`/login?returnUrl=${encodeURIComponent(currentPath)}`);
    }
  }, [user, authLoading, router, tournamentId]);

  useEffect(() => {
    if (!tournamentId || !user) {
      setLoading(false);
      return;
    }

    const fetchTournamentData = async () => {
      setLoading(true);
      setError(null);
      try {
        const tournamentData = await getTournament(tournamentId);
        if (tournamentData) {
          if (tournamentData.tournamentType !== 'single elimination' && tournamentData.tournamentType !== 'hybrid') {
            setError("This page is only for knockout or hybrid tournaments.");
          } else if (!tournamentData.fixture) {
            setError("The tournament fixture has not been generated yet.");
          } else {
            setTournament(tournamentData);
            const teamsData = await getTeamsForTournament(tournamentId);
            setTeams(teamsData);
          }
        } else {
          setError('Tournament not found.');
        }
      } catch (err) {
        console.error(err);
        setError('Failed to load tournament data.');
      } finally {
        setLoading(false);
      }
    };
    fetchTournamentData();
  }, [tournamentId, user]);
  
  const getFixture = (): Fixture | null => {
    if (!tournament?.fixture) return null;
    
    const fixtureObject = tournament.fixture;

    if (tournament.tournamentType === 'hybrid') {
        return fixtureObject.knockoutStage ?? null;
    }
    return fixtureObject;
  }
  
  const fixture = getFixture();
  
  if (authLoading || (user && loading)) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return null; // or a loading spinner, while redirecting
  }

  return (
    <div className="min-h-screen bg-muted/40 p-4 sm:p-6 lg:p-8">
       <div className="absolute top-4 right-4 z-20 flex items-center gap-4">
            <Button variant="outline" size="sm" asChild>
                <Link href="/">
                    <Home className="mr-2" /> Home
                </Link>
            </Button>
            <ThemeToggle />
        </div>
      <main className="mx-auto w-full max-w-7xl">
         <div className="mb-8 text-center">
             <div className="inline-flex items-center gap-2 mb-2">
                <ClipboardList className="h-8 w-8 text-primary" />
                <span className="text-2xl font-bold">Committee</span>
             </div>
            {tournament && <h1 className="text-4xl font-bold tracking-tight">{tournament.tournamentName}</h1>}
            <p className="mt-2 text-muted-foreground">
                Public Bracket View
            </p>
        </div>
        
        {loading && (
             <div className="flex h-64 w-full items-center justify-center">
                <Loader className="h-8 w-8 animate-spin" />
            </div>
        )}

        {error && (
            <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-destructive/50 py-24 text-center">
                <h3 className="text-lg font-semibold text-destructive">{error}</h3>
                <Button asChild className="mt-4">
                    <Link href="/">Go to Home</Link>
                </Button>
            </div>
        )}
        
        {fixture && fixture.rounds && tournament && (
            <KnockoutBracketView 
                fixture={fixture} 
                scores={tournament?.scores || {}}
                knockoutHomeAndAway={tournament.knockoutHomeAndAway}
                awayGoalsRule={tournament.awayGoalsRule ?? false}
            />
        )}
      </main>
    </div>
  );
}
