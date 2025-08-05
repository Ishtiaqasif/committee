
"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/config';
import { Team, Tournament } from '@/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Clipboard, Check, Users, Shield, Link as LinkIcon, ArrowRight, Loader, User, Sparkles, UserPlus, Image as ImageIcon } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import Image from 'next/image';
import { useAuth } from '@/context/auth-context';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { generateTeamLogo } from '@/ai/flows/generate-team-logo';
import { addTeamToTournament } from '@/lib/supabase/firestore';
import { Separator } from './ui/separator';

interface TeamInvitationProps {
    tournament: Tournament;
    onTeamsFinalized: (teams: Team[]) => void;
}

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
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = (error) => reject(error);
    });
};


export default function TeamInvitation({ tournament, onTeamsFinalized }: TeamInvitationProps) {
    const [teams, setTeams] = useState<Team[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [copied, setCopied] = useState(false);
    const [registrationLink, setRegistrationLink] = useState('');
    const { user } = useAuth();
    const { toast } = useToast();

    // Owner registration form state
    const [logo, setLogo] = useState('');
    const [isGeneratingLogo, setIsGeneratingLogo] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const ownerForm = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: { teamName: '' },
    });

    useEffect(() => {
        setRegistrationLink(`${window.location.origin}/register/${tournament.id}`);
    }, [tournament.id]);
    
    useEffect(() => {
        if (!tournament.id) return;
        setIsLoading(true);
        const teamsRef = collection(db, 'tournaments', tournament.id, 'teams');
        const q = query(teamsRef);

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const fetchedTeams: Team[] = [];
            querySnapshot.forEach((doc) => {
                fetchedTeams.push({ id: doc.id, ...doc.data() } as Team);
            });
            setTeams(fetchedTeams.sort((a, b) => a.name.localeCompare(b.name)));
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching teams: ", error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [tournament.id]);

    const handleCopyLink = () => {
        navigator.clipboard.writeText(registrationLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    
    const handleGenerateLogo = async () => {
        const teamName = ownerForm.getValues('teamName');
        if (!teamName) {
            ownerForm.setError('teamName', { message: 'Please enter a team name first.' });
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

    const onOwnerSubmit = async (values: z.infer<typeof formSchema>) => {
        if (!tournament.id || !user) return;
        
        if (teams.some(team => team.name.toLowerCase() === values.teamName.toLowerCase())) {
            ownerForm.setError('teamName', { message: 'This team name is already taken.'});
            return;
        }

        setIsSubmitting(true);
        try {
          await addTeamToTournament(tournament.id, {
            name: values.teamName,
            ownerId: user.uid,
            ownerName: user.displayName || 'Participant',
            logo: logo
          });
          toast({ title: 'Success!', description: 'Your team has been registered.' });
          ownerForm.reset();
          setLogo('');
        } catch (error: any) {
          console.error(error);
          toast({ variant: 'destructive', title: 'Registration Failed', description: error.message || 'Could not register your team.' });
        } finally {
          setIsSubmitting(false);
        }
    };

    const isReadyToProceed = teams.length === tournament.numberOfTeams;
    const isOwner = user?.uid === tournament.creatorId;
    const ownerHasRegistered = teams.some(t => t.ownerId === user?.uid);
    const isTournamentFull = teams.length >= tournament.numberOfTeams;
    
    const OwnerRegistration = () => (
      <Card className="mt-8 border-primary/50">
        <CardHeader>
          <CardTitle>Register Your Team</CardTitle>
          <CardDescription>As the tournament owner, you can register your own team here.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...ownerForm}>
            <form onSubmit={ownerForm.handleSubmit(onOwnerSubmit)} className="space-y-6">
              <div className="flex justify-center">
                <div className="relative h-24 w-24 bg-muted rounded-full flex items-center justify-center border-2 border-dashed">
                  {logo ? <Image src={logo} alt="Team Logo" layout="fill" className="rounded-full object-cover" /> : <ImageIcon className="h-10 w-10 text-muted-foreground" />}
                  {isGeneratingLogo && <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center"><Loader className="animate-spin text-white" /></div>}
                </div>
              </div>
              <FormField
                control={ownerForm.control}
                name="teamName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2"><Shield className="h-4 w-4" /> Your Team Name</FormLabel>
                    <div className="flex items-center gap-2">
                      <FormControl><Input placeholder="Enter your team name" {...field} /></FormControl>
                      <Button type="button" variant="outline" size="icon" onClick={handleGenerateLogo} disabled={isGeneratingLogo} title="Generate Logo">
                        {isGeneratingLogo ? <Loader className="animate-spin" /> : <Sparkles />}
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isSubmitting || isGeneratingLogo} className="w-full">
                {isSubmitting ? <Loader className="animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                Register My Team
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    );

    return (
        <Card className="w-full max-w-2xl mx-auto border-0 shadow-none">
            <CardHeader className="text-center">
                <div className="mx-auto bg-primary text-primary-foreground rounded-full p-3 w-fit mb-4">
                    <LinkIcon className="h-8 w-8" />
                </div>
                <CardTitle>Invite Teams to Register</CardTitle>
                <CardDescription>Share the unique link below with participants to let them register their own teams.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
                <div className="space-y-2">
                    <label htmlFor="invite-link" className="text-sm font-medium">Unique Registration Link</label>
                    <div className="flex gap-2">
                        <Input id="invite-link" readOnly value={registrationLink} />
                        <Button variant="outline" size="icon" onClick={handleCopyLink}>
                            {copied ? <Check className="text-green-500" /> : <Clipboard />}
                        </Button>
                    </div>
                </div>

                <div className="space-y-4">
                     <div className="flex justify-between items-baseline">
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                           <Users className="h-5 w-5 text-primary" /> Registered Teams
                        </h3>
                        <span className="text-sm text-muted-foreground font-mono">
                            {teams.length}/{tournament.numberOfTeams}
                        </span>
                    </div>
                    <Progress value={(teams.length / tournament.numberOfTeams) * 100} />
                     {isLoading ? (
                        <div className="flex justify-center items-center h-24">
                            <Loader className="animate-spin text-primary"/>
                        </div>
                     ) : (
                        teams.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto p-1">
                                {teams.map(team => (
                                    <div key={team.id} className="flex items-center gap-3 p-2 bg-secondary/50 rounded-md">
                                        {team.logo ? (
                                            <Image src={team.logo} alt={`${team.name} logo`} width={32} height={32} className="rounded-full bg-background object-cover" />
                                        ) : (
                                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                                                <Shield className="h-4 w-4 text-muted-foreground" />
                                            </div>
                                        )}
                                        <div className="flex flex-col overflow-hidden">
                                            <span className="font-medium truncate">{team.name}</span>
                                            {team.ownerName && (
                                                <span className="text-xs text-muted-foreground flex items-center gap-1.5 truncate">
                                                    <User className="h-3 w-3 flex-shrink-0" />
                                                    {team.ownerName}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                             <div className="text-center text-muted-foreground py-8">
                                No teams have registered yet.
                            </div>
                        )
                     )}
                </div>
                
                {isOwner && !ownerHasRegistered && !isTournamentFull && (
                    <>
                        <Separator />
                        <OwnerRegistration />
                    </>
                )}

            </CardContent>
            <CardFooter className="flex-col gap-3 pt-6">
                <Button size="lg" disabled={!isReadyToProceed} onClick={() => onTeamsFinalized(teams)}>
                    {isReadyToProceed ? "All Teams Registered! Proceed" : "Waiting for all teams..."}
                    <ArrowRight className="ml-2 h-4 w-4"/>
                </Button>
                {!isReadyToProceed && <p className="text-sm text-muted-foreground">The button will be enabled once all {tournament.numberOfTeams} teams have registered.</p>}
            </CardFooter>
        </Card>
    );
}
