// Shared between the client-side mock auth (lib/demo/mockAuth.ts) and the
// server-side session check (lib/amplify/authServer.ts, proxy.ts). No
// 'use client' directive here on purpose - this needs to be importable from
// server-only code (middleware) without pulling a client-boundary module in.
export const DEMO_SESSION_COOKIE_NAME = 'sonata-demo-session';
