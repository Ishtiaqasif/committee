"use client";

import type { Team } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Shield, User } from 'lucide-react';
import Image from 'next/image';

export default function TeamsList({ teams }: { teams: Team[] }) {
    return (
        <div>
            <h2 className="text-3xl font-bold text-primary">Registered Teams</h2>
            <p className="text-muted-foreground">A total of {teams.length} teams are participating.</p>
            <div className="mt-6 grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]">
                {teams.map(team => (
                    <Card key={team.id} className="bg-secondary/50">
                        <CardContent className="p-4 flex items-center gap-3">
                           {team.logo ? (
                                <Image src={team.logo} alt={`${team.name} logo`} width={40} height={40} className="rounded-full bg-background object-cover" />
                            ) : (
                                <div className="h-10 w-10 flex-shrink-0 rounded-full bg-muted flex items-center justify-center">
                                    <Shield className="h-6 w-6 text-primary/80"/>
                                </div>
                            )}
                            <div className="flex flex-col overflow-hidden">
                                <span className="font-medium text-lg truncate">{team.name}</span>
                                {team.ownerName && (
                                    <span className="text-sm text-muted-foreground flex items-center gap-1.5 truncate">
                                        <User className="h-3 w-3 flex-shrink-0" />
                                        {team.ownerName}
                                    </span>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
