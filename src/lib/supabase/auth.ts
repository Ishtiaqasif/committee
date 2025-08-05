import { supabase } from './config';

export const signInWithGoogle = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
  });
  if (error) {
    console.error('Error signing in with Google: ', error);
    return null;
  }
  return data;
};

export const signUpWithEmailPassword = async (email, password, displayName) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName,
      },
    },
  });
  if (error) {
    console.error('Error signing up: ', error);
    throw error;
  }
  return data;
};

export const signInWithEmailPassword = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) {
    console.error('Error signing in: ', error);
    throw error;
  }
  return data;
};

export const signOutUser = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('Error signing out: ', error);
  }
};
