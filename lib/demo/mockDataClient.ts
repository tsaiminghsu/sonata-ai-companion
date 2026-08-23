'use client';

// Mocks the subset of the generated Amplify Data client (`dataClient` in
// lib/amplify/client.ts) that this app actually calls - see the method list
// in lib/amplify/client.ts's comment. Backed by lib/demo/store.ts
// (localStorage), scoped to the current demo session's userId (== email,
// see mockAuth.ts). Not a general AppSync emulator.

import { MockAIProvider } from '@/lib/providers/ai/MockAIProvider';
import type { CompanionContext } from '@/lib/providers/ai/types';
import { findGift, GIFT_RELATIONSHIP_XP } from '@/lib/gifts/giftCatalog';
import {
  deleteRow,
  getRow,
  getRowByKey,
  listByField,
  newId,
  nowIso,
  onTableUpdate,
  putRow,
  putRowByKey,
  type Row,
} from './store';
import { getDemoSessionUserId } from './mockAuth';

const XP_PER_MESSAGE = 5;
const XP_PER_LEVEL = 100;
const IMAGE_COST = 10;
const aiProvider = new MockAIProvider();

function toCompanionContext(companion: Row): CompanionContext {
  return {
    name: companion.name as string,
    gender: (companion.gender as string) ?? '',
    age: companion.age as number | undefined,
    personality: (companion.personality as string[]) ?? [],
    background: (companion.background as string) ?? '',
    speechStyle: companion.speechStyle as string | undefined,
    relationshipLevel: (companion.relationshipLevel as number) ?? 1,
    mood: companion.mood as string | undefined,
  };
}

function bumpCompanionXp(companion: Row, xpAmount: number): void {
  const newXp = ((companion.relationshipXp as number) ?? 0) + xpAmount;
  const newLevel = 1 + Math.floor(newXp / XP_PER_LEVEL);
  putRow('Companion', {
    id: companion.id,
    relationshipXp: newXp,
    relationshipLevel: newLevel,
    updatedAt: nowIso(),
  });
}

function requireUserId(): string {
  const userId = getDemoSessionUserId();
  if (!userId) throw new Error('UNAUTHORIZED');
  return userId;
}

function ok<T>(data: T) {
  return { data, errors: undefined as { message: string }[] | undefined };
}

function mockImageUrl(prompt: string): string {
  const text = encodeURIComponent(prompt.slice(0, 40) || 'Sonata Demo');
  return `https://placehold.co/512x512/1A0A19/FF1680.png?text=${text}`;
}

function subscription(table: string, matches: (row: Row) => boolean) {
  return {
    subscribe(handlers: { next: (row: Row) => void }) {
      const unsubscribe = onTableUpdate(table, (row) => {
        if (matches(row)) handlers.next(row);
      });
      return { unsubscribe };
    },
  };
}

// --- models ---

const Companion = {
  async get({ id }: { id: string }) {
    return ok(getRow('Companion', id) ?? null);
  },
  async create(fields: Row) {
    const now = nowIso();
    const row = {
      id: newId(),
      relationshipLevel: 1,
      relationshipXp: 0,
      createdAt: now,
      updatedAt: now,
      ...fields,
    };
    return ok(putRow('Companion', row));
  },
  async update({ id, ...fields }: Row & { id: string }) {
    return ok(putRow('Companion', { id, ...fields, updatedAt: nowIso() }));
  },
  async delete({ id }: { id: string }) {
    const row = getRow('Companion', id);
    deleteRow('Companion', id);
    return ok(row ?? null);
  },
  async companionsByUser(
    { userId }: { userId: string },
    opts?: { limit?: number; sortDirection?: 'ASC' | 'DESC' }
  ) {
    return ok(
      listByField('Companion', 'userId', userId, {
        sortField: 'createdAt',
        sortDirection: opts?.sortDirection,
        limit: opts?.limit,
      })
    );
  },
};

