import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const createClient = (cookieStore: ReturnType<typeof cookies>) => {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async get(name: string) {
          return (await cookieStore).get(name)?.value
        },
        async set(name: string, value: string, options: CookieOptions) {
          try {
            (await cookieStore).set({ name, value, ...options })
          } catch (error) {
            // Handle cookie error
          }
        },
        async remove(name: string, options: CookieOptions) {
          try {
            (await cookieStore).set({ name, value: '', ...options })
          } catch (error) {
            // Handle cookie error
          }
        },
      },
    }
  )
}

// Also export the direct server client if needed
export const supabaseServer = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    cookies: {
      async get(name: string) {
        return (await cookies()).get(name)?.value
      },
      async set(name: string, value: string, options: CookieOptions) {
        try {
          (await cookies()).set({ name, value, ...options })
        } catch (error) {
          // Handle cookie error
        }
      },
      async remove(name: string, options: CookieOptions) {
        try {
          (await cookies()).set({ name, value: '', ...options })
        } catch (error) {
          // Handle cookie error
        }
      },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)