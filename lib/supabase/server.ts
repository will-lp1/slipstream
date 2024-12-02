import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function createServerClient() {
  const cookieStore = cookies();
  const supabase = createServerComponentClient({
    cookies: () => cookieStore,
  });
  
  // Pre-fetch the session to ensure cookies are handled properly
  await supabase.auth.getSession();
  
  return supabase;
}