import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/chat';

  if (code) {
    const supabase = createRouteHandlerClient({ cookies });
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (error) {
      console.error('Auth error:', error);
      return NextResponse.redirect(`${origin}/auth?error=auth-code-error`);
    }

    return NextResponse.redirect(`${origin}${next}`);
  }

  return NextResponse.redirect(`${origin}/auth?error=auth-code-error`);
}
