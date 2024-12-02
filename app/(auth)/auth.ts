import { createServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export type AuthSession = {
  user: {
    id: string;
    email?: string;
  } | null;
} | null;

export async function getSession(): Promise<AuthSession> {
  const supabase = await createServerClient();
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error || !session?.user) {
    return null;
  }
  
  return {
    user: {
      id: session.user.id,
      email: session.user.email,
    }
  };
}

export const auth = getSession; 