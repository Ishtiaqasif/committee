"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { Tournament } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader, UserPlus, UserMinus, KeyRound, Shield, Crown } from 'lucide-react';

interface UserManagementProps {
  tournament: Tournament;
  onUpdate: (data: Partial<Tournament>) => void;
}

const formSchema = z.object({
  adminUid: z.string().min(1, 'Admin UID is required.'),
});

export default function UserManagement({ tournament, onUpdate }: UserManagementProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      adminUid: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsUpdating(true);
    const currentAdmins = tournament.admins || [];
    if (currentAdmins.includes(values.adminUid) || tournament.creatorId === values.adminUid) {
      toast({ variant: 'destructive', title: 'Error', description: 'User is already an owner or admin.' });
      setIsUpdating(false);
      return;
    }
    const newAdmins = [...currentAdmins, values.adminUid];
    try {
      await onUpdate({ admins: newAdmins });
      form.reset();
      toast({ title: 'Success', description: 'New admin added.' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to add admin.' });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRemoveAdmin = async (adminId: string) => {
    setIsUpdating(true);
    const newAdmins = (tournament.admins || []).filter(id => id !== adminId);
     try {
      await onUpdate({ admins: newAdmins });
      toast({ title: 'Success', description: 'Admin removed.' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to remove admin.' });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div>
      <h2 className="text-3xl font-bold text-primary">User Management</h2>
      <p className="text-muted-foreground">Add or remove tournament administrators.</p>
      
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Crown className="text-accent"/> Owner</CardTitle>
            <CardDescription>The primary owner of the tournament.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 rounded-md border p-3">
                <KeyRound className="h-5 w-5 text-muted-foreground" />
                <p className="font-mono text-xs">{tournament.creatorId}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Shield className="text-primary"/> Admins</CardTitle>
            <CardDescription>Users with administrative privileges.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {(tournament.admins && tournament.admins.length > 0) ? (
              tournament.admins.map(adminId => (
                <div key={adminId} className="flex items-center justify-between gap-3 rounded-md border p-3">
                    <div className="flex items-center gap-2 overflow-hidden">
                        <KeyRound className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                        <p className="font-mono text-xs truncate">{adminId}</p>
                    </div>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 flex-shrink-0"
                        onClick={() => handleRemoveAdmin(adminId)}
                        disabled={isUpdating}
                    >
                        <UserMinus className="h-4 w-4 text-destructive" />
                    </Button>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No admins yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

       <Card className="mt-6">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><UserPlus /> Add New Admin</CardTitle>
                <CardDescription>Enter the User ID of the user you want to grant admin privileges to.</CardDescription>
            </CardHeader>
            <CardContent>
                 <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="flex items-start gap-4">
                        <FormField
                            control={form.control}
                            name="adminUid"
                            render={({ field }) => (
                                <FormItem className="flex-grow">
                                    <FormLabel>User ID</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Enter user's unique ID" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="submit" disabled={isUpdating} className="mt-8">
                            {isUpdating && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                            Add Admin
                        </Button>
                    </form>
                 </Form>
            </CardContent>
        </Card>
    </div>
  );
}
