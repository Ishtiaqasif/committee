
"use client";

import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Team } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Users, Shield, Wand2, Sparkles, Loader, Image as ImageIcon } from "lucide-react";
import { generateTeamLogo } from "@/ai/flows/generate-team-logo";
import Image from "next/image";

interface TeamRegistrationProps {
  numberOfTeams: number;
  onTeamsRegistered: (teams: Team[]) => void;
}

const formSchema = z.object({
  teams: z.array(z.object({ name: z.string().min(1, "Team name is required.") }))
});

const TEAM_NAMES = [
    "Cosmic Comets", "Solar Flares", "Arctic Wolves", "Desert Vipers", "Jungle Jaguars", 
    "Mountain Yetis", "Oceanic Krakens", "Volcanic Dragons", "Shadow Ninjas", "Golden Griffins", 
    "Iron Golems", "Storm Giants", "Celestial Wizards", "Quantum Leapers", "Cybernetic Spartans", 
    "Abyssal Hydras", "Crystal Paladins", "Crimson Phoenixes", "Emerald Serpents", "Diamond Drakes",
    "Thunderbolts", "Wolverines", "Raptors", "Stallions", "Cobras", "Gladiators", "Titans",
    "Warriors", "Avengers", "Rebels", "Sharks", "Eagles"
];

export default function TeamRegistration({ numberOfTeams, onTeamsRegistered }: TeamRegistrationProps) {
  const [logos, setLogos] = useState<Record<number, string>>({});
  const [loadingLogos, setLoadingLogos] = useState<Record<number, boolean>>({});

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      teams: Array.from({ length: numberOfTeams }, () => ({ name: "" })),
    },
  });

  const { fields } = useFieldArray({
    control: form.control,
    name: "teams",
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    const teams = values.teams.map((team, index) => ({
      id: index + 1,
      name: team.name,
      logo: logos[index + 1],
    }));
    onTeamsRegistered(teams);
  }

  const handleGenerateRandomNames = () => {
    const shuffled = [...TEAM_NAMES].sort(() => 0.5 - Math.random());
    const randomNames = shuffled.slice(0, numberOfTeams);
    randomNames.forEach((name, index) => {
        form.setValue(`teams.${index}.name`, name, { shouldValidate: true });
    });
  };

  const handleGenerateLogo = async (index: number) => {
    const teamName = form.getValues(`teams.${index}.name`);
    if (!teamName) {
        form.setError(`teams.${index}.name`, { type: 'manual', message: 'Enter a name first.' });
        return;
    }
    setLoadingLogos(prev => ({ ...prev, [index + 1]: true }));
    try {
        const result = await generateTeamLogo({ teamName });
        setLogos(prev => ({ ...prev, [index + 1]: result.logoDataUri }));
    } catch (error) {
        console.error("Failed to generate logo", error);
    } finally {
        setLoadingLogos(prev => ({ ...prev, [index + 1]: false }));
    }
  };


  return (
      <Card className="w-full max-w-4xl mx-auto border-0 shadow-none">
        <CardHeader className="text-center">
          <div className="mx-auto bg-primary text-primary-foreground rounded-full p-3 w-fit mb-4">
              <Users className="h-8 w-8" />
          </div>
          <CardTitle>Register Teams</CardTitle>
          <CardDescription>Enter the names for the {numberOfTeams} participating teams and generate their logos.</CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-6">
               <div className="flex justify-end">
                <Button type="button" variant="outline" onClick={handleGenerateRandomNames}>
                    <Wand2 className="mr-2 h-4 w-4" />
                    Generate Random Names
                </Button>
            </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                {fields.map((field, index) => (
                  <FormField
                    key={field.id}
                    control={form.control}
                    name={`teams.${index}.name`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                            <Shield className="h-4 w-4 text-primary/80"/> Team {index + 1}
                        </FormLabel>
                        <div className="flex items-center gap-2">
                          <div className="flex-shrink-0 h-10 w-10 bg-muted rounded-full flex items-center justify-center">
                            {logos[index + 1] ? (
                                <Image src={logos[index + 1]!} alt={`Logo for Team ${index + 1}`} width={40} height={40} className="rounded-full" />
                            ) : (
                                <ImageIcon className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                          <FormControl>
                            <Input placeholder={`Enter Team ${index + 1} Name`} {...field} />
                          </FormControl>
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="icon" 
                            onClick={() => handleGenerateLogo(index)}
                            disabled={loadingLogos[index + 1]}
                            title="Generate Logo"
                           >
                            {loadingLogos[index + 1] ? <Loader className="animate-spin" /> : <Sparkles className="h-4 w-4" />}
                          </Button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}
              </div>
            </CardContent>
            <CardFooter className="flex justify-center">
              <Button type="submit" size="lg">Register Teams & Proceed</Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
  );
}
