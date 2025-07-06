"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import type { Tournament } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Trophy, Settings, MapPin, Gamepad2, Wand2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";

interface TournamentCreatorProps {
  onTournamentCreated: (data: Tournament) => void;
}

const formSchema = z.object({
  tournamentName: z.string().min(3, "Tournament name must be at least 3 characters long."),
  numberOfTeams: z.coerce.number().min(3, "Must have at least 3 teams.").max(32, "Cannot have more than 32 teams."),
  tournamentType: z.enum(["round-robin", "single elimination", "hybrid"], {
    required_error: "You need to select a tournament type.",
  }),
  isEsports: z.boolean().default(false),
  venues: z.string().optional(),
  roundRobinGrouping: z.enum(['all-play-all', 'grouped']).default('all-play-all'),
  teamsPerGroup: z.coerce.number().optional(),
  roundRobinHomeAndAway: z.boolean().default(false),
  knockoutHomeAndAway: z.boolean().default(false),
  teamsAdvancing: z.coerce.number().optional(),
  fixtureGeneration: z.enum(['random', 'predefined']).default('predefined'),
}).refine(data => {
    if (data.tournamentType !== 'hybrid') return true;
    if (data.teamsAdvancing === undefined || data.teamsAdvancing < 2) return false;
    return data.teamsAdvancing < data.numberOfTeams && (data.teamsAdvancing & (data.teamsAdvancing - 1)) === 0;
}, {
    message: "Must be a power of two and less than total teams.",
    path: ["teamsAdvancing"],
}).refine(data => {
    if (data.tournamentType !== 'round-robin' && data.tournamentType !== 'hybrid') return true;
    if (data.roundRobinGrouping !== 'grouped') return true;
    if (!data.teamsPerGroup || data.teamsPerGroup <= 1) return false;
    return data.numberOfTeams % data.teamsPerGroup === 0;
}, {
    message: "Must be a divisor of total teams and > 1.",
    path: ["teamsPerGroup"],
});

const TOURNAMENT_NAMES = [
  "Cosmic Cup", "Galactic Games", "The Phoenix Fire Tournament", "Emerald Challenge", 
  "Titan's Clash", "Vortex Invitational", "Quantum Quest Championship", "Inferno League"
];