const CompanionMemory = {
  async create(fields: Row) {
    return ok(putRow('CompanionMemory', { id: newId(), createdAt: nowIso(), ...fields }));
  },
  async delete({ id }: { id: string }) {
    deleteRow('CompanionMemory', id);
    return ok(null);
  },
  async memoriesByCompanion({ companionId }: { companionId: string }) {
    return ok(listByField('CompanionMemory', 'companionId', companionId, { sortField: 'createdAt' }));
  },
};

const Conversation = {
  async conversationsByUser(
    { userId }: { userId: string },
    opts?: { sortDirection?: 'ASC' | 'DESC' }
  ) {
    return ok(
      listByField('Conversation', 'userId', userId, {
        sortField: 'lastMessageAt',
        sortDirection: opts?.sortDirection,
      })
    );
  },
};

const Message = {
  async messagesByConversation(
    { conversationId }: { conversationId: string },
    opts?: { sortDirection?: 'ASC' | 'DESC' }
  ) {
    return ok(
      listByField('Message', 'conversationId', conversationId, {
        sortField: 'createdAt',
        sortDirection: opts?.sortDirection,
      })
    );
  },
};

const Wallet = {
  async get({ userId }: { userId: string }) {
    return ok(getRowByKey('Wallet', { userId }) ?? null);
  },
  onUpdate({ filter }: { filter: { userId: { eq: string } } }) {
    return subscription('Wallet', (row) => row.userId === filter.userId.eq);
  },
};

const CheckIn = {
  async get({ userId, checkInDate }: { userId: string; checkInDate: string }) {
    return ok(getRowByKey('CheckIn', { userId, checkInDate }) ?? null);
  },
};

const Asset = {
  async get({ id }: { id: string }) {
    return ok(getRow('Asset', id) ?? null);
  },
  async delete({ id }: { id: string }) {
    deleteRow('Asset', id);
    return ok(null);
  },
  async assetsByUser({ userId }: { userId: string }, opts?: { sortDirection?: 'ASC' | 'DESC' }) {
    return ok(
      listByField('Asset', 'userId', userId, { sortField: 'createdAt', sortDirection: opts?.sortDirection })
    );
  },
};

const GenerationJob = {
  onUpdate({ filter }: { filter: { id: { eq: string } } }) {
    return subscription('GenerationJob', (row) => row.id === filter.id.eq);
  },
};

const DiamondTransaction = {
  async transactionsByUser(
    { userId }: { userId: string },
    opts?: { sortDirection?: 'ASC' | 'DESC'; limit?: number }
  ) {
    return ok(
      listByField('DiamondTransaction', 'userId', userId, {
        sortField: 'createdAt',
        sortDirection: opts?.sortDirection,
        limit: opts?.limit,
      })
    );
  },
};

// --- mutations ---

async function ensureConversation({ companionId }: { companionId: string }) {
  const userId = requireUserId();
  const companion = getRow('Companion', companionId);
  if (!companion || companion.userId !== userId) throw new Error('FORBIDDEN');

  const existing = getRow('Conversation', companionId);
  if (existing) return ok(existing);

  const now = nowIso();
  return ok(
    putRow('Conversation', {
      id: companionId,
      userId,
      companionId,
      createdAt: now,
      lastMessageAt: now,
      lastMessagePreview: '',
    })
  );
}

async function sendMessage({ conversationId, content }: { conversationId: string; content: string }) {
  const userId = requireUserId();
  const conversation = getRow('Conversation', conversationId);
  if (!conversation || conversation.userId !== userId) throw new Error('FORBIDDEN');
  const companion = getRow('Companion', conversation.companionId as string);
  if (!companion) throw new Error('NOT_FOUND');

  const now = nowIso();
  putRow('Message', {
    id: newId(),
    conversationId,
    userId,
    role: 'user',
    content,
    createdAt: now,
  });

  // A real round trip (AppSync -> Lambda -> DB) has real latency; without
  // it, the "AI is typing" state is set and cleared inside one microtask
  // tick, invisible to both a human eye and a UI test. Simulate it.
  await new Promise((resolve) => setTimeout(resolve, 600));

  const aiOutput = await aiProvider.generateChatResponse({
    companion: toCompanionContext(companion),
    systemPrompt: '',
    recentMessages: [],
    userMessage: content,
  });

  const assistantMessage = putRow('Message', {
    id: newId(),
    conversationId,
    userId,
    role: 'assistant',
    content: aiOutput.content,
    createdAt: nowIso(),
  });

  putRow('Conversation', {
    id: conversationId,
    lastMessageAt: assistantMessage.createdAt,
    lastMessagePreview: String(aiOutput.content).slice(0, 80),
  });

  bumpCompanionXp(companion, XP_PER_MESSAGE);

  return ok({ message: assistantMessage, suggestedReplies: aiOutput.suggestedReplies ?? [] });
}

