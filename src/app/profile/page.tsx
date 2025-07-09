
"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { KeyRound, Mail, PlusCircle, LayoutGrid, Calendar, Users, Trophy, Crown, Shield, Activity, Archive, ChevronDown, Settings } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { getTournamentsForUserWithRoles, updateTournament } from "@/lib/firebase/firestore";
import { Tournament } from "@/types";
import { Button } from "@/components/ui/button";
import { format } from 'date-fns';
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { FootballLoader } from "@/components/football-loader";


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

const TournamentCard = ({ tournament, status, onArchive }: { tournament: Tournament; status: 'ongoing' | 'finished' | 'archived' | 'unconfigured'; onArchive: (id: string) => void }) => {
    const isOwner = tournament.roles?.includes('owner');
    const canBeArchived = status !== 'archived';
    
    return (
    <Card key={tournament.id} className="flex flex-col overflow-hidden">
        {tournament.logo && (
          <div className="aspect-video w-full overflow-hidden bg-muted">
              <Image src={tournament.logo} alt={`${tournament.tournamentName} logo`} width={400} height={225} className="object-cover w-full h-full" />
          </div>
        )}
        <CardHeader>
            <CardTitle className="flex items-start justify-between">
                <span className="pr-4">{tournament.tournamentName}</span>
                 {status === 'ongoing' && (
                    <Badge variant="outline" className="text-accent border-accent gap-1.5 flex-shrink-0">
                        <Activity className="h-3 w-3" />
                        Active
                    </Badge>
                )}
                {status === 'unconfigured' && (
                     <Badge variant="outline" className="text-primary border-primary gap-1.5 flex-shrink-0">
                        <Settings className="h-3 w-3" />
                        Needs Setup
                    </Badge>
                )}
                {status === 'finished' && (
                    <Trophy className="h-5 w-5 text-accent flex-shrink-0" />
                )}
            </CardTitle>
            <CardDescription className="capitalize">{tournament.tournamentType?.replace('-', ' ') ?? 'Type not set'}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground flex-grow">
            <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span>{tournament.numberOfTeams ? `${tournament.numberOfTeams} Teams` : 'Open Registration'}</span>
            </div>
            <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>
                {tournament.createdAt?.toDate ? format(tournament.createdAt.toDate(), 'PPP') : 'Date not available'}
                </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap pt-2">
                {tournament.roles?.map(role => <RoleBadge key={role} role={role} />)}
            </div>
        </CardContent>
        <CardFooter className="pt-4">
            <div className={cn("grid w-full gap-2", (isOwner && canBeArchived) ? "grid-cols-2" : "grid-cols-1")}>
                <Button asChild className="w-full" variant="outline">
                    <Link href={`/create?id=${tournament.id}`}>View Dashboard</Link>
                </Button>
                {isOwner && canBeArchived && (
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="outline" className="w-full">
                                <Archive className="mr-2 h-4 w-4" /> Archive
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Archive Tournament?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will move the tournament to your archived list. You can still view its details, but it won't appear in the ongoing list.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => onArchive(tournament.id)}>
                                    Yes, Archive
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}
            </div>
        </CardFooter>
    </Card>
)};


export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loadingTournaments, setLoadingTournaments] = useState(true);
  const [isArchiving, setIsArchiving] = useState(false);
  const { toast } = useToast();

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
  
  const handleArchiveTournament = async (tournamentId: string) => {
    if (isArchiving) return;
    setIsArchiving(true);
    try {
        await updateTournament(tournamentId, { isActive: false });
        setTournaments(prev => prev.map(t => 
            t.id === tournamentId ? { ...t, isActive: false } : t
        ));
        toast({ title: "Tournament Archived", description: "The tournament has been moved to the archived list." });
    } catch (error) {
        console.error("Failed to archive tournament:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to archive the tournament.' });
    } finally {
        setIsArchiving(false);
    }
  };

  const { ongoingTournaments, finishedTournaments, unconfiguredTournaments, archivedTournaments } = useMemo(() => {
    const ongoing: Tournament[] = [];
    const finished: Tournament[] = [];
    const unconfigured: Tournament[] = [];
    const archived: Tournament[] = [];

    tournaments.forEach(t => {
      if (t.winner) {
        finished.push(t);
      } else if (!t.fixture) {
        unconfigured.push(t);
      } else if (t.isActive) {
        ongoing.push(t);
      } else {
        archived.push(t);
      }
    });

    return { 
      ongoingTournaments: ongoing, 
      finishedTournaments: finished,
      unconfiguredTournaments: unconfigured,
      archivedTournaments: archived 
    };
  }, [tournaments]);

  if (authLoading || !user) {
    return <FootballLoader className="h-screen w-screen" />;
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
                <FootballLoader className="h-64 w-full" />
            ) : tournaments.length > 0 ? (
                <div className="space-y-12">
                     {unconfiguredTournaments.length > 0 && (
                        <section>
                            <Collapsible defaultOpen={true}>
                                <CollapsibleTrigger asChild>
                                    <div className="flex w-full cursor-pointer items-center justify-between rounded-md p-2 hover:bg-muted">
                                        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2 text-primary">
                                            <Settings className="h-6 w-6"/> Unconfigured ({unconfiguredTournaments.length})
                                        </h2>
                                        <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform data-[state=open]:rotate-180"/>
                                    </div>
                                </CollapsibleTrigger>
                                <CollapsibleContent className="data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up overflow-hidden">
                                    <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 pt-4">
                                        {unconfiguredTournaments.map((t) => (
                                            <TournamentCard key={t.id} tournament={t} status="unconfigured" onArchive={handleArchiveTournament} />
                                        ))}
                                    </div>
                                </CollapsibleContent>
                            </Collapsible>
                        </section>
                    )}
                     {ongoingTournaments.length > 0 && (
                        <section>
                            <h2 className="text-2xl font-bold tracking-tight mb-4 flex items-center gap-2 text-accent"><Activity className="h-6 w-6"/> Ongoing</h2>
                            <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                                {ongoingTournaments.map((t) => (
                                    <TournamentCard key={t.id} tournament={t} status="ongoing" onArchive={handleArchiveTournament} />
                                ))}
                            </div>
                        </section>
                    )}
                     {finishedTournaments.length > 0 && (
                        <section>
                           <Collapsible defaultOpen={true}>
                               <CollapsibleTrigger asChild>
                                   <div className="flex w-full cursor-pointer items-center justify-between rounded-md p-2 hover:bg-muted">
                                       <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2 text-accent">
                                           <Trophy className="h-6 w-6"/> Finished ({finishedTournaments.length})
                                       </h2>
                                       <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform data-[state=open]:rotate-180"/>
                                   </div>
                               </CollapsibleTrigger>
                               <CollapsibleContent className="data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up overflow-hidden">
                                   <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 pt-4">
                                       {finishedTournaments.map((t) => (
                                           <TournamentCard key={t.id} tournament={t} status="finished" onArchive={handleArchiveTournament} />
                                       ))}
                                   </div>
                               </CollapsibleContent>
                           </Collapsible>
                       </section>
                    )}
                    {archivedTournaments.length > 0 && (
                        <section>
                            <Collapsible defaultOpen={false}>
                                <CollapsibleTrigger asChild>
                                    <div className="flex w-full cursor-pointer items-center justify-between rounded-md p-2 hover:bg-muted">
                                        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2 text-muted-foreground">
                                            <Archive className="h-6 w-6"/> Archived ({archivedTournaments.length})
                                        </h2>
                                        <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform data-[state=open]:rotate-180"/>
                                    </div>
                                </CollapsibleTrigger>
                                <CollapsibleContent className="data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up overflow-hidden">
                                    <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 pt-4">
                                        {archivedTournaments.map((t) => (
                                            <TournamentCard key={t.id} tournament={t} status="archived" onArchive={handleArchiveTournament} />
                                        ))}
                                    </div>
                                </CollapsibleContent>
                            </Collapsible>
                        </section>
                    )}
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

    
