'use client';

import { useEffect, useState } from 'react';
import { getCurrentUser } from '@/lib/amplify/auth';
import type { Schema } from '@/amplify/data/resource';
import { dataClient } from '@/lib/amplify/client';
import { ButtonLink } from '@/components/ui/ButtonLink';
import { CheckInCard } from '@/components/wallet/CheckInCard';
import { CompanionCard } from '@/components/companion/CompanionCard';

type Companion = Schema['Companion']['type'];

export default function HomePage() {
  const [companions, setCompanions] = useState<Companion[] | null>(null);

  useEffect(() => {
    (async () => {
      const { userId } = await getCurrentUser();
      const result = await dataClient.models.Companion.companionsByUser(
        { userId },
        { limit: 4, sortDirection: 'DESC' }
      );
      setCompanions(result.data);
    })();
  }, []);

  return (
    <div className="flex flex-col gap-8 p-6 md:p-10">
      <section className="glass-card relative overflow-hidden p-10">
        <p className="mb-2 text-xs uppercase tracking-widest text-magenta">
          Sonata · Companion World
        </p>
        <h1 className="mb-4 max-w-lg text-3xl font-bold leading-tight md:text-4xl">
          創造第一位 AI 伴侶
        </h1>
        <p className="mb-6 max-w-md text-sm text-muted">
          設定性格、外觀與故事，讓每一次對話都從屬於你們的記憶開始。
        </p>
        <ButtonLink data-testid="create-companion" href="/companions/new">
          建立伴侶 +
        </ButtonLink>
      </section>

      <CheckInCard />

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">我的伴侶</h2>
          {companions && companions.length > 0 && (
            <ButtonLink href="/companions" variant="ghost">
              查看全部 →
            </ButtonLink>
          )}
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
      </section>
    </div>
  );
}
