'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getCurrentUser } from '@/lib/amplify/auth';
import type { Schema } from '@/amplify/data/resource';
import { dataClient } from '@/lib/amplify/client';
import { ButtonLink } from '@/components/ui/ButtonLink';

type Conversation = Schema['Conversation']['type'];
type Companion = Schema['Companion']['type'];

function ConversationRow({ conversation }: { conversation: Conversation }) {
  const [companion, setCompanion] = useState<Companion | null>(null);

  useEffect(() => {
    dataClient.models.Companion.get({ id: conversation.companionId }).then((r) => {
      setCompanion(r.data ?? null);
    });
  }, [conversation.companionId]);

  return (
    <Link
      href={`/chat/${conversation.companionId}`}
      className="glass-card flex items-center gap-3 p-4 transition hover:border-magenta/40"
    >
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-surface-raised to-violet/30">
        {companion?.avatarUrl && <Image src={companion.avatarUrl} alt="" fill className="object-cover" unoptimized />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-medium">{companion?.name ?? '...'}</p>
        <p className="truncate text-sm text-muted">{conversation.lastMessagePreview || '開始你們的第一次對話'}</p>
      </div>
    </Link>
  );
}

export default function ChatListPage() {
  const [conversations, setConversations] = useState<Conversation[] | null>(null);

  useEffect(() => {
    (async () => {
      const { userId } = await getCurrentUser();
      const result = await dataClient.models.Conversation.conversationsByUser(
        { userId },
        { sortDirection: 'DESC' }
      );
      setConversations(result.data);
    })();
  }, []);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-6 md:p-10">
      <h1 className="text-xl font-semibold">聊天</h1>

      {conversations === null ? (
        <p className="text-sm text-muted">讀取中...</p>
      ) : conversations.length === 0 ? (
        <div className="glass-card flex flex-col items-center gap-4 p-10 text-center">
          <p className="text-muted">還沒有對話，先建立一位伴侶開始聊天吧</p>
          <ButtonLink href="/companions/new">建立伴侶</ButtonLink>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {conversations.map((c) => (
            <ConversationRow key={c.id} conversation={c} />
          ))}
        </div>
      )}
    </div>
  );
}
