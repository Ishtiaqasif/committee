"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import { getTournamentsForUser } from "@/lib/firebase/firestore";
import type { Tournament } from "@/types";
import { Loader, PlusCircle, LayoutGrid, Calendar, Users, Trophy } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from 'date-fns';

export default function TournamentsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }

    if (user) {
      const fetchTournaments = async () => {
        setLoading(true);
        try {
            const userTournaments = await getTournamentsForUser(user.uid);
            setTournaments(userTournaments);
        } catch (error) {
            console.error("Failed to fetch tournaments:", error);
        } finally {
            setLoading(false);
        }
      };
      fetchTournaments();
    }
  }, [user, authLoading, router]);

  if (authLoading || loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <Loader className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-muted/40 p-4 sm:p-6 lg:p-8">
       <div className="absolute top-4 right-4 z-20 flex items-center gap-4">
            <Link href="/" className="text-sm font-medium text-primary hover:underline">
                &larr; Back to Home
            </Link>
            <ThemeToggle />
        </div>
      <main className="mx-auto w-full max-w-7xl">
        <div className="mb-8 flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
            <div>
                 <h1 className="text-4xl font-bold tracking-tight">My Tournaments</h1>
                 <p className="mt-2 text-muted-foreground">
                    A list of all the tournaments you've created.
                </p>
            </div>
            <Button asChild size="lg">
                <Link href="/create">
                    <PlusCircle className="mr-2 h-4 w-4" /> Create New
                </Link>
            </Button>
        </div>
       
        {tournaments.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {tournaments.map((t) => (
              <Card key={t.id} className="flex flex-col">
                <CardHeader>
                  <CardTitle className="flex items-start justify-between">
                     <span className="pr-4">{t.tournamentName}</span>
                     <Trophy className="h-5 w-5 text-accent flex-shrink-0" />
                  </CardTitle>
                  <CardDescription className="capitalize">{t.tournamentType.replace('-', ' ')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground flex-grow">
                    <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <span>{t.numberOfTeams} Teams</span>
                    </div>
                     <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                         <span>
                          {t.createdAt?.toDate ? format(t.createdAt.toDate(), 'PPP') : 'Date not available'}
                         </span>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button asChild className="w-full" variant="outline">
                        <Link href={`/create?id=${t.id}`}>View Dashboard</Link>
                    </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          !loading && (
            <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border py-24 text-center">
                <LayoutGrid className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">No Tournaments Yet</h3>
                <p className="mb-4 mt-2 text-sm text-muted-foreground">You haven't created any tournaments. Get started now!</p>
                <Button asChild>
                <Link href="/create">Create Your First Tournament</Link>
                </Button>
            </div>
          )
        )}
      </main>
    </div>
  );
}
