
"use client";

import type { PointsTableEntry } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Image from 'next/image';
import { Shield, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PointsTableProps {
  title: string;
  table: PointsTableEntry[];
  viewMode: 'full' | 'short';
  userTeamName?: string;
}

export default function PointsTable({ title, table, viewMode, userTeamName }: PointsTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Team</TableHead>
              <TableHead className="text-center">P</TableHead>
              <TableHead className="text-center">W</TableHead>
              <TableHead className="text-center">D</TableHead>
              <TableHead className="text-center">L</TableHead>
              {viewMode === 'full' && (
                <>
                  <TableHead className="text-center">GF</TableHead>
                  <TableHead className="text-center">GA</TableHead>
                  <TableHead className="text-center">GD</TableHead>
                </>
              )}
              <TableHead className="text-center">Pts</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {table.map(entry => (
              <TableRow key={entry.teamName} className={cn(
                entry.teamName === userTeamName && "bg-primary/10",
                entry.qualified && "bg-accent/10",
              )}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {entry.logo ? <Image src={entry.logo} alt={`${entry.teamName} logo`} width={24} height={24} className="rounded-full" /> : <Shield className="h-5 w-5 text-muted-foreground" />}
                    <span>{entry.teamName}</span>
                     {entry.qualified && (
                        <Trophy className="h-4 w-4 text-accent" title="Qualifies for next stage" />
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-center">{entry.played}</TableCell>
                <TableCell className="text-center">{entry.won}</TableCell>
                <TableCell className="text-center">{entry.drawn}</TableCell>
                <TableCell className="text-center">{entry.lost}</TableCell>
                 {viewMode === 'full' && (
                    <>
                        <TableCell className="text-center">{entry.goalsFor}</TableCell>
                        <TableCell className="text-center">{entry.goalsAgainst}</TableCell>
                        <TableCell className="text-center">{entry.goalDifference}</TableCell>
                    </>
                )}
                <TableCell className="font-bold text-center">{entry.points}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
