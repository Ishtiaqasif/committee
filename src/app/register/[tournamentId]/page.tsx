"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getTournament, addTeamToTournament, getTeamsForTournament } from '@/lib/firebase/firestore';
import type { Tournament, Team } from '@/types';
import { Loader, UserPlus, ClipboardList, Shield, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

const formSchema = z.object({
  teamName: z.string().min(1, 'Team name is required.'),
});

export default function RegisterTeamPage() {
  const params = useParams();
  const tournamentId = params.tournamentId as string;
  const { toast } = useToast();

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      teamName: '',
    },
  });

  useEffect(() => {
    if (!tournamentId) return;

    const fetchTournamentData = async () => {
      setLoading(true);
      try {
        const tournamentData = await getTournament(tournamentId);
        if (tournamentData) {
          setTournament(tournamentData);
          const teamsData = await getTeamsForTournament(tournamentId);
          setTeams(teamsData);
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
  }, [tournamentId, toast]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!tournamentId) return;
    
    if (teams.some(team => team.name.toLowerCase() === values.teamName.toLowerCase())) {
        form.setError('teamName', { message: 'This team name is already taken.'});
        return;
    }

    setIsSubmitting(true);
    try {
      await addTeamToTournament(tournamentId, { name: values.teamName, logo: '' });
      setIsRegistered(true);
      toast({ title: 'Success!', description: 'Your team has been registered.' });
    } catch (error: any) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Registration Failed', description: error.message || 'Could not register your team.' });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const isTournamentFull = tournament ? teams.length >= tournament.numberOfTeams : false;

  if (loading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center">
        <Loader className="h-8 w-8 animate-spin" />
      </div>
    );
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
  
  if (isRegistered) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-center">
            <CheckCircle className="h-24 w-24 text-green-500" />
            <h1 className="mt-6 text-4xl font-bold">Registration Successful!</h1>
            <p className="mt-2 text-muted-foreground">Your team, <span className="font-bold text-primary">{form.getValues('teamName')}</span>, is now registered for the tournament.</p>
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
            You have been invited to join this tournament. Please enter your team's name below.
          </CardDescription>
          <div className="text-sm text-muted-foreground pt-2">
            Registered Teams: {teams.length} / {tournament.numberOfTeams}
          </div>
        </CardHeader>
        <CardContent>
          {isTournamentFull ? (
             <div className="text-center text-destructive font-semibold p-4 border border-destructive/50 rounded-md">
                This tournament is now full. Registration is closed.
            </div>
          ) : (
             <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                        control={form.control}
                        name="teamName"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="flex items-center gap-2"><Shield className="h-4 w-4" /> Team Name</FormLabel>
                                <FormControl>
                                    <Input placeholder="Enter your team name" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                     <Button type="submit" disabled={isSubmitting} className="w-full">
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
