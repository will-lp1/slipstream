'use server';

import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export async function login(formData: FormData) {
  const supabase = await createServerClient();
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  });

  if (error) {
    return { error: error.message };
  }

  if (!data.session) {
    return { error: 'No session created' };
  }

  redirect('/chat');
}

export async function register(formData: FormData) {
  const supabase = await createServerClient();
  
  const { data, error } = await supabase.auth.signUp({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (data.session) {
    redirect('/chat');
  }

  return { message: 'Check your email for the confirmation link' };
}
