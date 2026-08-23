import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticatedInMiddleware } from '@/lib/amplify/authServer';

const PUBLIC_PATHS = ['/login', '/register'];

export async function proxy(request: NextRequest) {
  const response = NextResponse.next();

  const isPublicPath = PUBLIC_PATHS.some((path) => request.nextUrl.pathname.startsWith(path));

  const authenticated = await isAuthenticatedInMiddleware(request, response);

  if (!authenticated && !isPublicPath) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirectTo', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (authenticated && isPublicPath) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - api routes
     * - _next/static, _next/image
     * - static files (favicon, images)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
