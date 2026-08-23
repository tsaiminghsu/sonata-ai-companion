'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signUp, confirmSignUp, signIn } from '@/lib/amplify/auth';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';

type Step = 'register' | 'confirm';

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('register');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function handleRegister(e: FormEvent) {
    e.preventDefault();
    setStatus('submitting');
    setError(null);
    try {
      const result = await signUp({
        username: email,
        password,
        options: { userAttributes: { email } },
      });
      if (result.nextStep.signUpStep === 'CONFIRM_SIGN_UP') {
        setStep('confirm');
        setStatus('idle');
      } else {
        await signIn({ username: email, password });
        router.push('/');
        router.refresh();
      }
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : '註冊失敗，請稍後再試');
    }
  }

  async function handleConfirm(e: FormEvent) {
    e.preventDefault();
    setStatus('submitting');
    setError(null);
    try {
      await confirmSignUp({ username: email, confirmationCode: code });
      await signIn({ username: email, password });
      router.push('/');
      router.refresh();
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : '驗證失敗，請確認驗證碼是否正確');
    }
  }

  if (step === 'confirm') {
    return (
      <GlassCard>
        <h1 className="mb-2 text-xl font-semibold">驗證你的 Email</h1>
        <p className="mb-6 text-sm text-muted">我們已寄送驗證碼到 {email}</p>
        <form onSubmit={handleConfirm} className="flex flex-col gap-4">
          <input
            type="text"
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="驗證碼"
            className="neon-ring glass-panel rounded-lg px-3 py-2.5 text-sm outline-none"
          />
          {error && <p className="text-sm text-magenta">{error}</p>}
          <Button type="submit" disabled={status === 'submitting'}>
            {status === 'submitting' ? '驗證中...' : '確認'}
          </Button>
        </form>
      </GlassCard>
    );
  }

  return (
    <GlassCard>
      <h1 className="mb-6 text-xl font-semibold">建立帳號</h1>
      <form onSubmit={handleRegister} className="flex flex-col gap-4">
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
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="neon-ring glass-panel rounded-lg px-3 py-2.5 text-sm outline-none"
          />
        </div>
        {error && <p className="text-sm text-magenta">{error}</p>}
        <Button type="submit" disabled={status === 'submitting'}>
          {status === 'submitting' ? '建立中...' : '建立帳號'}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        已經有帳號？{' '}
        <Link href="/login" className="text-magenta hover:underline">
          登入
        </Link>
      </p>
    </GlassCard>
  );
}
