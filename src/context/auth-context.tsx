"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/lib/supabase/config';
import { Loader } from 'lucide-react';

// A custom user type to provide compatibility with the rest of the app
// which expects properties like `uid`, `displayName`, and `photoURL`.
interface User {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      const supabaseUser = session?.user;
      if (supabaseUser) {
        const userProfile: User = {
            uid: supabaseUser.id,
            displayName: supabaseUser.user_metadata.display_name || supabaseUser.user_metadata.full_name || supabaseUser.user_metadata.name || 'No name',
            email: supabaseUser.email || null,
            photoURL: supabaseUser.user_metadata.avatar_url || supabaseUser.user_metadata.picture || null,
        };
        setUser(userProfile);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <Loader className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);