export default function TournamentCreator({ onTournamentCreated }: TournamentCreatorProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tournamentName: "",
      numberOfTeams: 8,
      isEsports: false,
      venues: "",
      roundRobinHomeAndAway: false,
      knockoutHomeAndAway: false,
      fixtureGeneration: 'predefined',
      roundRobinGrouping: 'all-play-all',
    },
  });

  const numberOfTeams = form.watch("numberOfTeams");
  const tournamentType = form.watch("tournamentType");
  const roundRobinGrouping = form.watch("roundRobinGrouping");
  const isEsports = form.watch("isEsports");

   useEffect(() => {
    if (tournamentType === 'hybrid') {
      const defaultAdvancing = Math.pow(2, Math.floor(Math.log2(numberOfTeams / 2)));
      form.setValue('teamsAdvancing', defaultAdvancing >= 2 ? defaultAdvancing : 2, { shouldValidate: true });
    } else {
      form.setValue('teamsAdvancing', undefined);
    }
  }, [tournamentType, numberOfTeams, form]);


  useEffect(() => {
    if (roundRobinGrouping !== 'grouped') {
        form.setValue('teamsPerGroup', undefined, { shouldValidate: true });
    }
  }, [roundRobinGrouping, form]);

  useEffect(() => {
    if (isEsports) {
        form.setValue('venues', '', { shouldValidate: true });
    }
  }, [isEsports, form]);


  const isPowerOfTwo = (n: number) => {
    if (typeof n !== 'number' || n <= 1) return false;
    return (n & (n - 1)) === 0;
  };

  const isSingleEliminationDisabled = !isPowerOfTwo(numberOfTeams);

  useEffect(() => {
    if (isSingleEliminationDisabled && form.getValues("tournamentType") === "single elimination") {
      form.resetField("tournamentType");
    }
  }, [numberOfTeams, isSingleEliminationDisabled, form]);

  const handleGenerateRandomName = () => {
    const randomName = TOURNAMENT_NAMES[Math.floor(Math.random() * TOURNAMENT_NAMES.length)];
    form.setValue('tournamentName', randomName, { shouldValidate: true });
  };


  function onSubmit(values: z.infer<typeof formSchema>) {
    onTournamentCreated(values as Tournament);
  }

  return (
      <Card className="w-full max-w-lg mx-auto border-0 shadow-none">
        <CardHeader className="text-center">
            <div className="mx-auto bg-primary text-primary-foreground rounded-full p-3 w-fit mb-4">
              <Trophy className="h-8 w-8" />
            </div>
          <CardTitle>Create a New Tournament</CardTitle>
          <CardDescription>Fill in the details below to get started.</CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="tournamentName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tournament Name</FormLabel>
                     <div className="flex gap-2">
                        <FormControl>
                          <Input placeholder="e.g., Summer Cup 2024" {...field} />
                        </FormControl>
                        <Button type="button" variant="outline" size="icon" onClick={handleGenerateRandomName}>
                            <Wand2 className="h-4 w-4" />
                            <span className="sr-only">Generate Random Name</span>
                        </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="numberOfTeams"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Number of Teams</FormLabel>
                      <FormControl>
                        <Input type="number" min="3" max="32" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="tournamentType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tournament Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="round-robin">Round-robin</SelectItem>
                          <SelectItem value="single elimination" disabled={isSingleEliminationDisabled}>
                            Single Elimination
                          </SelectItem>
                          <SelectItem value="hybrid">Hybrid (Group + Knockout)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

               <div className="space-y-8 pt-4 border-t mt-6">
                     <div className="flex items-center gap-2 text-lg font-semibold">
                        <Settings className="h-5 w-5" /> Advanced Options
                    </div>
                    <div className="space-y-6">
                            <FormField
                                control={form.control}
                                name="isEsports"
                                render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                    <div className="space-y-0.5">
                                        <FormLabel className="flex items-center gap-2"><Gamepad2 className="h-4 w-4"/> Esports Tournament</FormLabel>
                                        <FormDescription>
                                            If enabled, venues will be disabled.
                                        </FormDescription>
                                    </div>
                                    <FormControl>
                                    <Switch
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                    />
                                    </FormControl>
                                </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="venues"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="flex items-center gap-2"><MapPin className="h-4 w-4"/> Venues</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="e.g., Main Stadium, Arena 1, Court 2" {...field} disabled={isEsports} />
                                    </FormControl>
                                    <FormDescription>
                                        Enter a comma-separated list of venues. Disabled for esports.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />

                            {(tournamentType === 'round-robin' || tournamentType === 'hybrid') && (
                                <div className="space-y-6">
                                    <FormField
                                        control={form.control}
                                        name="roundRobinGrouping"
                                        render={({ field }) => (
                                            <FormItem className="space-y-3 rounded-lg border p-3 shadow-sm">
                                            <FormLabel>Round-Robin Format</FormLabel>
                                            <FormControl>
                                                <RadioGroup
                                                onValueChange={field.onChange}
                                                defaultValue={field.value}
                                                className="space-y-2"
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
                                                <Input type="number" placeholder="e.g., 4" {...field} value={field.value ?? ''} />
                                                </FormControl>
                                                <FormDescription>
                                                Must be a divisor of the total number of teams.
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                            )}
                                        />
                                    )}
                                </div>
                            )}

                            {(tournamentType === 'round-robin' || tournamentType === 'hybrid') && (
                            <FormField
                                control={form.control}
                                name="roundRobinHomeAndAway"
                                render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                    <div className="space-y-0.5">
                                    <FormLabel>{tournamentType === 'hybrid' ? 'Group Stage Home & Away' : 'Home & Away'}</FormLabel>
                                    <FormDescription>
                                        Play each opponent twice.
                                    </FormDescription>
                                    </div>
                                    <FormControl>
                                    <Switch
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                    />
                                    </FormControl>
                                </FormItem>
                                )}
                            />
                            )}

                            {(tournamentType === 'single elimination' || tournamentType === 'hybrid') && (
                            <FormField
                                control={form.control}
                                name="knockoutHomeAndAway"
                                render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                    <div className="space-y-0.5">
                                    <FormLabel>{tournamentType === 'hybrid' ? 'Knockout Stage Home & Away' : 'Home & Away'}</FormLabel>
                                    <FormDescription>
                                        Play two-legged (home & away) ties.
                                    </FormDescription>
                                    </div>
                                    <FormControl>
                                    <Switch
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                    />
                                    </FormControl>
                                </FormItem>
                                )}
                            />
                            )}

                            {tournamentType === 'hybrid' && (
                            <FormField
                                control={form.control}
                                name="teamsAdvancing"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Teams Advancing to Knockout</FormLabel>
                                    <FormControl>
                                    <Input type="number" placeholder="e.g., 4" {...field} value={field.value ?? ''} />
                                    </FormControl>
                                    <FormDescription>
                                    Must be a power of two (2, 4, 8...).
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                            )}

                            <FormField
                                control={form.control}
                                name="fixtureGeneration"
                                render={({ field }) => (
                                <FormItem className="space-y-3 rounded-lg border p-3 shadow-sm">
                                    <FormLabel>Fixture Generation</FormLabel>
                                    <FormControl>
                                    <RadioGroup
                                        onValueChange={field.onChange}
                                        defaultValue={field.value}
                                        className="space-y-2"
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
                                            Randomized Pairings
                                        </FormLabel>
                                        </FormItem>
                                    </RadioGroup>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                    </div>
                </div>
            </CardContent>
            <CardFooter className="flex justify-center">
              <Button type="submit" size="lg">Create Tournament</Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
  );
}
