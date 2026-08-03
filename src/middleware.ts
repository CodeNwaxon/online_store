import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PRODUCTION_DOMAIN = 'nomo-stores.com';

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';

  // Redirect old Vercel domain to the new production domain
  // Preserves the full path and query string (including ?ref= referral codes)
  if (
    hostname.includes('nomo-store.vercel.app') &&
    !hostname.includes(PRODUCTION_DOMAIN)
  ) {
    const url = request.nextUrl.clone();
    url.protocol = 'https';
    url.host = PRODUCTION_DOMAIN;
    url.port = '';
    return NextResponse.redirect(url, 301);
  }

  return NextResponse.next();
}

export const config = {
  // Run on all routes except static files and Next.js internals
  matcher: ['/((?!_next/static|_next/image|favicon.ico|images/).*)'],
};
