import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/types/supabase'

export const createClient = (cookieStore: ReturnType<typeof cookies>) => {
  return createServerClient<Database>(
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
export const supabaseServer = createServerClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    cookies: {
      async get(name: string) {
        const cookieStore = await cookies()
        const cookie = cookieStore.get(name)
        return cookie?.value
      },
      async set(name: string, value: string, options: CookieOptions) {
        try {
          const cookieStore = await cookies()
          cookieStore.set({ name, value, ...options })
        } catch (error) {
          // Handle cookie error
        }
      },
      async remove(name: string, options: CookieOptions) {
        try {
          const cookieStore = await cookies()
          cookieStore.set({ name, value: '', ...options })
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