"use client";

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { Tournament, UserProfile } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader, UserPlus, UserMinus, KeyRound, Shield, Crown } from 'lucide-react';
import { getUserProfiles } from '@/lib/firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';


interface UserManagementProps {
  tournament: Tournament;
  onUpdate: (data: Partial<Tournament>) => void;
}

const formSchema = z.object({
  adminUid: z.string().min(1, 'Admin UID is required.'),
});

export default function UserManagement({ tournament, onUpdate }: UserManagementProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [userProfiles, setUserProfiles] = useState<Record<string, UserProfile>>({});
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchProfiles = async () => {
      setIsLoadingProfiles(true);
      const uidsToFetch = [tournament.creatorId, ...(tournament.admins || [])].filter(Boolean);
      if (uidsToFetch.length > 0) {
        try {
          const profiles = await getUserProfiles(uidsToFetch);
          setUserProfiles(profiles);
        } catch (error) {
          console.error("Failed to fetch user profiles:", error);
          toast({ variant: 'destructive', title: 'Error', description: 'Could not load user details.' });
        }
      }
      setIsLoadingProfiles(false);
    };
    fetchProfiles();
  }, [tournament.creatorId, tournament.admins, toast]);


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
  
  const ownerProfile = userProfiles[tournament.creatorId];
  const adminProfiles = (tournament.admins || []).map(id => userProfiles[id]).filter(Boolean);

  if (isLoadingProfiles) {
    return (
        <div>
            <h2 className="text-3xl font-bold text-primary">User Management</h2>
            <p className="text-muted-foreground">Add or remove tournament administrators.</p>
            <div className="mt-6 flex justify-center items-center h-64">
                <Loader className="h-8 w-8 animate-spin" />
            </div>
        </div>
    );
  }

  return (
    <div>
      <h2 className="text-3xl font-bold text-primary">User Management</h2>
      <p className="text-muted-foreground">Add or remove tournament administrators.</p>
      
      <div className="mt-6 grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Crown className="text-accent"/> Owner</CardTitle>
            <CardDescription>The primary owner of the tournament.</CardDescription>
          </CardHeader>
          <CardContent>
            {ownerProfile ? (
              <div className="flex items-center gap-3 rounded-md border p-3">
                  <Avatar>
                      <AvatarImage src={ownerProfile.photoURL ?? ''} alt={ownerProfile.displayName ?? ''} />
                      <AvatarFallback>{ownerProfile.displayName?.charAt(0) ?? 'U'}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 overflow-hidden">
                      <p className="font-medium truncate">{ownerProfile.displayName}</p>
                      <p className="text-xs text-muted-foreground truncate">{ownerProfile.email}</p>
                  </div>
              </div>
            ) : (
                <div className="flex items-center gap-3 rounded-md border p-3">
                    <KeyRound className="h-5 w-5 text-muted-foreground" />
                    <p className="font-mono text-xs">{tournament.creatorId}</p>
                </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Shield className="text-primary"/> Admins</CardTitle>
            <CardDescription>Users with administrative privileges.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {adminProfiles.length > 0 ? (
              adminProfiles.map(admin => (
                <div key={admin.uid} className="flex items-center justify-between gap-3 rounded-md border p-3">
                    <div className="flex items-center gap-3 overflow-hidden">
                         <Avatar>
                            <AvatarImage src={admin.photoURL ?? ''} alt={admin.displayName ?? ''} />
                            <AvatarFallback>{admin.displayName?.charAt(0) ?? 'U'}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 overflow-hidden">
                            <p className="font-medium truncate">{admin.displayName}</p>
                            <p className="text-xs text-muted-foreground truncate">{admin.email}</p>
                        </div>
                    </div>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 flex-shrink-0"
                        onClick={() => handleRemoveAdmin(admin.uid)}
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
                <CardDescription>Enter the User ID of the user you want to grant admin privileges to. They can find their ID on their profile page.</CardDescription>
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
