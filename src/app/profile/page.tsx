
"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Loader, KeyRound, Mail, User as UserIcon, PlusCircle, LayoutGrid, Calendar, Users, Trophy, Crown, Shield } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { getTournamentsForUserWithRoles } from "@/lib/firebase/firestore";
import type { Tournament } from "@/types";
import { Button } from "@/components/ui/button";
import { format } from 'date-fns';
import { Badge } from "@/components/ui/badge";

const RoleBadge = ({ role }: { role: string }) => {
    const roleStyles: { [key: string]: string } = {
        owner: 'bg-accent text-accent-foreground border-accent hover:bg-accent',
        admin: 'bg-primary/20 text-primary border-primary/50',
        participant: 'bg-secondary text-secondary-foreground border-border',
    };
    const icon = {
        owner: <Crown className="h-3 w-3" />,
        admin: <Shield className="h-3 w-3" />,
        participant: <Users className="h-3 w-3" />,
    }[role];

    return (
        <Badge variant="outline" className={`gap-1.5 pr-2.5 pl-2 py-1 text-xs ${roleStyles[role] || ''}`}>
            {icon}
            <span className="capitalize">{role}</span>
        </Badge>
    );
};


export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loadingTournaments, setLoadingTournaments] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      const fetchTournaments = async () => {
        setLoadingTournaments(true);
        try {
            const userTournaments = await getTournamentsForUserWithRoles(user.uid);
            setTournaments(userTournaments);
        } catch (error) {
            console.error("Failed to fetch tournaments:", error);
        } finally {
            setLoadingTournaments(false);
        }
      };
      fetchTournaments();
    }
  }, [user]);

  if (authLoading || !user) {
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
            <Card className="w-full mb-8">
                <CardHeader className="items-center text-center flex-row gap-6">
                    <Avatar className="h-24 w-24">
                        <AvatarImage src={user.photoURL ?? ""} alt={user.displayName ?? ""} />
                        <AvatarFallback>{user.displayName?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="text-left">
                        <CardTitle className="text-3xl">{user.displayName}</CardTitle>
                        <CardDescription>{user.email}</CardDescription>
                         <div className="flex items-center gap-4 rounded-md p-1 mt-2">
                            <KeyRound className="h-4 w-4 text-muted-foreground" />
                            <div className="flex-1">
                                <p className="font-mono text-xs text-muted-foreground">{user.uid}</p>
                            </div>
                        </div>
                    </div>
                </CardHeader>
            </Card>

            <div className="mb-8 flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-4xl font-bold tracking-tight">My Tournaments</h1>
                    <p className="mt-2 text-muted-foreground">
                        All tournaments you are associated with.
                    </p>
                </div>
                <Button asChild size="lg">
                    <Link href="/create">
                        <PlusCircle className="mr-2 h-4 w-4" /> Create New
                    </Link>
                </Button>
            </div>
       
            {loadingTournaments ? (
                <div className="flex h-64 w-full items-center justify-center">
                    <Loader className="h-8 w-8 animate-spin" />
                </div>
            ) : tournaments.length > 0 ? (
                <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
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
                            <div className="flex items-center gap-2 flex-wrap pt-2">
                                {t.roles?.map(role => <RoleBadge key={role} role={role} />)}
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
                <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border py-24 text-center">
                    <LayoutGrid className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-semibold">No Tournaments Yet</h3>
                    <p className="mb-4 mt-2 text-sm text-muted-foreground">You haven't created or joined any tournaments.</p>
                    <Button asChild>
                    <Link href="/create">Create Your First Tournament</Link>
                    </Button>
                </div>
            )}
        </main>
    </div>
  );
}
