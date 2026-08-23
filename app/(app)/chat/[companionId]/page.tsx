'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import type { Schema } from '@/amplify/data/resource';
import { dataClient } from '@/lib/amplify/client';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { SuggestedReplyChips } from '@/components/chat/SuggestedReplyChips';
import { ChatInputBar } from '@/components/chat/ChatInputBar';
import { GiftPicker } from '@/components/chat/GiftPicker';
import { Button } from '@/components/ui/Button';

type Companion = Schema['Companion']['type'];
type Message = Schema['Message']['type'];

const DEFAULT_SUGGESTIONS = ['你今天過得怎麼樣？', '多跟我說說吧。', '很高興能和你聊天。'];

const GIFT_ERROR_MESSAGES: Record<string, string> = {
  INSUFFICIENT_DIAMOND: '鑽石不足，無法送出這個禮物。',
  SPEND_LIMIT_EXCEEDED: '已達到你自己設定的每日消費上限。',
};

export default function ChatPage() {
  const params = useParams<{ companionId: string }>();
  const companionId = params.companionId;

  const [companion, setCompanion] = useState<Companion | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>(DEFAULT_SUGGESTIONS);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<{ text: string } | null>(null);
  const [ready, setReady] = useState(false);
  const [giftPickerOpen, setGiftPickerOpen] = useState(false);
  const [sendingGift, setSendingGift] = useState(false);
  const [giftError, setGiftError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const [companionResult] = await Promise.all([
        dataClient.models.Companion.get({ id: companionId }),
        dataClient.mutations.ensureConversation({ companionId }),
      ]);
      setCompanion(companionResult.data ?? null);

      const history = await dataClient.models.Message.messagesByConversation(
        { conversationId: companionId },
        { sortDirection: 'ASC' }
      );
      setMessages(history.data);
      setReady(true);
    })();
  }, [companionId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending, sendingGift]);

  async function sendMessage(text: string) {
    const optimistic: Message = {
      id: `temp-${Date.now()}`,
      conversationId: companionId,
      userId: '',
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    } as Message;
    setMessages((prev) => [...prev, optimistic]);
    setSending(true);
    setError(null);
    setSuggestions([]);

    try {
      const result = await dataClient.mutations.sendMessage({ conversationId: companionId, content: text });
      if (result.errors?.length || !result.data) {
        throw new Error(result.errors?.[0]?.message ?? '暫時無法回覆');
      }
      setMessages((prev) => [...prev, result.data!.message as Message]);
      setSuggestions((result.data.suggestedReplies ?? []).filter((s): s is string => Boolean(s)));
    } catch {
      setError({ text });
    } finally {
      setSending(false);
    }
  }

  function handleRetry() {
    if (!error) return;
    const text = error.text;
    setError(null);
    sendMessage(text);
  }

  async function handleSendGift(giftId: string) {
    setSendingGift(true);
    setGiftError(null);
    try {
      const result = await dataClient.mutations.sendGift({ conversationId: companionId, giftId });
      if (result.errors?.length || !result.data) {
        throw new Error(result.errors?.[0]?.message ?? '送出禮物失敗，請稍後再試');
      }
      setMessages((prev) => [
        ...prev,
        result.data!.narrationMessage as Message,
        result.data!.reactionMessage as Message,
      ]);
      setSuggestions((result.data.suggestedReplies ?? []).filter((s): s is string => Boolean(s)));
      setGiftPickerOpen(false);
    } catch (err) {
      // Real backend: business-logic errors arrive via GraphQL `result.errors`,
      // translated above and re-thrown. Demo mode: the mock rejects directly
      // with the raw error code. Translate uniformly here so both paths show
      // the same friendly message regardless of which one fired.
      const rawMessage = err instanceof Error ? err.message : '';
      const matchedCode = Object.keys(GIFT_ERROR_MESSAGES).find((code) => rawMessage.includes(code));
      setGiftError(matchedCode ? GIFT_ERROR_MESSAGES[matchedCode] : '送出禮物失敗，請稍後再試');
    } finally {
      setSendingGift(false);
    }
  }

  return (
    <div className="flex h-screen flex-col md:h-[calc(100vh)]">
      <header className="flex items-center gap-3 border-b border-[var(--color-border)] p-4">
        <div className="relative h-9 w-9 overflow-hidden rounded-full bg-gradient-to-br from-surface-raised to-violet/30">
          {companion?.avatarUrl && <Image src={companion.avatarUrl} alt="" fill className="object-cover" unoptimized />}
        </div>
        <span className="font-medium">{companion?.name ?? '...'}</span>
      </header>

      <div className="flex-1 overflow-y-auto p-4">
        {!ready ? (
          <p className="text-center text-sm text-muted">讀取中...</p>
        ) : (
          <div className="flex flex-col gap-3">
            {messages.length === 0 && (
              <p className="text-center text-sm text-muted">開始你們的第一次對話</p>
            )}
            {messages.map((m) => (
              <MessageBubble key={m.id} role={m.role ?? 'assistant'} content={m.content} />
            ))}
            {(sending || sendingGift) && (
              <div data-testid="chat-loading" className="text-xs text-muted">
                {companion?.name} 正在輸入...
              </div>
            )}
            {error && (
              <div className="flex items-center gap-3 text-sm text-magenta">
                <span>暫時無法回覆</span>
                <Button variant="secondary" onClick={handleRetry}>
                  重新嘗試
                </Button>
              </div>
            )}
            {giftError && <p className="text-sm text-magenta">{giftError}</p>}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <SuggestedReplyChips suggestions={suggestions} onSelect={sendMessage} disabled={sending} />
      <GiftPicker
        open={giftPickerOpen}
        sending={sendingGift}
        onClose={() => setGiftPickerOpen(false)}
        onSend={handleSendGift}
      />
      <ChatInputBar
        disabled={sending}
        onSend={sendMessage}
        onGiftClick={() => setGiftPickerOpen((v) => !v)}
      />
    </div>
  );
}
