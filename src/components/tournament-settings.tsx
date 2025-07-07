"use client";

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { Tournament, TournamentCreationData } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Languages, Save, FileSignature, Loader } from 'lucide-react';
import { useTransition } from 'react';

interface TournamentSettingsProps {
  tournament: Tournament;
  onUpdate: (data: Partial<TournamentCreationData>) => Promise<void> | void;
  isPrivilegedUser: boolean;
}

const formSchema = z.object({
  tournamentName: z.string().min(3, 'Tournament name must be at least 3 characters long.'),
  language: z.string(),
});

export default function TournamentSettings({ tournament, onUpdate, isPrivilegedUser }: TournamentSettingsProps) {
  const [isPending, startTransition] = useTransition();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tournamentName: tournament.tournamentName,
      language: tournament.language || 'en',
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    startTransition(async () => {
      await onUpdate(values);
    });
  }

  return (
    <div>
      <h2 className="text-3xl font-bold text-primary">General Settings</h2>
      <p className="text-muted-foreground">Update your tournament's general information. { !isPrivilegedUser && '(View only)'}</p>

      <Card className="mt-6 max-w-2xl">
        <CardHeader>
          <CardTitle>Tournament Details</CardTitle>
          <CardDescription>Changes will be saved and reflected across the tournament.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <fieldset disabled={!isPrivilegedUser} className="space-y-6">
                <FormField
                  control={form.control}
                  name="tournamentName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2"><FileSignature className="h-4 w-4" /> Tournament Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Summer Cup 2024" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="language"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2"><Languages className="h-4 w-4" /> Tournament Language</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a language" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="es">Español</SelectItem>
                          <SelectItem value="fr">Français</SelectItem>
                          <SelectItem value="de">Deutsch</SelectItem>
                          <SelectItem value="bn">বাংলা</SelectItem>
                          <SelectItem value="hi">हिन्दी</SelectItem>
                          <SelectItem value="ur">اردو</SelectItem>
                          <SelectItem value="ar">العربية</SelectItem>
                          <SelectItem value="pt">Português</SelectItem>
                          <SelectItem value="zh">中文</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {isPrivilegedUser && (
                  <div className="flex justify-end">
                    <Button type="submit" disabled={isPending}>
                      {isPending && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </Button>
                  </div>
                )}
              </fieldset>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
