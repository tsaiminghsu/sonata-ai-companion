/**
 * DEMO MODE — temporary, opt-in local-only bypass of the real AWS backend.
 *
 * Turned on by NEXT_PUBLIC_DEMO_MODE=true in .env.local. With it unset
 * (the default), every file that branches on DEMO_MODE falls through to the
 * real Amplify/Cognito/AppSync code path untouched - so removing demo mode
 * entirely is just deleting .env.local (or this whole lib/demo/ directory
 * plus the small branches in lib/amplify/client.ts, lib/amplify/auth.ts,
 * lib/amplify/authServer.ts, proxy.ts, and companions/new/page.tsx).
 *
 * It exists ONLY to let the UI be clicked through without a deployed AWS
 * backend. Data lives in localStorage, never leaves the browser, and is not
 * a substitute for testing against the real backend.
 */
export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
