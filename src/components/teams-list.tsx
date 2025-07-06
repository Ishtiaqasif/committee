"use client";

import type { Team } from '@/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Users, Shield } from 'lucide-react';

export default function TeamsList({ teams }: { teams: Team[] }) {
    return (
        <div>
            <h2 className="text-3xl font-bold text-primary">Registered Teams</h2>
            <p className="text-muted-foreground">A total of {teams.length} teams are participating.</p>
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {teams.map(team => (
                    <Card key={team.id} className="bg-secondary/50">
                        <CardContent className="p-4 flex items-center gap-3">
                            <Shield className="h-6 w-6 text-primary/80"/>
                            <span className="font-medium text-lg">{team.name}</span>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
