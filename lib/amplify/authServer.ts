// Server-side auth wrapper for proxy.ts (middleware) and Server Components.
// Demo mode reads a plain cookie directly - it can't reach the
// localStorage-backed mock store from the server, so the cookie carries
// everything needed (see lib/demo/mockAuth.ts: userId === email in demo).

import type { NextRequest, NextResponse } from 'next/server';
import { cookies as nextCookies } from 'next/headers';
import { fetchAuthSession, fetchUserAttributes } from 'aws-amplify/auth/server';
import { runWithAmplifyServerContext } from './serverUtils';
import { DEMO_MODE } from '@/lib/demo/config';
import { DEMO_SESSION_COOKIE_NAME } from '@/lib/demo/sessionCookie';

export async function isAuthenticatedInMiddleware(
  request: NextRequest,
  response: NextResponse
): Promise<boolean> {
  if (DEMO_MODE) {
    return Boolean(request.cookies.get(DEMO_SESSION_COOKIE_NAME)?.value);
  }
  return runWithAmplifyServerContext({
    nextServerContext: { request, response },
    operation: async (contextSpec) => {
      try {
        const session = await fetchAuthSession(contextSpec);
        return session.tokens !== undefined;
      } catch {
        return false;
      }
    },
  });
}

export async function getServerUserEmail(): Promise<string> {
  if (DEMO_MODE) {
    const store = await nextCookies();
    return store.get(DEMO_SESSION_COOKIE_NAME)?.value ?? '';
  }
  try {
    const attributes = await runWithAmplifyServerContext({
      nextServerContext: { cookies: nextCookies },
      operation: (contextSpec) => fetchUserAttributes(contextSpec),
    });
    return attributes.email ?? '';
  } catch {
    return '';
  }
}
