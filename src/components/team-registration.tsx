"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import type { Team } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Users, Shield } from "lucide-react";

interface TeamRegistrationProps {
  numberOfTeams: number;
  onTeamsRegistered: (teams: Team[]) => void;
}

const formSchema = z.object({
  teams: z.array(z.object({ name: z.string().min(1, "Team name is required.") }))
});

export default function TeamRegistration({ numberOfTeams, onTeamsRegistered }: TeamRegistrationProps) {
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
    }));
    onTeamsRegistered(teams);
  }

  return (
      <Card className="w-full max-w-2xl mx-auto border-0 shadow-none">
        <CardHeader className="text-center">
          <div className="mx-auto bg-primary text-primary-foreground rounded-full p-3 w-fit mb-4">
              <Users className="h-8 w-8" />
          </div>
          <CardTitle>Register Teams</CardTitle>
          <CardDescription>Enter the names for the {numberOfTeams} participating teams.</CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
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
                        <FormControl>
                          <Input placeholder={`Enter Team ${index + 1} Name`} {...field} />
                        </FormControl>
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
