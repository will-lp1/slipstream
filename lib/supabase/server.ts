import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export function createServerClient() {
  try {
    const cookieStore = cookies();
    return createServerComponentClient({
      cookies: () => cookieStore,
    });
  } catch (error) {
    console.error('Failed to create server client:', error);
    throw error;
  }
}