
"use client";

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { Tournament, TiebreakerRule } from '@/types';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BookOpen, ListChecks, Loader, Save, Settings, Users, Trophy, Gamepad2, MapPin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTransition } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';

interface TournamentRulesProps {
  tournament: Tournament;
  onUpdate: (data: Partial<Tournament>) => void;
  isPrivilegedUser: boolean;
}

const formSchema = z.object({
  tiebreakerRule1: z.custom<TiebreakerRule>(),
  tiebreakerRule2: z.custom<TiebreakerRule>(),
}).refine(data => data.tiebreakerRule1 !== data.tiebreakerRule2, {
  message: "Primary and secondary rules must be different.",
  path: ["tiebreakerRule2"],
});

const InfoRow = ({ label, value }: { label: string, value: React.ReactNode }) => (
  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-3 border-b last:border-b-0">
    <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
    <dd className="mt-1 sm:mt-0 font-semibold text-sm text-right">{value}</dd>
  </div>
);

const tiebreakerOptions: { label: string, value: TiebreakerRule }[] = [
    { label: 'Goal Difference', value: 'goalDifference' },
    { label: 'Goals For', value: 'goalsFor' },
];

export default function TournamentRules({ tournament, onUpdate, isPrivilegedUser }: TournamentRulesProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tiebreakerRule1: tournament.tiebreakerRules?.[0] || 'goalDifference',
      tiebreakerRule2: tournament.tiebreakerRules?.[1] || 'goalsFor',
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    startTransition(async () => {
      await onUpdate({ tiebreakerRules: [values.tiebreakerRule1, values.tiebreakerRule2] });
      toast({ title: 'Success', description: 'Tie-breaker rules have been updated.' });
    });
  };
  
  const rule1 = form.watch('tiebreakerRule1');
  const rule2 = form.watch('tiebreakerRule2');

  return (
    <div>
      <h2 className="text-3xl font-bold text-primary">Tournament Rules & Configuration</h2>
      <p className="text-muted-foreground">An overview of the tournament setup and tie-breaker settings.</p>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Settings className="h-5 w-5" />Configuration</CardTitle>
                <CardDescription>A summary of the tournament's setup.</CardDescription>
            </CardHeader>
            <CardContent>
                <dl>
                    <InfoRow label="Tournament Type" value={<Badge variant="secondary" className="capitalize">{tournament.tournamentType.replace('-', ' ')}</Badge>} />
                    <InfoRow label="Number of Teams" value={<Badge variant="secondary"><Users className="h-3 w-3 mr-1.5"/>{tournament.numberOfTeams}</Badge>} />
                    <InfoRow label="Venue Type" value={<Badge variant="secondary"><Gamepad2 className="h-3 w-3 mr-1.5"/>{tournament.isEsports ? 'Esports' : 'In-Person'}</Badge>} />
                    {tournament.venues && <InfoRow label="Venues" value={<span className="text-muted-foreground text-xs">{tournament.venues}</span>} />}
                    <InfoRow label="Fixture Generation" value={<Badge variant="outline" className="capitalize">{tournament.fixtureGeneration}</Badge>} />
                    
                    {(tournament.tournamentType === 'round-robin' || tournament.tournamentType === 'hybrid') && (
                        <>
                           <InfoRow label="Group Stage Format" value={<Badge variant="outline" className="capitalize">{tournament.roundRobinGrouping === 'grouped' ? 'Groups' : 'All-Play-All'}</Badge>} />
                           {tournament.teamsPerGroup && <InfoRow label="Teams Per Group" value={<Badge variant="outline">{tournament.teamsPerGroup}</Badge>} />}
                           <InfoRow label="Group Stage Legs" value={<Badge variant="outline">{tournament.roundRobinHomeAndAway ? 'Two-Legged' : 'Single Leg'}</Badge>} />
                        </>
                    )}
                    
                    {(tournament.tournamentType === 'single elimination' || tournament.tournamentType === 'hybrid') && (
                        <>
                            {tournament.teamsAdvancing && <InfoRow label="Teams in Knockout" value={<Badge variant="outline">{tournament.teamsAdvancing}</Badge>} />}
                            <InfoRow label="Knockout Stage Legs" value={<Badge variant="outline">{tournament.knockoutHomeAndAway ? 'Two-Legged' : 'Single Leg'}</Badge>} />
                        </>
                    )}
                </dl>
            </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ListChecks className="h-5 w-5" /> Round-Robin Tie-Breakers</CardTitle>
            <CardDescription>Define the order of rules to break ties in points tables.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                 <fieldset disabled={!isPrivilegedUser || isPending} className="space-y-6">
                    <FormField
                        control={form.control}
                        name="tiebreakerRule1"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Primary Tie-Breaker</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a rule" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {tiebreakerOptions.map(opt => (
                                        <SelectItem key={opt.value} value={opt.value} disabled={opt.value === rule2}>
                                            {opt.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="tiebreakerRule2"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Secondary Tie-Breaker</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a rule" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                     {tiebreakerOptions.map(opt => (
                                        <SelectItem key={opt.value} value={opt.value} disabled={opt.value === rule1}>
                                            {opt.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                 </fieldset>
                
                {isPrivilegedUser && (
                  <div className="flex justify-end pt-4">
                    <Button type="submit" disabled={isPending}>
                        {isPending && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                        <Save className="mr-2 h-4 w-4" />
                        Save Tie-Breaker Rules
                    </Button>
                  </div>
                )}
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
