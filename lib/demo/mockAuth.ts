'use client';

import { getRowByKey, nowIso, putRow, putRowByKey } from './store';
import { DEMO_SESSION_COOKIE_NAME as SESSION_COOKIE } from './sessionCookie';

const SIGNUP_GRANT = 100;

// Demo mode has no real Cognito `sub`, and the session cookie can't reach
// localStorage server-side - so the email itself doubles as `userId`
// throughout the demo store. Good enough for a local click-through; a real
// backend still uses a proper Cognito sub everywhere.

function setSessionCookie(email: string): void {
  document.cookie = `${SESSION_COOKIE}=${encodeURIComponent(email)}; path=/; max-age=${60 * 60 * 24 * 7}`;
}

function clearSessionCookie(): void {
  document.cookie = `${SESSION_COOKIE}=; path=/; max-age=0`;
}

function readSessionCookie(): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|; )${SESSION_COOKIE}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

function ensureUser(email: string): void {
  if (getRowByKey('UserProfile', { userId: email })) return;

  const now = nowIso();
  putRow('UserProfile', { id: email, userId: email, email, createdAt: now, updatedAt: now });
  putRowByKey('Wallet', { userId: email }, { diamondBalance: SIGNUP_GRANT, updatedAt: now });
  putRow(
    'DiamondTransaction',
    {
      id: `signup#${email}`,
      userId: email,
      amount: SIGNUP_GRANT,
      type: 'SIGNUP_GRANT',
      balanceAfter: SIGNUP_GRANT,
      createdAt: now,
    },
    'id'
  );
}

/** Demo signIn accepts any email/password - there's no real backend to
 * reject against, so this is a "test account" generator, not real auth. */
export async function mockSignIn({ username }: { username: string }): Promise<void> {
  ensureUser(username);
  setSessionCookie(username);
}

export async function mockSignUp({
  username,
}: {
  username: string;
}): Promise<{ nextStep: { signUpStep: 'DONE' } }> {
  ensureUser(username);
  return { nextStep: { signUpStep: 'DONE' } };
}

export async function mockSignOut(): Promise<void> {
  clearSessionCookie();
}

export async function mockGetCurrentUser(): Promise<{ userId: string }> {
  const userId = readSessionCookie();
  if (!userId) throw new Error('UNAUTHENTICATED');
  return { userId };
}

/** Used internally by mockDataClient.ts, which runs outside any auth call
 * and needs to know "who's asking" the same way the real backend derives it
 * from the Cognito identity on every resolver invocation. */
export function getDemoSessionUserId(): string | undefined {
  return readSessionCookie();
}
