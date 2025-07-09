
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Tournament } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Settings, ArrowLeft, Loader } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useMemo, useTransition } from "react";

interface FixtureSettingsProps {
  tournament: Tournament;
  onUpdate: (data: Partial<Tournament>) => void;
  onBack: () => void;
  isPrivilegedUser: boolean;
}

const createFormSchema = (tournament: Tournament) => z.object({
  tournamentType: z.enum(["round-robin", "single elimination", "hybrid"], {
    required_error: "You need to select a tournament type.",
  }),
  roundRobinGrouping: z.enum(['all-play-all', 'grouped']).optional(),
  teamsPerGroup: z.coerce.number().optional(),
  teamsAdvancing: z.coerce.number().optional(),
  roundRobinHomeAndAway: z.boolean().default(false),
  knockoutHomeAndAway: z.boolean().default(false),
  awayGoalsRule: z.boolean().default(false),
  fixtureGeneration: z.enum(['random', 'predefined']).default('predefined'),
}).superRefine((data, ctx) => {
    if (data.tournamentType === 'hybrid') {
        if (!data.teamsAdvancing) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Number of advancing teams is required.", path: ["teamsAdvancing"] });
        } else if (data.teamsAdvancing < 2) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "At least 2 teams must advance.", path: ["teamsAdvancing"] });
        } else if (tournament.numberOfTeams && data.teamsAdvancing >= tournament.numberOfTeams) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Must be less than total teams.", path: ["teamsAdvancing"] });
        } else if ((data.teamsAdvancing & (data.teamsAdvancing - 1)) !== 0) {
             ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Must be a power of two (2, 4, 8...).", path: ["teamsAdvancing"] });
        }
    }
    
    if ((data.tournamentType === 'hybrid' || data.tournamentType === 'round-robin') && data.roundRobinGrouping === 'grouped') {
         if (!data.teamsPerGroup) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Teams per group is required.", path: ["teamsPerGroup"] });
        } else if (data.teamsPerGroup <= 1) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Must be greater than 1.", path: ["teamsPerGroup"] });
        } else if (tournament.numberOfTeams && tournament.numberOfTeams % data.teamsPerGroup !== 0) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Must be a divisor of the total teams (${tournament.numberOfTeams}).`, path: ["teamsPerGroup"] });
        }
    }
});


export default function FixtureSettings({ tournament, onUpdate, onBack, isPrivilegedUser }: FixtureSettingsProps) {
  const [isPending, startTransition] = useTransition();
  const formSchema = useMemo(() => createFormSchema(tournament), [tournament]);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  useEffect(() => {
    form.reset({
      tournamentType: tournament.tournamentType || 'single elimination',
      roundRobinGrouping: tournament.roundRobinGrouping || 'all-play-all',
      teamsPerGroup: tournament.teamsPerGroup,
      teamsAdvancing: tournament.teamsAdvancing,
      roundRobinHomeAndAway: tournament.roundRobinHomeAndAway ?? false,
      knockoutHomeAndAway: tournament.knockoutHomeAndAway ?? false,
      awayGoalsRule: tournament.awayGoalsRule ?? false,
      fixtureGeneration: tournament.fixtureGeneration ?? 'predefined',
    });
  }, [tournament, form.reset]);

  const watchedTournamentType = form.watch("tournamentType");
  const roundRobinGrouping = form.watch("roundRobinGrouping");
  const roundRobinHomeAndAway = form.watch("roundRobinHomeAndAway");
  const knockoutHomeAndAway = form.watch("knockoutHomeAndAway");

  function onSubmit(values: z.infer<typeof formSchema>) {
    startTransition(() => {
        onUpdate(values);
    });
  }

  if (!isPrivilegedUser) {
    return (
        <div className="flex flex-col items-center justify-center text-center">
            <div className="mt-6 flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border py-24 text-center w-full">
                <Settings className="mx-auto h-12 w-12 text-accent" />
                <h3 className="mt-4 text-2xl font-semibold">Fixture Settings</h3>
                <p className="mt-2 text-muted-foreground">
                    Waiting for the tournament owner or an admin to configure the fixture settings.
                </p>
            </div>
        </div>
    );
  }

  return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader className="text-center">
            <div className="mx-auto bg-primary text-primary-foreground rounded-full p-3 w-fit mb-4">
              <Settings className="h-8 w-8" />
            </div>
          <CardTitle>Finalize Fixture Settings</CardTitle>
          <CardDescription>
            Registration is complete with {tournament.numberOfTeams} teams. Please confirm the final settings before generating the fixture.
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-6">
                <FormField
                    control={form.control}
                    name="tournamentType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tournament Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={isPending}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="round-robin">Round-robin</SelectItem>
                            <SelectItem value="single elimination">
                              Single Elimination
                            </SelectItem>
                            <SelectItem value="hybrid">Hybrid (Group + Knockout)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                {(watchedTournamentType === 'round-robin' || watchedTournamentType === 'hybrid') && (
                    <div className="space-y-6">
                        <FormField
                            control={form.control}
                            name="roundRobinGrouping"
                            render={({ field }) => (
                                <FormItem className="space-y-3 rounded-lg border p-3 shadow-sm">
                                <FormLabel>Group Stage Format</FormLabel>
                                <FormControl>
                                    <RadioGroup
                                    onValueChange={field.onChange}
                                    value={field.value}
                                    className="space-y-2"
                                    disabled={isPending}
                                    >
                                    <FormItem className="flex items-center space-x-3 space-y-0">
                                        <FormControl>
                                        <RadioGroupItem value="all-play-all" />
                                        </FormControl>
                                        <FormLabel className="font-normal">
                                        All-Play-All
                                        </FormLabel>
                                    </FormItem>
                                    <FormItem className="flex items-center space-x-3 space-y-0">
                                        <FormControl>
                                        <RadioGroupItem value="grouped" />
                                        </FormControl>
                                        <FormLabel className="font-normal">
                                        Grouped
                                        </FormLabel>
                                    </FormItem>
                                    </RadioGroup>
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        {roundRobinGrouping === 'grouped' && (
                            <FormField
                                control={form.control}
                                name="teamsPerGroup"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Teams Per Group</FormLabel>
                                    <FormControl>
                                    <Input type="number" placeholder="e.g., 4" {...field} value={field.value ?? ''} disabled={isPending}/>
                                    </FormControl>
                                    <FormDescription>
                                        Must be a divisor of the total teams ({tournament.numberOfTeams}).
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                        )}
                    </div>
                )}
                 {watchedTournamentType === 'hybrid' && (
                    <FormField
                        control={form.control}
                        name="teamsAdvancing"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Teams Advancing to Knockout</FormLabel>
                            <FormControl>
                            <Input type="number" placeholder="e.g., 4" {...field} value={field.value ?? ''} disabled={isPending}/>
                            </FormControl>
                            <FormDescription>
                            Must be a power of two (2, 4, 8...).
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                )}
                
                {(watchedTournamentType === 'round-robin' || watchedTournamentType === 'hybrid') && (
                <FormField
                    control={form.control}
                    name="roundRobinHomeAndAway"
                    render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                        <FormLabel>{watchedTournamentType === 'hybrid' ? 'Group Stage Home & Away' : 'Home & Away'}</FormLabel>
                        <FormDescription>
                            Play each opponent twice.
                        </FormDescription>
                        </div>
                        <FormControl>
                        <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={isPending}
                        />
                        </FormControl>
                    </FormItem>
                    )}
                />
                )}

                {(watchedTournamentType === 'single elimination' || watchedTournamentType === 'hybrid') && (
                <FormField
                    control={form.control}
                    name="knockoutHomeAndAway"
                    render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                        <FormLabel>{watchedTournamentType === 'hybrid' ? 'Knockout Stage Home & Away' : 'Home & Away'}</FormLabel>
                        <FormDescription>
                            Play two-legged (home & away) ties.
                        </FormDescription>
                        </div>
                        <FormControl>
                        <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={isPending}
                        />
                        </FormControl>
                    </FormItem>
                    )}
                />
                )}
                
                <FormField
                    control={form.control}
                    name="awayGoalsRule"
                    render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                        <FormLabel>Away Goals Rule</FormLabel>
                        <FormDescription>
                            Apply away goals rule in two-legged ties.
                        </FormDescription>
                        </div>
                        <FormControl>
                        <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={!roundRobinHomeAndAway && !knockoutHomeAndAway || isPending}
                        />
                        </FormControl>
                    </FormItem>
                    )}
                />
                
                <FormField
                    control={form.control}
                    name="fixtureGeneration"
                    render={({ field }) => (
                    <FormItem className="space-y-3 rounded-lg border p-3 shadow-sm">
                        <FormLabel>Fixture Generation</FormLabel>
                        <FormControl>
                        <RadioGroup
                            onValueChange={field.onChange}
                            value={field.value}
                            className="space-y-2"
                            disabled={isPending}
                        >
                            <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                                <RadioGroupItem value="predefined" />
                            </FormControl>
                            <FormLabel className="font-normal">
                                Predefined Path (Seeded)
                            </FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                                <RadioGroupItem value="random" />
                            </FormControl>
                            <FormLabel className="font-normal">
                                Randomly Seeded Bracket
                            </FormLabel>
                            </FormItem>
                        </RadioGroup>
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                 
                 { (watchedTournamentType === 'single elimination') && (
                    <p className="text-center text-muted-foreground p-4">No additional settings are required for a Single Elimination tournament.</p>
                 )}
            </CardContent>
            <CardFooter className="flex justify-center pt-6 gap-4">
              <Button type="button" variant="outline" onClick={onBack} disabled={isPending}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Registration
              </Button>
              <Button type="submit" size="lg" disabled={isPending}>
                {isPending && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                Save Settings & Continue
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
  );
}
