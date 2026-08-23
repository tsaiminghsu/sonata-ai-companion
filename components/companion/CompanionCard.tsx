'use client';

import Link from 'next/link';
import Image from 'next/image';
import type { Schema } from '@/amplify/data/resource';
import { ButtonLink } from '@/components/ui/ButtonLink';

type Companion = Schema['Companion']['type'];

export function CompanionCard({ companion }: { companion: Companion }) {
  return (
    <div className="glass-card flex flex-col overflow-hidden" data-testid="companion-card">
      <div className="relative aspect-[4/5] w-full bg-gradient-to-br from-surface-raised to-violet/30">
        {companion.avatarUrl ? (
          <Image src={companion.avatarUrl} alt={companion.name} fill className="object-cover" unoptimized />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl font-bold text-white/20">
            {companion.name.slice(0, 1)}
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-center justify-between">
          <Link href={`/companions/${companion.id}`} className="font-medium hover:text-magenta">
            {companion.name}
          </Link>
          <span className="text-xs text-muted">Lv.{companion.relationshipLevel ?? 1}</span>
        </div>
        {(companion.personality ?? []).filter((p): p is string => Boolean(p)).length > 0 && (
          <p className="text-xs text-muted">
            {(companion.personality ?? []).filter((p): p is string => Boolean(p)).join('・')}
          </p>
        )}
        <ButtonLink data-testid="start-chat" variant="secondary" className="mt-auto w-full" href={`/chat/${companion.id}`}>
          開始聊天
        </ButtonLink>
      </div>
    </div>
  );
}
