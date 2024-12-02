import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ 
    req: request, 
    res,
  });

  // Refresh session if expired
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error) {
    console.error('Middleware auth error:', error);
  }

  const { pathname } = request.nextUrl;

  // Skip middleware for these paths
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.includes('/auth/callback') ||
    pathname === '/auth'
  ) {
    return res;
  }

  // Redirect authenticated users away from auth pages
  if (session && pathname.startsWith('/auth')) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Protect main app routes
  if (!session && !pathname.startsWith('/auth/')) {
    return NextResponse.redirect(new URL('/auth', request.url));
  }

  return res;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public|api).*)',
    '/auth/:path*'
  ],
};