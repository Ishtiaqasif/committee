"use client";

import type { Team } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Shield } from 'lucide-react';
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
                                <Image src={team.logo} alt={`${team.name} logo`} width={32} height={32} className="rounded-full" />
                            ) : (
                                <Shield className="h-6 w-6 text-primary/80"/>
                            )}
                            <span className="font-medium text-lg">{team.name}</span>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
