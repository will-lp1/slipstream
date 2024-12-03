import { createClient } from '@supabase/supabase-js';

export function createApiClient(request: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false // Don't persist session in API routes
      }
    }
  );

  return { supabase };
} 