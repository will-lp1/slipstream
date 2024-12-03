import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function getUser() {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)
  const { data: { session }, error } = await supabase.auth.getSession()
  
  if (error || !session) {
    return null
  }

  return session
}

export async function signOut() {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)
  await supabase.auth.signOut()
}