async function sendGift({ conversationId, giftId }: { conversationId: string; giftId: string }) {
  const userId = requireUserId();
  const gift = findGift(giftId);
  if (!gift) throw new Error('GIFT_NOT_FOUND');

  const conversation = getRow('Conversation', conversationId);
  if (!conversation || conversation.userId !== userId) throw new Error('FORBIDDEN');
  const companion = getRow('Companion', conversation.companionId as string);
  if (!companion) throw new Error('NOT_FOUND');

  const wallet = getRowByKey('Wallet', { userId });
  const today = nowIso().slice(0, 10);
  const spentToday = wallet?.dailySpentDate === today ? ((wallet?.dailySpentAmount as number) ?? 0) : 0;
  const dailyLimit = wallet?.dailySpendLimit as number | undefined;
  if (dailyLimit != null && spentToday + gift.diamondCost > dailyLimit) {
    throw new Error('SPEND_LIMIT_EXCEEDED');
  }
  const balance = (wallet?.diamondBalance as number) ?? 0;
  if (balance < gift.diamondCost) throw new Error('INSUFFICIENT_DIAMOND');

  const now = nowIso();
  const balanceAfter = balance - gift.diamondCost;
  putRowByKey(
    'Wallet',
    { userId },
    { diamondBalance: balanceAfter, dailySpentAmount: spentToday + gift.diamondCost, dailySpentDate: today, updatedAt: now }
  );
  putRow('DiamondTransaction', {
    id: `gift#${conversationId}#${newId()}`,
    userId,
    amount: -gift.diamondCost,
    type: 'GIFT_SEND',
    relatedEntityId: giftId,
    balanceAfter,
    createdAt: now,
  });

  const narrationMessage = putRow('Message', {
    id: newId(),
    conversationId,
    userId,
    role: 'narration',
    content: `你送出了 ${gift.emoji} ${gift.name}`,
    createdAt: nowIso(),
  });

  const aiOutput = await aiProvider.generateChatResponse({
    companion: toCompanionContext(companion),
    systemPrompt: '',
    recentMessages: [],
    userMessage: `[使用者送出了禮物：${gift.name} ${gift.emoji}]`,
  });

  const reactionMessage = putRow('Message', {
    id: newId(),
    conversationId,
    userId,
    role: 'assistant',
    content: aiOutput.content,
    createdAt: nowIso(),
  });

  putRow('Conversation', {
    id: conversationId,
    lastMessageAt: reactionMessage.createdAt,
    lastMessagePreview: `${gift.emoji} ${String(aiOutput.content).slice(0, 80)}`,
  });

  bumpCompanionXp(companion, GIFT_RELATIONSHIP_XP);

  return ok({ narrationMessage, reactionMessage, suggestedReplies: aiOutput.suggestedReplies ?? [] });
}

async function setSpendLimit({ dailySpendLimit }: { dailySpendLimit?: number | null }) {
  const userId = requireUserId();
  return ok(putRowByKey('Wallet', { userId }, { dailySpendLimit: dailySpendLimit ?? null, updatedAt: nowIso() }));
}

