'use client';

import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';

export function AuthForm({
  action,
  children,
  defaultEmail = '',
}: {
  action: (formData: FormData) => void;
  children: React.ReactNode;
  defaultEmail?: string;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClient();

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
          const formData = new FormData(e.currentTarget);
          await action(formData);
        } catch (error) {
          toast.error('An error occurred');
        } finally {
          setIsLoading(false);
        }
      }}
      className="flex flex-col gap-4 px-4 sm:px-16"
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email Address</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="you@example.com"
          defaultValue={defaultEmail}
          required
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
        />
      </div>
      {children}
    </form>
  );
}
