import { createServerClient } from '@/lib/supabase/server';
import { User } from '@supabase/auth-helpers-nextjs';

export type AuthUser = {
  id: string;
  email?: string;
  user: User;
} | null;

// Centralized auth client
export async function getAuthClient() {
  return createServerClient();
}

// Core auth functions
export async function getUser(): Promise<AuthUser> {
  try {
    const supabase = await getAuthClient();
    // First try to get session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Session error:', sessionError);
      return null;
    }

    if (!session?.user) {
      // If no session, try to get user directly
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        return null;
      }
      return {
        id: user.id,
        email: user.email,
        user
      };
    }
    
    return {
      id: session.user.id,
      email: session.user.email,
      user: session.user
    };
  } catch (error) {
    console.error('Auth error:', error);
    return null;
  }
}

export async function signIn(email: string, password: string) {
  const supabase = await getAuthClient();
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signUp(email: string, password: string) {
  const supabase = await getAuthClient();
  return supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  });
}

export async function signOut() {
  const supabase = await getAuthClient();
  return supabase.auth.signOut();
}

// Helper to check if user is authenticated
export async function requireAuth() {
  const user = await getUser();
  if (!user) {
    throw new Error('Authentication required');
  }
  return user;
}

export const auth = getUser; 