async function checkIn() {
  const userId = requireUserId();
  const today = nowIso().slice(0, 10);
  if (getRowByKey('CheckIn', { userId, checkInDate: today })) {
    throw new Error('ALREADY_CHECKED_IN');
  }

  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const prevStreak = (getRowByKey('CheckIn', { userId, checkInDate: yesterday })?.streakCount as number) ?? 0;
  const streakCount = prevStreak + 1;

  const now = nowIso();
  const checkInRow = putRow(
    'CheckIn',
    { userId, checkInDate: today, diamondAwarded: 20, streakCount, createdAt: now },
    'checkInDate'
  );

  const wallet = getRowByKey('Wallet', { userId });
  const balanceAfter = ((wallet?.diamondBalance as number) ?? 0) + 20;
  putRowByKey('Wallet', { userId }, { diamondBalance: balanceAfter, updatedAt: now });
  putRow('DiamondTransaction', {
    id: `checkin#${userId}#${today}`,
    userId,
    amount: 20,
    type: 'DAILY_CHECKIN',
    relatedEntityId: today,
    balanceAfter,
    createdAt: now,
  });

  return ok(checkInRow);
}

async function createImageGenerationJob({
  companionId,
  prompt,
}: {
  companionId?: string | null;
  prompt: string;
  parameters?: unknown;
}) {
  const userId = requireUserId();
  const wallet = getRowByKey('Wallet', { userId });
  const balance = (wallet?.diamondBalance as number) ?? 0;
  if (balance < IMAGE_COST) throw new Error('INSUFFICIENT_DIAMOND');

  const now = nowIso();
  const jobId = newId();
  const transactionId = `genjob#${jobId}#spend`;
  const balanceAfter = balance - IMAGE_COST;
  putRowByKey('Wallet', { userId }, { diamondBalance: balanceAfter, updatedAt: now });
  putRow('DiamondTransaction', {
    id: transactionId,
    userId,
    amount: -IMAGE_COST,
    type: 'GENERATION_SPEND',
    relatedEntityId: jobId,
    balanceAfter,
    createdAt: now,
  });

  const job = putRow('GenerationJob', {
    id: jobId,
    userId,
    companionId: companionId ?? undefined,
    type: 'IMAGE',
    status: 'QUEUED',
    provider: 'mock-demo',
    prompt,
    diamondCost: IMAGE_COST,
    transactionId,
    createdAt: now,
    updatedAt: now,
  });

  // Mirrors MockGenerationProvider's real two-phase lifecycle so the UI
  // exercises the same QUEUED -> PROCESSING -> COMPLETED states.
  setTimeout(() => {
    putRow('GenerationJob', { id: jobId, status: 'PROCESSING', updatedAt: nowIso() });
  }, 1200);

  setTimeout(() => {
    const assetId = newId();
    putRow('Asset', {
      id: assetId,
      userId,
      companionId: companionId ?? undefined,
      type: 'IMAGE',
      s3Key: mockImageUrl(prompt),
      generationJobId: jobId,
      prompt,
      createdAt: nowIso(),
    });
    putRow('GenerationJob', {
      id: jobId,
      status: 'COMPLETED',
      resultAssetId: assetId,
      updatedAt: nowIso(),
    });
  }, 3500);

  return ok(job);
}

// --- queries ---

async function createUploadUrl({ companionId }: { companionId: string; contentType: string }) {
  // Not used by the demo-mode branch in companions/new/page.tsx (which reads
  // the file directly instead), kept for interface completeness.
  return ok({ url: '', key: `demo/${companionId}/${newId()}` });
}

async function createDownloadUrl({ key }: { key: string }) {
  // In demo mode "keys" (Companion.avatarUrl, Asset.s3Key) are already
  // resolvable URLs (data: URLs or placehold.co links) - pass through.
  return ok({ url: key, key });
}

export const mockDataClient = {
  models: { Companion, CompanionMemory, Conversation, Message, Wallet, CheckIn, Asset, GenerationJob, DiamondTransaction },
  mutations: { ensureConversation, sendMessage, sendGift, checkIn, setSpendLimit, createImageGenerationJob },
  queries: { createUploadUrl, createDownloadUrl },
};
