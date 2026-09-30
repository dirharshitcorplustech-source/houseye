/**
 * HOUSEYE.COM — Middleware
 * Cookie must exist AND JWT must verify for protected routes.
 * Full authorization (role/scope/subscription) still in API/services.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SESSION_COOKIE_NAME, verifyToken } from '@/lib/auth/session';

const PUBLIC_PATHS = [
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/accept-invite',
  '/pricing',
  '/features',
  '/faq',
  '/terms',
  '/privacy',
];

const AUTH_PATHS = ['/login', '/register'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  const isPublicExact = PUBLIC_PATHS.includes(pathname);
  const isPublicPrefix =
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/health') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon');

  const isProtectedPage =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/tenant');

  // Cron job routes use x-cron-secret — session optional
  const isCronApi = pathname.startsWith('/api/admin/jobs');

  if (isPublicExact || isPublicPrefix || isCronApi) {
    if (token && AUTH_PATHS.includes(pathname)) {
      const session = await verifyToken(token);
      if (session) {
        const dest =
          session.role === 'SUPER_ADMIN'
            ? '/admin'
            : session.role === 'TENANT'
              ? '/tenant'
              : '/dashboard';
        return NextResponse.redirect(new URL(dest, request.url));
      }
    }
    return NextResponse.next();
  }

  if (isProtectedPage) {
    if (!token) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('next', pathname);
      return NextResponse.redirect(loginUrl);
    }

    const session = await verifyToken(token);
    if (!session) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('next', pathname);
      const res = NextResponse.redirect(loginUrl);
      res.cookies.set(SESSION_COOKIE_NAME, '', {
        httpOnly: true,
        path: '/',
        maxAge: 0,
      });
      return res;
    }

    if (pathname.startsWith('/admin') && session.role !== 'SUPER_ADMIN') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    if (pathname.startsWith('/tenant') && session.role !== 'TENANT') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    if (
      pathname.startsWith('/dashboard') &&
      (session.role === 'TENANT' || session.role === 'SUPER_ADMIN')
    ) {
      const dest = session.role === 'TENANT' ? '/tenant' : '/admin';
      return NextResponse.redirect(new URL(dest, request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
