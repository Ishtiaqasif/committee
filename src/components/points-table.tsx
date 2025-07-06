"use client";

import type { PointsTableEntry } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface PointsTableProps {
  title: string;
  table: PointsTableEntry[];
}

export default function PointsTable({ title, table }: PointsTableProps) {
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
              <TableHead className="text-center">Pts</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {table.map(entry => (
              <TableRow key={entry.teamName}>
                <TableCell className="font-medium">{entry.teamName}</TableCell>
                <TableCell className="text-center">{entry.played}</TableCell>
                <TableCell className="text-center">{entry.won}</TableCell>
                <TableCell className="text-center">{entry.drawn}</TableCell>
                <TableCell className="text-center">{entry.lost}</TableCell>
                <TableCell className="font-bold text-center">{entry.points}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
