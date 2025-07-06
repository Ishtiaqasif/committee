"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import type { Tournament } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Trophy } from "lucide-react";


interface TournamentCreatorProps {
  onTournamentCreated: (data: Tournament) => void;
}

const formSchema = z.object({
  tournamentName: z.string().min(3, "Tournament name must be at least 3 characters long."),
  numberOfTeams: z.coerce.number().min(2, "Must have at least 2 teams.").max(32, "Cannot have more than 32 teams."),
  tournamentType: z.enum(["round-robin", "single elimination", "hybrid"]),
});

export default function TournamentCreator({ onTournamentCreated }: TournamentCreatorProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tournamentName: "",
      numberOfTeams: 8,
    },
  });

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
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="tournamentName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tournament Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Summer Cup 2024" {...field} />
                    </FormControl>
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
                        <Input type="number" min="2" max="32" {...field} />
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
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="round-robin">Round-robin</SelectItem>
                          <SelectItem value="single elimination">Single Elimination</SelectItem>
                          <SelectItem value="hybrid">Hybrid (Round-robin + Knockout)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
