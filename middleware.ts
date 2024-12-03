import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req: request, res });
  
  // Get session and set user context for RLS
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) {
    await supabase.auth.setSession(session);
  }
  
  return res;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.ico$).*)',
    '/chat/:path*'
  ]
};