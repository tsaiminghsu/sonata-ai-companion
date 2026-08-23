// Framework-agnostic: no `next`/`react` imports - imported by relative path
// from amplify/functions/chat-handler/handler.ts as well as the frontend.

export interface Gift {
  id: string;
  name: string;
  emoji: string;
  diamondCost: number;
}

// "禮物目錄先5-8種" - a small fixed catalog for MVP, not a DB-backed CMS yet.
export const GIFT_CATALOG: Gift[] = [
  { id: 'rose', name: '玫瑰', emoji: '🌹', diamondCost: 10 },
  { id: 'coffee', name: '咖啡', emoji: '☕', diamondCost: 15 },
  { id: 'chocolate', name: '巧克力', emoji: '🍫', diamondCost: 20 },
  { id: 'teddy-bear', name: '泰迪熊', emoji: '🧸', diamondCost: 40 },
  { id: 'necklace', name: '項鍊', emoji: '📿', diamondCost: 80 },
  { id: 'ring', name: '戒指', emoji: '💍', diamondCost: 150 },
];

export const GIFT_RELATIONSHIP_XP = 20;

export function findGift(giftId: string): Gift | undefined {
  return GIFT_CATALOG.find((g) => g.id === giftId);
}
