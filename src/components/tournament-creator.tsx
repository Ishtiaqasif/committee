

"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Tournament } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Trophy, MapPin, Gamepad2, Wand2, Sparkles, Loader, ImageIcon } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { generateTournamentLogo } from "@/ai/flows/generate-tournament-logo";
import Image from "next/image";

interface TournamentCreatorProps {
  onTournamentCreated: (data: Partial<Tournament>) => Promise<void>;
}

const formSchema = z.object({
  tournamentName: z.string().min(3, "Tournament name must be at least 3 characters long."),
  logo: z.string().min(1, "A tournament logo is required."),
  isTeamCountFixed: z.boolean().default(true),
  numberOfTeams: z.coerce.number().min(3, "Must have at least 3 teams.").max(32, "Cannot have more than 32 teams.").optional(),
  isEsports: z.boolean().default(false),
  venues: z.string().optional(),
}).superRefine((data, ctx) => {
    if (data.isTeamCountFixed && !data.numberOfTeams) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Number of teams is required for a fixed-size tournament.", path: ["numberOfTeams"] });
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tournamentName: "",
      logo: "",
      isTeamCountFixed: true,
      numberOfTeams: 8,
      isEsports: false,
      venues: "",
    },
  });

  const isTeamCountFixed = form.watch("isTeamCountFixed");
  const isEsports = form.watch("isEsports");
  const logo = form.watch("logo");

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


  async function onSubmit(values: z.infer<typeof formSchema>) {
    const dataToSubmit: Partial<Tournament> = { ...values };
    if (!values.isTeamCountFixed) {
        delete dataToSubmit.numberOfTeams;
    }
    
    setIsSubmitting(true);
    try {
      await onTournamentCreated(dataToSubmit);
    } catch (error) {
      // Error is handled in parent component, but we still want to stop loading
      setIsSubmitting(false);
    }
    // If successful, the component will unmount, no need to set submitting to false.
    // If there's an error, the finally block will run.
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
              <fieldset disabled={isSubmitting} className="space-y-6">
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
                                disabled={isGeneratingLogo || !form.watch('tournamentName') || isSubmitting}
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
                            <FormLabel>Number of Teams</FormLabel>
                            <FormDescription>
                                {field.value ? 'Fixed number of teams.' : 'Open registration (admin approval).'}
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
                </div>
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
              </fieldset>
            </CardContent>
            <CardFooter className="flex justify-center pt-6">
              <Button type="submit" size="lg" disabled={isSubmitting || isGeneratingLogo}>
                {isSubmitting && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                Create Tournament
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
  );
}
