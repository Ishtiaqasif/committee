"use client";

import { useState } from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import type { Match, Score } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Lock, Unlock } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface ScoreEntryDialogProps {
  match: Match;
  currentScore: Score;
  onScoreSave: (newScore: Score) => void;
  children: React.ReactNode;
  readOnly: boolean;
}

const formSchema = z.object({
  score1: z.coerce.number().min(0, "Score must be positive.").nullable(),
  score2: z.coerce.number().min(0, "Score must be positive.").nullable(),
  score1_tiebreak: z.coerce.number().min(0, "Score must be positive.").optional().nullable(),
  score2_tiebreak: z.coerce.number().min(0, "Score must be positive.").optional().nullable(),
  locked: z.boolean(),
}).refine(data => {
    // If scores are a draw, tie-breaker scores must not be equal unless they are null/undefined
    if (data.score1 !== null && data.score1 === data.score2) {
        if (data.score1_tiebreak != null && data.score1_tiebreak === data.score2_tiebreak) {
            return false;
        }
    }
    return true;
}, {
    message: "Tie-breaker scores cannot be a draw.",
    path: ["score1_tiebreak"],
});

export default function ScoreEntryDialog({ match, currentScore, onScoreSave, children, readOnly }: ScoreEntryDialogProps) {
  const [isOpen, setIsOpen] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      score1: currentScore?.score1 ?? null,
      score2: currentScore?.score2 ?? null,
      score1_tiebreak: currentScore?.score1_tiebreak ?? null,
      score2_tiebreak: currentScore?.score2_tiebreak ?? null,
      locked: currentScore?.locked ?? false,
    },
  });
  
  const score1 = form.watch('score1');
  const score2 = form.watch('score2');
  const showTiebreaker = score1 !== null && score2 !== null && score1 === score2;

  const handleOpenChange = (open: boolean) => {
    if (open) {
        form.reset({
            score1: currentScore?.score1 ?? null,
            score2: currentScore?.score2 ?? null,
            score1_tiebreak: currentScore?.score1_tiebreak ?? null,
            score2_tiebreak: currentScore?.score2_tiebreak ?? null,
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
           score1_tiebreak: values.score1_tiebreak,
           score2_tiebreak: values.score2_tiebreak,
           locked: values.locked,
       });
    } else {
         onScoreSave({
           score1: null,
           score2: null,
           score1_tiebreak: null,
           score2_tiebreak: null,
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
             <fieldset disabled={readOnly} className="space-y-6">
                <div>
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
                     <FormMessage>{form.formState.errors.score1?.message || form.formState.errors.score2?.message}</FormMessage>
                </div>

                {showTiebreaker && (
                    <div className="space-y-4">
                        <Separator />
                        <div className="text-center">
                            <Label>Tie-Breaker Score (e.g. Penalties)</Label>
                            <FormMessage>{form.formState.errors.score1_tiebreak?.message}</FormMessage>
                        </div>
                        <div className="flex items-center justify-center gap-2 mx-4">
                            <FormField
                                control={form.control}
                                name="score1_tiebreak"
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
                            <span>-</span>
                            <FormField
                                control={form.control}
                                name="score2_tiebreak"
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
                    </div>
                )}
                
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
            </fieldset>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="secondary">Cancel</Button>
              </DialogClose>
              {!readOnly && <Button type="submit">Save Score</Button>}
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
