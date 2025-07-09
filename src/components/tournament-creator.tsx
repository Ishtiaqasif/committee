
"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { TournamentCreationData } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Trophy, Settings, MapPin, Gamepad2, Wand2, Sparkles, Loader, ImageIcon } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { generateTournamentLogo } from "@/ai/flows/generate-tournament-logo";
import Image from "next/image";

interface TournamentCreatorProps {
  onTournamentCreated: (data: TournamentCreationData) => void;
}

const formSchema = z.object({
  tournamentName: z.string().min(3, "Tournament name must be at least 3 characters long."),
  logo: z.string().min(1, "A tournament logo is required."),
  isTeamCountFixed: z.boolean().default(true),
  numberOfTeams: z.coerce.number().min(3, "Must have at least 3 teams.").max(32, "Cannot have more than 32 teams.").optional(),
  tournamentType: z.enum(["round-robin", "single elimination", "hybrid"], {
    required_error: "You need to select a tournament type.",
  }),
  isEsports: z.boolean().default(false),
  venues: z.string().optional(),
  roundRobinGrouping: z.enum(['all-play-all', 'grouped']).default('all-play-all'),
  teamsPerGroup: z.coerce.number().optional(),
  roundRobinHomeAndAway: z.boolean().default(false),
  knockoutHomeAndAway: z.boolean().default(false),
  awayGoalsRule: z.boolean().default(false),
  teamsAdvancing: z.coerce.number().optional(),
  fixtureGeneration: z.enum(['random', 'predefined']).default('predefined'),
}).superRefine((data, ctx) => {
    if (data.isTeamCountFixed) {
        if (!data.numberOfTeams) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Number of teams is required for a fixed-size tournament.", path: ["numberOfTeams"] });
        }
        
        if (data.tournamentType === 'hybrid') {
            if (!data.teamsAdvancing) {
                ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Number of advancing teams is required.", path: ["teamsAdvancing"] });
            } else if (data.teamsAdvancing < 2) {
                ctx.addIssue({ code: z.ZodIssueCode.custom, message: "At least 2 teams must advance.", path: ["teamsAdvancing"] });
            } else if (data.numberOfTeams && data.teamsAdvancing >= data.numberOfTeams) {
                ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Must be less than total teams.", path: ["teamsAdvancing"] });
            } else if ((data.teamsAdvancing & (data.teamsAdvancing - 1)) !== 0) {
                 ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Must be a power of two (2, 4, 8...).", path: ["teamsAdvancing"] });
            }
        }
        
        if ((data.tournamentType === 'round-robin' || data.tournamentType === 'hybrid') && data.roundRobinGrouping === 'grouped') {
             if (!data.teamsPerGroup) {
                ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Teams per group is required.", path: ["teamsPerGroup"] });
            } else if (data.teamsPerGroup <= 1) {
                ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Must be greater than 1.", path: ["teamsPerGroup"] });
            } else if (data.numberOfTeams && data.numberOfTeams % data.teamsPerGroup !== 0) {
                ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Must be a divisor of total teams.", path: ["teamsPerGroup"] });
            }
        }
    }
});


const TOURNAMENT_NAMES = [
  "Cosmic Cup", "Galactic Games", "The Phoenix Fire Tournament", "Emerald Challenge", 
  "Titan's Clash", "Vortex Invitational", "Quantum Quest Championship", "Inferno League"
];

// Helper function to resize and compress the image
const compressImage = (dataUri: string, maxWidth: number, maxHeight: number): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new window.Image();
        img.src = dataUri;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let { width, height } = img;

            if (width > height) {
                if (width > maxWidth) {
                    height *= maxWidth / width;
                    width = maxWidth;
                }
            } else {
                if (height > maxHeight) {
                    width *= maxHeight / height;
                    height = maxHeight;
                }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                return reject(new Error('Could not get canvas context'));
            }
            ctx.drawImage(img, 0, 0, width, height);

            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = (error) => {
            reject(error);
        };
    });
};

