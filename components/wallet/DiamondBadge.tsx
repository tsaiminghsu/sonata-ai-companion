'use client';

import { useEffect, useState } from 'react';
import { getCurrentUser } from '@/lib/amplify/auth';
import { dataClient } from '@/lib/amplify/client';

export function DiamondBadge() {
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    (async () => {
      const { userId } = await getCurrentUser();
      const wallet = await dataClient.models.Wallet.get({ userId });
      setBalance(wallet.data?.diamondBalance ?? 0);

      const sub = dataClient.models.Wallet.onUpdate({ filter: { userId: { eq: userId } } }).subscribe({
        next: (updated) => setBalance(updated.diamondBalance ?? 0),
      });
      unsubscribe = () => sub.unsubscribe();
    })();

    return () => unsubscribe?.();
  }, []);

  return (
    <div
      data-testid="diamond-balance"
      className="flex items-center gap-2 rounded-full glass-panel px-3 py-2 text-sm"
    >
      <span aria-hidden className="text-magenta">
        ◆
      </span>
      <span className="font-medium">{balance ?? '—'}</span>
    </div>
  );
}
