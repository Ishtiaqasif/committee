
"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { getTournament, addTeamToTournament, getTeamsForTournament } from '@/lib/firebase/firestore';
import { Tournament, Team } from '@/types';
import { Loader, UserPlus, ClipboardList, Shield, CheckCircle, Sparkles, Image as ImageIcon, User } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { generateTeamLogo } from '@/ai/flows/generate-team-logo';
import ChampionView from '@/components/champion-view';
import { useAuth } from '@/context/auth-context';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { FootballLoader } from '@/components/football-loader';
import { query, where, getDocs, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

const formSchema = z.object({
  teamName: z.string().min(1, 'Team name is required.'),
});

// Helper function to resize and compress the image
const compressImage = (dataUri: string, maxWidth: number, maxHeight: number): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new window.Image();
        img.src = dataUri;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let { width, height } = img;

            if (width > height) {
                if (width > maxWidth) {
                    height *= maxWidth / width;
                    width = maxWidth;
                }
            } else {
                if (height > maxHeight) {
                    width *= maxHeight / height;
                    height = maxHeight;
                }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                return reject(new Error('Could not get canvas context'));
            }
            ctx.drawImage(img, 0, 0, width, height);

            // Using image/png to preserve transparency. Resizing is the primary method of size reduction.
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = (error) => {
            reject(error);
        };
    });
};


