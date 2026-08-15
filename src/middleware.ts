import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  
  // Redirect from old domain to new domain
  if (hostname === 'nomo-stores.com' || hostname === 'www.nomo-stores.com') {
    const url = request.nextUrl.clone();
    url.host = 'nomostores.com';
    return NextResponse.redirect(url, 301); // 301 Permanent Redirect
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
