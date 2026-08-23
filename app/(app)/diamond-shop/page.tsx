'use client';

import { useEffect, useState } from 'react';
import { getCurrentUser } from '@/lib/amplify/auth';
import type { Schema } from '@/amplify/data/resource';
import { dataClient } from '@/lib/amplify/client';
import { GlassCard } from '@/components/ui/GlassCard';
import { SoonBadge } from '@/components/ui/SoonBadge';
import { DiamondBadge } from '@/components/wallet/DiamondBadge';
import { SpendLimitCard } from '@/components/wallet/SpendLimitCard';

type Transaction = Schema['DiamondTransaction']['type'];

const PACKS = [500, 2200, 6000, 13500];

const TYPE_LABEL: Record<string, string> = {
  SIGNUP_GRANT: '註冊獎勵',
  DAILY_CHECKIN: '每日簽到',
  GENERATION_SPEND: 'AI 生成',
  GENERATION_REFUND: '生成失敗退款',
  GIFT_SEND: '贈送禮物',
};

export default function DiamondShopPage() {
  const [transactions, setTransactions] = useState<Transaction[] | null>(null);

  useEffect(() => {
    (async () => {
      const { userId } = await getCurrentUser();
      const result = await dataClient.models.DiamondTransaction.transactionsByUser(
        { userId },
        { sortDirection: 'DESC', limit: 20 }
      );
      setTransactions(result.data);
    })();
  }, []);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-6 md:p-10">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">鑽石商城</h1>
        <DiamondBadge />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {PACKS.map((amount) => (
          <GlassCard key={amount} className="flex flex-col items-center gap-2 p-4 text-center opacity-60">
            <span aria-hidden className="text-magenta">
              ◆
            </span>
            <span className="font-medium">{amount}</span>
            <SoonBadge />
          </GlassCard>
        ))}
      </div>

      <SpendLimitCard />

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">交易紀錄</h2>
        {transactions === null ? (
          <p className="text-sm text-muted">讀取中...</p>
        ) : transactions.length === 0 ? (
          <p className="text-sm text-muted">還沒有交易紀錄。</p>
        ) : (
          <div className="flex flex-col gap-2">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="glass-panel flex items-center justify-between rounded-lg px-4 py-2.5 text-sm"
              >
                <span>{TYPE_LABEL[tx.type ?? ''] ?? tx.type}</span>
                <span className={tx.amount >= 0 ? 'text-magenta' : 'text-muted'}>
                  {tx.amount >= 0 ? '+' : ''}
                  {tx.amount}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
