
"use client";

import { useEffect, useState } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Team, Tournament, TeamStatus } from '@/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Clipboard, Check, Users, Shield, Link as LinkIcon, ArrowRight, Loader, User, Sparkles, UserPlus, ImageIcon, ThumbsUp, ThumbsDown, CheckCircle, XCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import Image from 'next/image';
import { useAuth } from '@/context/auth-context';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { generateTeamLogo } from '@/ai/flows/generate-team-logo';
import { addTeamToTournament, updateTeam, removeTeam, getUserByEmail } from '@/lib/firebase/firestore';
import { Separator } from './ui/separator';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Badge } from './ui/badge';
import { UserSearchCombobox } from './user-search-combobox';

interface TeamInvitationProps {
    tournament: Tournament;
    onTeamsFinalized: (teams: Team[]) => void;
    onTournamentUpdate: (data: Partial<Tournament>) => void;
}

const formSchema = z.object({
  teamName: z.string().min(1, 'Team name is required.'),
  ownerEmail: z.string().email('A valid email address is required.'),
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


export default function TeamInvitation({ tournament, onTeamsFinalized, onTournamentUpdate }: TeamInvitationProps) {
    const [teams, setTeams] = useState<Team[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [copied, setCopied] = useState(false);
    const [registrationLink, setRegistrationLink] = useState('');
    const { user } = useAuth();
    const { toast } = useToast();

    // Manual registration form state
    const [logo, setLogo] = useState('');
    const [isGeneratingLogo, setIsGeneratingLogo] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const manualRegForm = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: { teamName: '', ownerEmail: '' },
    });

    const approvedTeams = teams.filter(t => t.status === 'approved');
    const pendingTeams = teams.filter(t => t.status === 'pending');

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
            setTeams(fetchedTeams);
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

    const handleApproveTeam = async (teamId: string) => {
        const teamToApprove = teams.find(t => t.id === teamId);
        try {
            await updateTeam(tournament.id, teamId, { status: 'approved' });
            toast({
                title: 'Team Approved',
                description: teamToApprove ? `"${teamToApprove.name}" has been approved.` : 'Team has been approved.'
            });
        } catch (error) {
            console.error("Failed to approve team:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to approve team.' });
        }
    }
    
    const handleRejectTeam = async (teamId: string) => {
        try {
            await removeTeam(tournament.id, teamId);
            toast({ title: 'Team Rejected', description: 'The registration has been removed.' });
        } catch (error) {
            console.error("Failed to reject team:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to reject team.' });
        }
    }
    
    const handleGenerateLogo = async () => {
        const teamName = manualRegForm.getValues('teamName');
        if (!teamName) {
            manualRegForm.setError('teamName', { message: 'Please enter a team name first.' });
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

    const onManualSubmit = async (values: z.infer<typeof formSchema>) => {
        if (!tournament.id || !user) return;
        
        if (teams.some(team => team.name.toLowerCase() === values.teamName.toLowerCase())) {
            manualRegForm.setError('teamName', { message: 'This team name is already taken.'});
            return;
        }

        setIsSubmitting(true);
        try {
            const owner = await getUserByEmail(values.ownerEmail);
            if (!owner) {
                manualRegForm.setError('ownerEmail', { message: 'No registered user found with this email.' });
                setIsSubmitting(false);
                return;
            }

            if (teams.some(t => t.ownerId === owner.uid)) {
                manualRegForm.setError('ownerEmail', { message: 'This user has already registered a team for this tournament.'});
                setIsSubmitting(false);
                return;
            }

            await addTeamToTournament(tournament.id, {
                name: values.teamName,
                ownerId: owner.uid,
                ownerName: owner.displayName || 'Participant',
                logo: logo
            }, true);
            toast({ title: 'Team Added', description: `${values.teamName} has been approved and registered.` });
            manualRegForm.reset();
            setLogo('');
        } catch (error: any) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Registration Failed', description: error.message || 'Could not register team.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleFinalize = () => {
        if (approvedTeams.length < 3) {
            toast({
                variant: "destructive",
                title: "Not Enough Teams",
                description: "You must approve at least 3 teams to finalize registration."
            });
            return;
        }
        onTournamentUpdate({ numberOfTeams: approvedTeams.length });
        onTeamsFinalized(approvedTeams);
    }

    const isPrivilegedUser = user?.uid === tournament.creatorId || tournament.admins?.includes(user?.uid ?? '');
    const isReadyToProceed = tournament.isTeamCountFixed && approvedTeams.length === tournament.numberOfTeams;
    const isTournamentFull = tournament.isTeamCountFixed && approvedTeams.length >= (tournament.numberOfTeams ?? 0);
    const needsApproval = !tournament.isTeamCountFixed;

    const TeamList = ({ teamList, title, children }: { teamList: Team[], title: string, children?: React.ReactNode }) => (
        <div>
            <h3 className="font-semibold text-lg flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">{children}{title}</div>
                <Badge variant="outline">{teamList.length}</Badge>
            </h3>
            {isLoading ? (
                <div className="flex justify-center items-center h-24">
                    <Loader className="animate-spin text-primary"/>
                </div>
            ) : (
                teamList.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto p-1">
                        {teamList.map(team => (
                            <div key={team.id} className="flex items-center gap-3 p-2 bg-secondary/50 rounded-md">
                                {team.logo ? (
                                    <Image src={team.logo} alt={`${team.name} logo`} width={32} height={32} className="rounded-full bg-background object-cover" />
                                ) : (
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                                        <Shield className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                )}
                                <div className="flex flex-col overflow-hidden flex-grow">
                                    <span className="font-medium truncate">{team.name}</span>
                                    {team.ownerName && (
                                        <span className="text-xs text-muted-foreground flex items-center gap-1.5 truncate">
                                            <User className="h-3 w-3 flex-shrink-0" />
                                            {team.ownerName}
                                        </span>
                                    )}
                                </div>
                                {isPrivilegedUser && team.status === 'pending' && (
                                  <div className="flex gap-1">
                                    <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600 hover:text-green-600 hover:bg-green-100" onClick={() => handleApproveTeam(team.id)}><CheckCircle className="w-4 h-4" /></Button>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button size="icon" variant="ghost" className="h-7 w-7 text-red-600 hover:text-red-600 hover:bg-red-100"><XCircle className="w-4 h-4" /></Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Reject Team Registration?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    Are you sure you want to reject and remove the registration for "{team.name}"? This action cannot be undone.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleRejectTeam(team.id)}>Yes, Reject Team</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                  </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                     <div className="text-center text-muted-foreground py-8">
                        No teams in this category.
                    </div>
                )
             )}
        </div>
    );
    
    const ManualTeamRegistration = () => (
      <Card className="mt-8 border-primary/50">
        <CardHeader>
          <CardTitle>Manually Add a Team</CardTitle>
          <CardDescription>Add a team directly to the tournament. Manually added teams are automatically approved.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...manualRegForm}>
            <form onSubmit={manualRegForm.handleSubmit(onManualSubmit)} className="space-y-6">
              <div className="flex justify-center">
                <div className="relative h-24 w-24 bg-muted rounded-full flex items-center justify-center border-2 border-dashed">
                  {logo ? <Image src={logo} alt="Team Logo" layout="fill" className="rounded-full object-cover" /> : <ImageIcon className="h-10 w-10 text-muted-foreground" />}
                  {isGeneratingLogo && <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center"><Loader className="animate-spin text-white" /></div>}
                </div>
              </div>
              <FormField
                control={manualRegForm.control}
                name="teamName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2"><Shield className="h-4 w-4" /> Team Name</FormLabel>
                    <div className="flex items-center gap-2">
                      <FormControl><Input placeholder="Enter team name" {...field} /></FormControl>
                      <Button type="button" variant="outline" size="icon" onClick={handleGenerateLogo} disabled={isGeneratingLogo} title="Generate Logo">
                        {isGeneratingLogo ? <Loader className="animate-spin" /> : <Sparkles />}
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={manualRegForm.control}
                name="ownerEmail"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel className="flex items-center gap-2"><User className="h-4 w-4" /> Team Owner</FormLabel>
                    <UserSearchCombobox
                      value={field.value}
                      onChange={field.onChange}
                      disabled={isSubmitting || isGeneratingLogo}
                    />
                     <FormDescription>
                        Search for a registered user by name or email.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isSubmitting || isGeneratingLogo} className="w-full">
                {isSubmitting ? <Loader className="animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                Add Team
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
                <CardTitle>Invite Teams & Manage Registration</CardTitle>
                <CardDescription>Share the link to let participants register. You can approve or reject teams below.</CardDescription>
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

                {tournament.isTeamCountFixed && (
                    <div className="space-y-2">
                        <div className="flex justify-between items-baseline">
                            <h3 className="font-semibold">Registered Teams</h3>
                            <span className="text-sm text-muted-foreground font-mono">
                                {approvedTeams.length}/{tournament.numberOfTeams}
                            </span>
                        </div>
                        <Progress value={(approvedTeams.length / (tournament.numberOfTeams ?? 1)) * 100} />
                    </div>
                )}
                
                {needsApproval && isPrivilegedUser && (
                   <Alert>
                        <AlertTitle>Registration Approval</AlertTitle>
                        <AlertDescription>
                            This tournament has an open number of spots. You must manually approve teams below. When you are ready, click "Finalize Registration" to lock the team list and proceed.
                        </AlertDescription>
                   </Alert>
                )}

                <div className="space-y-6">
                    {needsApproval && isPrivilegedUser && (
                        <TeamList title="Pending Approval" teamList={pendingTeams}>
                            <ThumbsUp className="h-5 w-5 text-primary" />
                        </TeamList>
                    )}
                    <TeamList title="Approved Teams" teamList={approvedTeams}>
                        <CheckCircle className="h-5 w-5 text-green-600" />
                    </TeamList>
                </div>
                
                {isPrivilegedUser && !isTournamentFull && (
                    <>
                        <Separator />
                        <ManualTeamRegistration />
                    </>
                )}

            </CardContent>
            <CardFooter className="flex-col gap-3 pt-6">
                 {isPrivilegedUser && !tournament.isTeamCountFixed && (
                    <Button size="lg" onClick={handleFinalize} disabled={approvedTeams.length < 3}>
                        Finalize Registration & Proceed <ArrowRight className="ml-2 h-4 w-4"/>
                    </Button>
                 )}
                 {tournament.isTeamCountFixed && (
                    <Button size="lg" disabled={!isReadyToProceed} onClick={() => onTeamsFinalized(approvedTeams)}>
                        {isReadyToProceed ? "All Teams Registered! Proceed" : "Waiting for all teams..."}
                        <ArrowRight className="ml-2 h-4 w-4"/>
                    </Button>
                 )}
                {!isReadyToProceed && tournament.isTeamCountFixed && <p className="text-sm text-muted-foreground">The button will be enabled once all {tournament.numberOfTeams} teams have registered.</p>}
            </CardFooter>
        </Card>
    );
}
