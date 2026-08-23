'use client';

import { useEffect, useState } from 'react';
import { getCurrentUser } from '@/lib/amplify/auth';
import type { Schema } from '@/amplify/data/resource';
import { dataClient } from '@/lib/amplify/client';
import { ButtonLink } from '@/components/ui/ButtonLink';
import { CompanionCard } from '@/components/companion/CompanionCard';

type Companion = Schema['Companion']['type'];

export default function CompanionsPage() {
  const [companions, setCompanions] = useState<Companion[] | null>(null);

  useEffect(() => {
    (async () => {
      const { userId } = await getCurrentUser();
      const result = await dataClient.models.Companion.companionsByUser(
        { userId },
        { sortDirection: 'DESC' }
      );
      setCompanions(result.data);
    })();
  }, []);

  return (
    <div className="flex flex-col gap-6 p-6 md:p-10">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">我的伴侶</h1>
        <ButtonLink data-testid="create-companion" href="/companions/new">
          建立伴侶 +
        </ButtonLink>
      </div>

      {companions === null ? (
        <p className="text-sm text-muted">讀取中...</p>
      ) : companions.length === 0 ? (
        <div className="glass-card flex flex-col items-center gap-4 p-10 text-center">
          <p className="text-muted">還沒有 AI 伴侶</p>
          <ButtonLink href="/companions/new">建立第一位伴侶</ButtonLink>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {companions.map((companion) => (
            <CompanionCard key={companion.id} companion={companion} />
          ))}
        </div>
      )}
    </div>
  );
}
