'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { AuthForm } from '@/components/auth-form';
import { SubmitButton } from '@/components/submit-button';
import { createClient } from '@/lib/supabase/client';

export default function Page() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isLogin = searchParams.get('mode') !== 'register';
  
  const [email, setEmail] = useState('');
  const [isSuccessful, setIsSuccessful] = useState(false);
  const supabase = createClient();

  const handleSubmit = async (formData: FormData) => {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    setEmail(email);

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error('Invalid credentials!');
        return;
      }
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
        },
      });

      if (error) {
        if (error.message.includes('already exists')) {
          toast.error('Account already exists');
        } else {
          toast.error('Failed to create account');
        }
        return;
      }
      toast.success('Account created successfully');
    }

    setIsSuccessful(true);
    router.refresh();
    router.push('/');
  };

  return (
    <div className="flex min-h-dvh w-screen items-center justify-center bg-background">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-border shadow-sm">
        <div className="flex flex-col gap-8 p-8">
          <div className="flex flex-col items-center justify-center gap-2 text-center">
            <h3 className="text-2xl font-semibold tracking-tight dark:text-zinc-50">
              {isLogin ? 'Welcome back' : 'Create an account'}
            </h3>
            <p className="text-sm text-gray-500 dark:text-zinc-400">
              {isLogin
                ? 'Enter your email to sign in to your account'
                : 'Enter your email to create your account'}
            </p>
          </div>
          
          <AuthForm action={handleSubmit} defaultEmail={email}>
            <SubmitButton isSuccessful={isSuccessful}>
              {isLogin ? 'Sign in' : 'Sign up'}
            </SubmitButton>
            
            <p className="text-center text-sm text-gray-600 mt-4 dark:text-zinc-400">
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
              <Link
                href={isLogin ? '/auth?mode=register' : '/auth'}
                className="font-semibold text-gray-800 hover:underline dark:text-zinc-200"
              >
                {isLogin ? 'Sign up' : 'Sign in'}
              </Link>
            </p>
          </AuthForm>
        </div>
      </div>
    </div>
  );
} 