"use client";

import { Card, CardContent } from '@/components/ui/card';
import Image from 'next/image';
import { Shield, Trophy } from 'lucide-react';

interface ChampionViewProps {
  winner: { name: string, logo?: string } | null;
}

export default function ChampionView({ winner }: ChampionViewProps) {
  if (!winner) return null;
  
  return (
    <div className="w-full flex flex-col items-center justify-center text-center mt-8 p-8 rounded-lg animate-in fade-in-50 duration-1000">
      <Trophy className="w-28 h-28 text-accent drop-shadow-[0_0_15px_hsl(var(--accent))] animate-float" />
      <h2 className="text-7xl font-extrabold text-primary mt-4 tracking-wider uppercase">Champion</h2>
      <p className="mt-2 text-xl text-muted-foreground">Congratulations to the tournament winner!</p>
      <Card className="mt-10 w-80 bg-card/50 backdrop-blur-sm border-accent border-2 shadow-2xl animate-glow">
        <CardContent className="p-6 flex flex-col items-center justify-center gap-4">
          {winner.logo ? 
            <Image src={winner.logo} alt={`${winner.name} logo`} width={96} height={96} className="rounded-full ring-4 ring-accent bg-background p-1" /> : 
            <div className="w-24 h-24 rounded-full ring-4 ring-accent bg-muted flex items-center justify-center">
              <Shield className="w-12 h-12 text-muted-foreground" />
            </div>
          }
          <span className="text-4xl font-bold text-card-foreground mt-2">
            {winner.name}
          </span>
        </CardContent>
      </Card>
    </div>
  );
}
