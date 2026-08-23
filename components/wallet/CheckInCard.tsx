'use client';

import { useEffect, useState } from 'react';
import { getCurrentUser } from '@/lib/amplify/auth';
import { dataClient } from '@/lib/amplify/client';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';

function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

type Status = 'loading' | 'available' | 'checking-in' | 'done' | 'error';

export function CheckInCard() {
  const [status, setStatus] = useState<Status>('loading');
  const [streak, setStreak] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const { userId } = await getCurrentUser();
      const today = todayString();
      const existing = await dataClient.models.CheckIn.get({ userId, checkInDate: today });
      setStatus(existing.data ? 'done' : 'available');
    })();
  }, []);

  async function handleCheckIn() {
    setStatus('checking-in');
    try {
      const result = await dataClient.mutations.checkIn();
      if (result.errors?.length) {
        throw new Error(result.errors[0].message);
      }
      setStreak(result.data?.streakCount ?? null);
      setStatus('done');
    } catch {
      setStatus('error');
    }
  }

  return (
    <GlassCard className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
      <div>
        <p className="font-medium">
          {status === 'done' ? '今日簽到已完成' : '今日的相遇獎勵已準備好'}
        </p>
        <p className="text-sm text-muted">
          {status === 'done'
            ? '明天再回來領取鑽石吧'
            : `連續簽到 ${streak ?? 0} 天・鑽石由伺服器安全記帳`}
        </p>
        {status === 'error' && <p className="mt-1 text-sm text-magenta">簽到失敗，請稍後再試</p>}
      </div>
      <Button
        data-testid="check-in-button"
        onClick={handleCheckIn}
        disabled={status !== 'available'}
      >
        {status === 'loading'
          ? '讀取中...'
          : status === 'checking-in'
            ? '簽到中...'
            : status === 'done'
              ? '今日已完成'
              : '前往簽到'}
      </Button>
    </GlassCard>
  );
}
