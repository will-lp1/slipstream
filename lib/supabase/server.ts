import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export const createServerClient = () => {
  return createServerComponentClient({ cookies });
};

// Also export a direct server client if needed
export const supabaseServer = createServerComponentClient({ cookies });