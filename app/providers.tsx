'use client';

import { useEffect } from 'react';
import { Amplify } from 'aws-amplify';
import { fetchAuthSession } from 'aws-amplify/auth';
import outputs from '@/amplify_outputs.json';

Amplify.configure(outputs, { ssr: true });

declare global {
  interface Window {
    __sonataTestIdToken?: () => Promise<string | undefined>;
  }
}

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    Amplify.configure(outputs, { ssr: true });

    // Test-only hook so Playwright can authenticate raw HTTP requests (e.g.
    // the webhook idempotency test) without guessing at Amplify's internal
    // cookie/token storage format. Never included in a production build.
    if (process.env.NODE_ENV !== 'production') {
      window.__sonataTestIdToken = async () => {
        const session = await fetchAuthSession();
        return session.tokens?.idToken?.toString();
      };
    }
  }, []);

  return <>{children}</>;
}
