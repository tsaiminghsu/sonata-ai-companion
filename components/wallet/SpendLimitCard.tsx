'use client';

import { useEffect, useState } from 'react';
import { getCurrentUser } from '@/lib/amplify/auth';
import { dataClient } from '@/lib/amplify/client';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';

export function SpendLimitCard() {
  const [limit, setLimit] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const { userId } = await getCurrentUser();
      const wallet = await dataClient.models.Wallet.get({ userId });
      if (wallet.data?.dailySpendLimit != null) {
        setLimit(String(wallet.data.dailySpendLimit));
      }
    })();
  }, []);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      await dataClient.mutations.setSpendLimit({
        dailySpendLimit: limit.trim() ? Number(limit) : null,
      });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <GlassCard className="flex flex-col gap-3">
      <div>
        <p className="font-medium">每日消費上限自設</p>
        <p className="text-sm text-muted">保護自己，設定每天最多花費的鑽石數量（例如送禮物）。留空代表不限制。</p>
      </div>
      <div className="flex gap-2">
        <input
          type="number"
          min={0}
          value={limit}
          onChange={(e) => {
            setLimit(e.target.value);
            setSaved(false);
          }}
          placeholder="不限制"
          className="neon-ring glass-panel w-32 rounded-lg px-3 py-2 text-sm outline-none"
        />
        <Button variant="secondary" onClick={handleSave} disabled={saving}>
          {saving ? '儲存中...' : saved ? '已儲存' : '儲存'}
        </Button>
      </div>
    </GlassCard>
  );
}
