'use client';

import { GIFT_CATALOG } from '@/lib/gifts/giftCatalog';

export function GiftPicker({
  open,
  sending,
  onClose,
  onSend,
}: {
  open: boolean;
  sending: boolean;
  onClose: () => void;
  onSend: (giftId: string) => void;
}) {
  if (!open) return null;

  return (
    <div className="border-t border-[var(--color-border)] p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium">送 ta 禮物</span>
        <button onClick={onClose} className="text-xs text-muted hover:text-[var(--color-text)]">
          關閉
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {GIFT_CATALOG.map((gift) => (
          <button
            key={gift.id}
            data-testid="gift-item"
            disabled={sending}
            onClick={() => onSend(gift.id)}
            className="neon-ring glass-panel flex flex-col items-center gap-1 rounded-xl px-2 py-3 text-center transition hover:border-magenta/50 disabled:opacity-50"
          >
            <span className="text-2xl">{gift.emoji}</span>
            <span className="text-xs">{gift.name}</span>
            <span className="flex items-center gap-0.5 text-[11px] text-magenta">
              ◆ {gift.diamondCost}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
