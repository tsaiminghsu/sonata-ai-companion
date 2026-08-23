'use client';

import { Suspense, useState, FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { signIn } from '@/lib/amplify/auth';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { DEMO_MODE } from '@/lib/demo/config';

const DEMO_EMAIL = 'demo@sonata.test';
const DEMO_PASSWORD = 'demo-password';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function doSignIn(username: string, pw: string) {
    setStatus('submitting');
    setError(null);
    try {
      await signIn({ username, password: pw });
      const redirectTo = searchParams.get('redirectTo') ?? '/';
      router.push(redirectTo);
      router.refresh();
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : '登入失敗，請稍後再試');
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await doSignIn(email, password);
  }

  return (
    <GlassCard>
      <h1 className="mb-6 text-xl font-semibold">登入</h1>

      {DEMO_MODE && (
        <div className="mb-6 flex flex-col gap-2 rounded-lg bg-violet/10 p-3 text-center">
          <p className="text-xs text-violet">Demo Mode：本地模擬帳號，不會建立真實使用者</p>
          <Button
            type="button"
            variant="secondary"
            disabled={status === 'submitting'}
            onClick={() => doSignIn(DEMO_EMAIL, DEMO_PASSWORD)}
          >
            使用測試帳號登入
          </Button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-sm text-muted">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="neon-ring glass-panel rounded-lg px-3 py-2.5 text-sm outline-none"
            placeholder="you@example.com"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className="text-sm text-muted">
            密碼
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="neon-ring glass-panel rounded-lg px-3 py-2.5 text-sm outline-none"
          />
        </div>
        {error && <p className="text-sm text-magenta">{error}</p>}
        <Button type="submit" data-testid="login-submit" disabled={status === 'submitting'}>
          {status === 'submitting' ? '登入中...' : '登入'}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        還沒有帳號？{' '}
        <Link href="/register" className="text-magenta hover:underline">
          建立帳號
        </Link>
      </p>
    </GlassCard>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
