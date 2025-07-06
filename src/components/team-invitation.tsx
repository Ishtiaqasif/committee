"use client";

import { useEffect, useState } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import type { Team, Tournament } from '@/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Clipboard, Check, Users, Shield, Link as LinkIcon, ArrowRight, Loader } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface TeamInvitationProps {
    tournament: Tournament;
    onTeamsFinalized: (teams: Team[]) => void;
}

export default function TeamInvitation({ tournament, onTeamsFinalized }: TeamInvitationProps) {
    const [teams, setTeams] = useState<Team[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [copied, setCopied] = useState(false);
    
    const registrationLink = `${window.location.origin}/register/${tournament.id}`;

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

    const isReadyToProceed = teams.length === tournament.numberOfTeams;

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
                                        <Shield className="h-5 w-5 text-primary/80" />
                                        <span className="font-medium">{team.name}</span>
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
            </CardContent>
            <CardFooter className="flex-col gap-3">
                <Button size="lg" disabled={!isReadyToProceed} onClick={() => onTeamsFinalized(teams)}>
                    {isReadyToProceed ? "All Teams Registered! Proceed" : "Waiting for all teams..."}
                    <ArrowRight className="ml-2 h-4 w-4"/>
                </Button>
                {!isReadyToProceed && <p className="text-sm text-muted-foreground">The button will be enabled once all {tournament.numberOfTeams} teams have registered.</p>}
            </CardFooter>
        </Card>
    );
}
