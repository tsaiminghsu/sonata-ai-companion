'use client';

import { FormEvent, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { SoonBadge } from '@/components/ui/SoonBadge';

export function ChatInputBar({
  disabled,
  onSend,
  onGiftClick,
}: {
  disabled?: boolean;
  onSend: (text: string) => void;
  onGiftClick?: () => void;
}) {
  const [value, setValue] = useState('');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue('');
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-[var(--color-border)] p-3">
      <button
        type="button"
        data-testid="gift-button"
        onClick={onGiftClick}
        disabled={disabled}
        title="送禮物"
        className="flex items-center rounded-full px-2 py-2 text-muted transition hover:text-magenta disabled:opacity-50"
      >
        🎁
      </button>
      <button
        type="button"
        disabled
        aria-disabled="true"
        title="圖片訊息即將推出"
        className="flex items-center gap-1 rounded-full px-2 py-2 text-muted opacity-50"
      >
        🖼️ <SoonBadge />
      </button>
      <button
        type="button"
        disabled
        aria-disabled="true"
        title="語音訊息即將推出"
        className="flex items-center gap-1 rounded-full px-2 py-2 text-muted opacity-50"
      >
        🎤 <SoonBadge />
      </button>
      <input
        data-testid="chat-input"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={disabled}
        placeholder="描述你的反應..."
        className="neon-ring glass-panel flex-1 rounded-full px-4 py-2.5 text-sm outline-none disabled:opacity-60"
      />
      <Button data-testid="chat-send" type="submit" disabled={disabled || !value.trim()} className="!px-4">
        送出
      </Button>
    </form>
  );
}
