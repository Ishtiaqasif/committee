"use client";

import { useState, useEffect } from 'react';
import { UserProfile } from '@/types';
import { searchUsers, getUserByEmail } from '@/lib/firebase/firestore';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { Check, ChevronsUpDown, Loader } from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';

interface UserSearchComboboxProps {
  value: string; // The email of the selected user
  onChange: (email: string) => void;
  disabled?: boolean;
}

export function UserSearchCombobox({ value, onChange, disabled }: UserSearchComboboxProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const debouncedSearch = useDebounce(searchQuery, 300);

  useEffect(() => {
    // When the external value changes, fetch the corresponding user profile
    if (value && (!selectedUser || value !== selectedUser.email)) {
      setIsLoading(true);
      getUserByEmail(value).then(user => {
        if (user) {
            setSelectedUser(user);
            setSearchQuery(user.displayName || '');
        }
        setIsLoading(false);
      });
    } else if (!value) {
      setSelectedUser(null);
      setSearchQuery('');
    }
  }, [value, selectedUser]);
  
  useEffect(() => {
    if (debouncedSearch.length > 2) {
      setIsLoading(true);
      searchUsers(debouncedSearch).then(results => {
        setUsers(results);
        setIsLoading(false);
      });
    } else {
      setUsers([]);
    }
  }, [debouncedSearch]);


  const handleSelect = (user: UserProfile) => {
    onChange(user.email ?? '');
    setSelectedUser(user);
    setSearchQuery(user.displayName ?? '');
    setOpen(false);
  };

  const displayValue = selectedUser ? selectedUser.displayName : 'Select a user...';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
          disabled={disabled}
        >
          <span className="truncate">{selectedUser ? selectedUser.displayName : 'Select a user...'}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command
            filter={(value, search) => {
                // We do filtering on the backend, so we just need to always show results
                return 1;
            }}
        >
          <CommandInput 
            placeholder="Search by name or email..." 
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            {isLoading && <div className="p-2 flex justify-center"><Loader className="animate-spin h-4 w-4"/></div>}
            <CommandEmpty>No user found.</CommandEmpty>
            <CommandGroup>
              {users.map((user) => (
                <CommandItem
                  key={user.uid}
                  value={user.email ?? user.uid}
                  onSelect={() => handleSelect(user)}
                >
                    <div className="flex items-center gap-2 w-full">
                        <Avatar className="h-6 w-6">
                            <AvatarImage src={user.photoURL ?? ''} />
                            <AvatarFallback>{user.displayName?.charAt(0) ?? 'U'}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 truncate">
                            <p className="truncate">{user.displayName}</p>
                            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                        </div>
                        <Check
                            className={cn(
                            "ml-auto h-4 w-4",
                            value === user.email ? "opacity-100" : "opacity-0"
                            )}
                        />
                    </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