export default function RegisterTeamPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const tournamentId = params.tournamentId as string;
  const { toast } = useToast();

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [logo, setLogo] = useState('');
  const [isGeneratingLogo, setIsGeneratingLogo] = useState(false);
  const [userHasRegistered, setUserHasRegistered] = useState(false);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      teamName: '',
    },
  });

  useEffect(() => {
    if (!authLoading && !user) {
      const currentPath = `/register/${tournamentId}`;
      router.push(`/login?returnUrl=${encodeURIComponent(currentPath)}`);
    }
  }, [user, authLoading, router, tournamentId]);


  useEffect(() => {
    if (!tournamentId || !user) return;

    const fetchTournamentData = async () => {
      setLoading(true);
      try {
        const tournamentData = await getTournament(tournamentId);
        if (tournamentData) {
          setTournament(tournamentData);
          if (!tournamentData.winner) {
            const teamsRef = collection(db, 'tournaments', tournamentId, 'teams');
            const q = query(teamsRef, where("ownerId", "==", user.uid));
            const userTeamsSnapshot = await getDocs(q);

            if (!userTeamsSnapshot.empty) {
                setUserHasRegistered(true);
            }
            
            const allTeamsData = await getTeamsForTournament(tournamentId);
            setTeams(allTeamsData);
          }
        } else {
          toast({ variant: 'destructive', title: 'Error', description: 'Tournament not found.' });
        }
      } catch (error) {
        console.error(error);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to load tournament data.' });
      } finally {
        setLoading(false);
      }
    };
    fetchTournamentData();
  }, [tournamentId, toast, user]);

  const handleGenerateLogo = async () => {
    const teamName = form.getValues('teamName');
    if (!teamName) {
        form.setError('teamName', { message: 'Please enter a team name first.' });
        return;
    }

    setIsGeneratingLogo(true);
    try {
        const result = await generateTeamLogo({ teamName });
        const compressedLogo = await compressImage(result.logoDataUri, 128, 128);
        setLogo(compressedLogo);
        toast({ title: 'Logo Generated!', description: 'A unique logo for your team has been created.' });
    } catch (error) {
        console.error(error);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to generate logo.' });
    } finally {
        setIsGeneratingLogo(false);
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!tournamentId || !user) return;
    
    if (teams.some(team => team.name.toLowerCase() === values.teamName.toLowerCase())) {
        form.setError('teamName', { message: 'This team name is already taken.'});
        return;
    }

    setIsSubmitting(true);
    try {
      await addTeamToTournament(tournamentId, {
        name: values.teamName,
        ownerId: user.uid,
        ownerName: user.displayName || 'Participant',
        logo: logo
      });
      setIsRegistered(true);
      toast({ title: 'Success!', description: tournament?.isTeamCountFixed ? 'Your team has been registered.' : 'Your registration is pending approval.' });
    } catch (error: any) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Registration Failed', description: error.message || 'Could not register your team.' });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const isTournamentFull = tournament?.isTeamCountFixed ? teams.filter(t => t.status === 'approved').length >= (tournament.numberOfTeams ?? 0) : false;

  if (authLoading || (user && loading)) {
    return <FootballLoader className="min-h-screen w-full" />;
  }

  if (!user) {
    return null;
  }

  if (!tournament) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center text-center">
        <h1 className="text-4xl font-bold text-destructive">Tournament Not Found</h1>
        <p className="mt-4 text-muted-foreground">The link may be invalid or the tournament may have been deleted.</p>
        <Button asChild className="mt-6">
          <Link href="/">Go to Home</Link>
        </Button>
      </div>
    );
  }
  
  if (tournament.winner) {
    return (
       <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-center">
        <div className="mb-8">
            <h1 className="text-4xl font-bold">{tournament.tournamentName}</h1>
            <p className="text-muted-foreground">This tournament is complete.</p>
        </div>
        <ChampionView winner={tournament.winner} />
         <Button asChild className="mt-12">
            <Link href="/">Create Your Own Tournament</Link>
        </Button>
      </div>
    )
  }
  
  if (isRegistered || userHasRegistered) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-center">
            <CheckCircle className="h-24 w-24 text-green-500" />
            <h1 className="mt-6 text-4xl font-bold">Registration Submitted!</h1>
            <p className="mt-2 text-muted-foreground">
                {tournament.isTeamCountFixed
                    ? <>Your team, <span className="font-bold text-primary">{form.getValues('teamName') || 'Your Team'}</span>, is now registered for the tournament.</>
                    : <>Your team registration is pending approval by the tournament admin.</>
                }
            </p>
            <p className="mt-1 text-muted-foreground">The tournament organizer will take it from here.</p>
             <Button asChild className="mt-8">
                <Link href="/">Back to Committee Home</Link>
            </Button>
        </div>
      );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto flex items-center gap-2 mb-4">
            <ClipboardList className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold">Committee</span>
          </div>
          <CardTitle>Register for: {tournament.tournamentName}</CardTitle>
          <CardDescription>
            You have been invited to join this tournament. Please enter your team's name and generate a logo.
          </CardDescription>
          {tournament.isTeamCountFixed && (
            <div className="text-sm text-muted-foreground pt-2">
                Approved Teams: {teams.filter(t => t.status === 'approved').length} / {tournament.numberOfTeams}
            </div>
          )}
        </CardHeader>
        <CardContent>
          {isTournamentFull ? (
             <div className="text-center text-destructive font-semibold p-4 border border-destructive/50 rounded-md">
                This tournament is now full. Registration is closed.
            </div>
          ) : (
             <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                     <div className="flex items-center gap-3 rounded-md border p-3 bg-muted/50">
                        <Avatar>
                            <AvatarImage src={user.photoURL ?? ''} />
                            <AvatarFallback>{user.displayName?.charAt(0) ?? 'U'}</AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="text-sm font-medium">You are registering as</p>
                            <p className="text-sm text-muted-foreground">{user.displayName} ({user.email})</p>
                        </div>
                    </div>
                    <div className="flex justify-center">
                        <div className="relative h-32 w-32 bg-muted rounded-full flex items-center justify-center border-2 border-dashed">
                            {logo ? (
                                <Image src={logo} alt="Team Logo" layout="fill" className="rounded-full object-cover" />
                            ) : (
                                <ImageIcon className="h-12 w-12 text-muted-foreground" />
                            )}
                            {isGeneratingLogo && (
                                <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                                    <Loader className="animate-spin text-white" />
                                </div>
                            )}
                        </div>
                    </div>
                    <FormField
                        control={form.control}
                        name="teamName"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="flex items-center gap-2"><Shield className="h-4 w-4" /> Team Name</FormLabel>
                                <div className="flex items-center gap-2">
                                    <FormControl>
                                        <Input placeholder="Enter team name" {...field} />
                                    </FormControl>
                                    <Button 
                                        type="button" 
                                        variant="outline" 
                                        size="icon"
                                        onClick={handleGenerateLogo}
                                        disabled={isGeneratingLogo}
                                        title="Generate Logo"
                                    >
                                        {isGeneratingLogo ? <Loader className="animate-spin" /> : <Sparkles />}
                                    </Button>
                                </div>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                     <Button type="submit" disabled={isSubmitting || isGeneratingLogo} className="w-full">
                        {isSubmitting ? <Loader className="animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                        Register Team
                    </Button>
                </form>
             </Form>
          )}
        </CardContent>
        <CardFooter className="flex-col gap-2 text-center text-xs text-muted-foreground">
            <p>Powered by Committee</p>
             <Link href="/" className="underline hover:text-primary">Create your own tournament</Link>
        </CardFooter>
      </Card>
    </div>
  );
}
