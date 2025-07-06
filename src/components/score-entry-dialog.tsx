"use client";

import { useState } from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import type { Match, Score } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Lock, Unlock } from 'lucide-react';

interface ScoreEntryDialogProps {
  match: Match;
  currentScore: Score;
  onScoreSave: (newScore: Score) => void;
  children: React.ReactNode;
}

const formSchema = z.object({
  score1: z.coerce.number().min(0, "Score must be positive.").nullable(),
  score2: z.coerce.number().min(0, "Score must be positive.").nullable(),
  locked: z.boolean(),
});

export default function ScoreEntryDialog({ match, currentScore, onScoreSave, children }: ScoreEntryDialogProps) {
  const [isOpen, setIsOpen] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      score1: currentScore?.score1 ?? null,
      score2: currentScore?.score2 ?? null,
      locked: currentScore?.locked ?? false,
    },
  });
  
  const handleOpenChange = (open: boolean) => {
    if (open) {
        form.reset({
            score1: currentScore?.score1 ?? null,
            score2: currentScore?.score2 ?? null,
            locked: currentScore?.locked ?? false,
        });
    }
    setIsOpen(open);
  }

  function onSubmit(values: z.infer<typeof formSchema>) {
    if (values.score1 !== null && values.score2 !== null) {
       onScoreSave({
           score1: values.score1,
           score2: values.score2,
           locked: values.locked,
       });
    } else {
         onScoreSave({
           score1: null,
           score2: null,
           locked: false,
       });
    }
    setIsOpen(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Enter Score for Match</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold w-2/5 text-right">{match.team1.name}</span>
              <div className="flex items-center gap-2 mx-4">
                <FormField
                    control={form.control}
                    name="score1"
                    render={({ field }) => (
                    <FormItem>
                        <FormControl>
                        <Input
                            type="number"
                            className="w-20 text-center text-lg"
                            placeholder="-"
                            min="0"
                            {...field}
                            value={field.value ?? ''}
                            disabled={form.watch('locked')}
                            onChange={e => field.onChange(e.target.value === '' ? null : e.target.value)}
                         />
                        </FormControl>
                    </FormItem>
                    )}
                />
                <span className="text-lg">vs</span>
                <FormField
                    control={form.control}
                    name="score2"
                    render={({ field }) => (
                    <FormItem>
                        <FormControl>
                            <Input
                                type="number"
                                className="w-20 text-center text-lg"
                                placeholder="-"
                                min="0"
                                {...field}
                                value={field.value ?? ''}
                                disabled={form.watch('locked')}
                                onChange={e => field.onChange(e.target.value === '' ? null : e.target.value)}
                            />
                        </FormControl>
                    </FormItem>
                    )}
                />
              </div>
              <span className="text-lg font-semibold w-2/5 text-left">{match.team2.name}</span>
            </div>
             <FormField
                control={form.control}
                name="locked"
                render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-center space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                        <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            aria-readonly
                        />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                        <FormLabel className="flex items-center gap-2">
                           {field.value ? <Lock className="h-4 w-4"/> : <Unlock className="h-4 w-4"/>}
                           {field.value ? 'Result Locked' : 'Lock Result'}
                        </FormLabel>
                    </div>
                </FormItem>
                )}
            />
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="secondary">Cancel</Button>
              </DialogClose>
              <Button type="submit">Save Score</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