export default function TournamentCreator({ onTournamentCreated }: TournamentCreatorProps) {
  const [isGeneratingLogo, setIsGeneratingLogo] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tournamentName: "",
      logo: "",
      isTeamCountFixed: true,
      numberOfTeams: 8,
      isEsports: false,
      venues: "",
      roundRobinHomeAndAway: false,
      knockoutHomeAndAway: false,
      awayGoalsRule: false,
      fixtureGeneration: 'predefined',
      roundRobinGrouping: 'all-play-all',
    },
  });

  const isTeamCountFixed = form.watch("isTeamCountFixed");
  const numberOfTeams = form.watch("numberOfTeams");
  const tournamentType = form.watch("tournamentType");
  const roundRobinGrouping = form.watch("roundRobinGrouping");
  const isEsports = form.watch("isEsports");
  const roundRobinHomeAndAway = form.watch("roundRobinHomeAndAway");
  const knockoutHomeAndAway = form.watch("knockoutHomeAndAway");
  const logo = form.watch("logo");


   useEffect(() => {
    if (isTeamCountFixed && numberOfTeams && tournamentType === 'hybrid') {
      const defaultAdvancing = Math.pow(2, Math.floor(Math.log2(numberOfTeams / 2)));
      form.setValue('teamsAdvancing', defaultAdvancing >= 2 ? defaultAdvancing : 2, { shouldValidate: true });
    } else {
      form.setValue('teamsAdvancing', undefined);
    }
  }, [isTeamCountFixed, tournamentType, numberOfTeams, form]);


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

  const handleGenerateRandomName = () => {
    const randomName = TOURNAMENT_NAMES[Math.floor(Math.random() * TOURNAMENT_NAMES.length)];
    form.setValue('tournamentName', randomName, { shouldValidate: true });
  };
  
  const handleGenerateLogo = async () => {
    const tournamentName = form.getValues('tournamentName');
    if (!tournamentName) {
        form.setError('tournamentName', { message: 'Please enter a tournament name first.' });
        return;
    }

    setIsGeneratingLogo(true);
    try {
        const result = await generateTournamentLogo({ tournamentName });
        const compressedLogo = await compressImage(result.logoDataUri, 256, 256);
        form.setValue('logo', compressedLogo, { shouldValidate: true });
    } catch (error) {
        console.error(error);
    } finally {
        setIsGeneratingLogo(false);
    }
  };


  function onSubmit(values: z.infer<typeof formSchema>) {
    const dataToSubmit: TournamentCreationData = { ...values };
    if (!values.isTeamCountFixed) {
        delete dataToSubmit.numberOfTeams;
        delete dataToSubmit.teamsPerGroup;
        delete dataToSubmit.teamsAdvancing;
    }
    onTournamentCreated(dataToSubmit);
  }

  return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader className="text-center">
            <div className="mx-auto bg-primary text-primary-foreground rounded-full p-3 w-fit mb-4">
              <Trophy className="h-8 w-8" />
            </div>
          <CardTitle>Create a New Tournament</CardTitle>
          <CardDescription>Fill in the details below to get started.</CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-6">
              <div className="space-y-4">
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

                <div className="space-y-2">
                    <FormLabel>Tournament Logo</FormLabel>
                    <div className="flex items-center gap-4">
                        <div className="relative h-24 w-24 bg-muted rounded-md flex items-center justify-center border-2 border-dashed">
                            {logo ? (
                                <Image src={logo} alt="Tournament Logo" layout="fill" className="rounded-md object-cover" />
                            ) : (
                                <ImageIcon className="h-10 w-10 text-muted-foreground" />
                            )}
                            {isGeneratingLogo && (
                                <div className="absolute inset-0 bg-black/50 rounded-md flex items-center justify-center">
                                    <Loader className="animate-spin text-white" />
                                </div>
                            )}
                        </div>
                        <div className="flex-1">
                            <Button 
                                type="button" 
                                variant="outline"
                                onClick={handleGenerateLogo}
                                disabled={isGeneratingLogo || !form.watch('tournamentName')}
                            >
                                {isGeneratingLogo ? <Loader className="animate-spin mr-2" /> : <Sparkles className="mr-2" />}
                                Generate Logo
                            </Button>
                            <FormDescription className="mt-2">
                                Generate an AI-powered logo for your tournament. A logo is required.
                            </FormDescription>
                        </div>
                    </div>
                    <FormField control={form.control} name="logo" render={({ field }) => (
                        <FormItem>
                            <FormControl>
                                <Input type="hidden" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="isTeamCountFixed"
                    render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm sm:col-span-2">
                        <div className="space-y-0.5">
                            <FormLabel>Fixed Number of Teams</FormLabel>
                            <FormDescription>
                                Specify the number of teams now, or leave it open for admin approval.
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
                  {isTeamCountFixed && (
                    <FormField
                      control={form.control}
                      name="numberOfTeams"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Number of Teams</FormLabel>
                          <FormControl>
                            <Input type="number" min="3" max="32" {...field} value={field.value ?? ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
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
                </div>
              </div>

              <Accordion type="single" collapsible className="w-full pt-6 border-t">
                <AccordionItem value="advanced-options">
                  <AccordionTrigger className="text-lg font-semibold hover:no-underline">
                      <div className="flex items-center gap-2">
                          <Settings className="h-5 w-5" /> Advanced Options
                      </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-6 space-y-6">
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

                      {(tournamentType === 'round-robin' || tournamentType === 'hybrid') && isTeamCountFixed && (
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
                                  disabled={!roundRobinHomeAndAway && !knockoutHomeAndAway}
                              />
                              </FormControl>
                          </FormItem>
                          )}
                      />

                      {tournamentType === 'hybrid' && isTeamCountFixed && (
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
                                      Randomly Seeded Bracket
                                  </FormLabel>
                                  </FormItem>
                              </RadioGroup>
                              </FormControl>
                              <FormMessage />
                          </FormItem>
                          )}
                      />
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
            <CardFooter className="flex justify-center pt-6">
              <Button type="submit" size="lg">Create Tournament</Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
  );
}
