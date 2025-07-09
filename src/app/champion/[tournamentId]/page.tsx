
"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getTournament } from '@/lib/firebase/firestore';
import { Tournament } from '@/types';
import { Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import ChampionView from '@/components/champion-view';
import { FootballLoader } from '@/components/football-loader';

export default function ChampionPage() {
  const params = useParams();
  const tournamentId = params.tournamentId as string;

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tournamentId) {
      setLoading(false);
      setError("No tournament ID provided.");
      return;
    }

    const fetchTournamentData = async () => {
      setLoading(true);
      setError(null);
      try {
        const tournamentData = await getTournament(tournamentId);
        if (tournamentData) {
          if (tournamentData.winner) {
            setTournament(tournamentData);
          } else {
            setError("This tournament has not concluded yet.");
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
  }, [tournamentId]);

  if (loading) {
    return <FootballLoader className="h-screen w-full" />;
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-center">
        <h1 className="text-4xl font-bold text-destructive">{error}</h1>
        <p className="mt-4 text-muted-foreground">The link may be invalid or the tournament may have been deleted.</p>
        <Button asChild className="mt-6">
          <Link href="/">Go to Home</Link>
        </Button>
      </div>
    );
  }

  if (tournament && tournament.winner) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-center">
        <div className="mb-8">
            <h1 className="text-4xl font-bold">{tournament.tournamentName}</h1>
            <p className="text-muted-foreground">This tournament is complete.</p>
        </div>
        <ChampionView winner={tournament.winner} />
         <Button asChild className="mt-12">
            <Link href="/create">
                <Trophy className="mr-2 h-4 w-4"/>
                Create Your Own Tournament
            </Link>
        </Button>
      </div>
    )
  }
  
  return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-center">
        <h1 className="text-4xl font-bold">An unexpected error occurred.</h1>
        <Button asChild className="mt-6">
          <Link href="/">Go to Home</Link>
        </Button>
      </div>
  );
}
