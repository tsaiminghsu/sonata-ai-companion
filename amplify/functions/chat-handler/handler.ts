import { randomUUID } from 'node:crypto';
import type { AppSyncResolverHandler, AppSyncIdentityCognito } from 'aws-lambda';
import { GetCommand, PutCommand, QueryCommand, TransactWriteCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { TransactionCanceledException } from '@aws-sdk/client-dynamodb';
import { ddb, tableName, nowIso } from '../shared/dynamo';
import { getAIProvider } from '../../../lib/providers/ai';
import type { ChatMessage, CompanionContext } from '../../../lib/providers/ai/types';
import { buildSystemPrompt } from '../../../lib/promptBuilder';
import { XP_PER_MESSAGE, computeLevel } from '../../../lib/relationship/xp';
import { findGift, GIFT_RELATIONSHIP_XP } from '../../../lib/gifts/giftCatalog';

type EnsureConversationArgs = { companionId: string };
type SendMessageArgs = { conversationId: string; content: string };
type SendGiftArgs = { conversationId: string; giftId: string };

/**
 * Backs three custom mutations (dispatched on event.info.fieldName):
 * - ensureConversation: find-or-create the 1:1 Companion<->Conversation
 * - sendMessage: persist user message, call AIProvider, persist reply, bump XP
 * - sendGift: atomic diamond spend (with self-set daily-limit check) + narration + AI reaction, bigger XP bump
 */
export const handler: AppSyncResolverHandler<
  EnsureConversationArgs | SendMessageArgs | SendGiftArgs,
  unknown
> = async (event) => {
  const identity = event.identity as AppSyncIdentityCognito | null;
  const userId = identity?.sub;
  if (!userId) {
    throw new Error('UNAUTHORIZED');
  }

  switch (event.info.fieldName) {
    case 'ensureConversation':
      return ensureConversation(userId, event.arguments as EnsureConversationArgs);
    case 'sendMessage':
      return sendMessage(userId, event.arguments as SendMessageArgs);
    case 'sendGift':
      return sendGift(userId, event.arguments as SendGiftArgs);
    default:
      throw new Error(`Unknown operation: ${event.info.fieldName}`);
  }
};

async function ensureConversation(userId: string, { companionId }: EnsureConversationArgs) {
  const companion = await getOwnedCompanion(userId, companionId);
  const conversationId = companion.id; // deterministic 1:1 mapping

  const existing = await ddb.send(
    new GetCommand({ TableName: tableName('Conversation'), Key: { id: conversationId } })
  );
  if (existing.Item) {
    return existing.Item;
  }

  const now = nowIso();
  const item = {
    id: conversationId,
    userId,
    companionId,
    createdAt: now,
    lastMessageAt: now,
    lastMessagePreview: '',
  };

  try {
    await ddb.send(
      new PutCommand({
        TableName: tableName('Conversation'),
        Item: item,
        ConditionExpression: 'attribute_not_exists(id)',
      })
    );
    return item;
  } catch (err) {
    // Lost a create race - the winner's row is now there, return it instead.
    const retry = await ddb.send(
      new GetCommand({ TableName: tableName('Conversation'), Key: { id: conversationId } })
    );
    if (retry.Item) return retry.Item;
    throw err;
  }
}

async function sendMessage(userId: string, { conversationId, content }: SendMessageArgs) {
  const conversation = await getOwnedConversation(userId, conversationId);
  const companion = await getOwnedCompanion(userId, conversation.companionId as string);

  const recentMessages = await loadRecentMessages(conversationId);
  const memoryFacts = await loadMemoryFacts(companion.id);

  const now = nowIso();
  const userMessage = {
    id: randomUUID(),
    conversationId,
    userId,
    role: 'user',
    content,
    createdAt: now,
  };
  await ddb.send(new PutCommand({ TableName: tableName('Message'), Item: userMessage }));

  const companionContext = buildCompanionContext(companion, memoryFacts);
  const aiProvider = getAIProvider();
  const aiOutput = await aiProvider.generateChatResponse({
    companion: companionContext,
    systemPrompt: buildSystemPrompt(companionContext, memoryFacts),
    recentMessages,
    userMessage: content,
  });

  const assistantMessage = {
    id: randomUUID(),
    conversationId,
    userId,
    role: 'assistant',
    content: aiOutput.content,
    createdAt: nowIso(),
  };
  await ddb.send(new PutCommand({ TableName: tableName('Message'), Item: assistantMessage }));

  await ddb.send(
    new UpdateCommand({
      TableName: tableName('Conversation'),
      Key: { id: conversationId },
      UpdateExpression: 'SET lastMessageAt = :now, lastMessagePreview = :preview',
      ExpressionAttributeValues: {
        ':now': assistantMessage.createdAt,
        ':preview': truncate(aiOutput.content, 80),
      },
    })
  );

  await bumpRelationshipXp(companion.id, companion.relationshipLevel ?? 1, XP_PER_MESSAGE);

  return { message: assistantMessage, suggestedReplies: aiOutput.suggestedReplies ?? [] };
}

async function sendGift(userId: string, { conversationId, giftId }: SendGiftArgs) {
  const gift = findGift(giftId);
  if (!gift) {
    throw new Error('GIFT_NOT_FOUND');
  }

  const conversation = await getOwnedConversation(userId, conversationId);
  const companion = await getOwnedCompanion(userId, conversation.companionId as string);

  const wallet = await ddb.send(new GetCommand({ TableName: tableName('Wallet'), Key: { userId } }));
  const today = nowIso().slice(0, 10);
  const spentToday =
    wallet.Item?.dailySpentDate === today ? ((wallet.Item?.dailySpentAmount as number) ?? 0) : 0;
  const dailyLimit = wallet.Item?.dailySpendLimit as number | undefined;
  if (dailyLimit != null && spentToday + gift.diamondCost > dailyLimit) {
    throw new Error('SPEND_LIMIT_EXCEEDED');
  }

  const now = nowIso();
  const transactionId = `gift#${conversationId}#${randomUUID()}`;
  const newDailySpent = spentToday + gift.diamondCost;

  try {
    await ddb.send(
      new TransactWriteCommand({
        TransactItems: [
          {
            Update: {
              TableName: tableName('Wallet'),
              Key: { userId },
              UpdateExpression:
                'ADD diamondBalance :neg SET dailySpentAmount = :spent, dailySpentDate = :today, updatedAt = :now',
              ConditionExpression: 'diamondBalance >= :cost',
              ExpressionAttributeValues: {
                ':neg': -gift.diamondCost,
                ':cost': gift.diamondCost,
                ':spent': newDailySpent,
                ':today': today,
                ':now': now,
              },
            },
          },
          {
            Put: {
              TableName: tableName('DiamondTransaction'),
              Item: {
                id: transactionId,
                userId,
                amount: -gift.diamondCost,
                type: 'GIFT_SEND',
                relatedEntityId: giftId,
                balanceAfter: 0,
                createdAt: now,
              },
              ConditionExpression: 'attribute_not_exists(id)',
            },
          },
        ],
      })
    );
  } catch (err) {
    if (err instanceof TransactionCanceledException) {
      throw new Error('INSUFFICIENT_DIAMOND');
    }
    throw err;
  }

  const updatedWallet = await ddb.send(new GetCommand({ TableName: tableName('Wallet'), Key: { userId } }));
  await ddb.send(
    new UpdateCommand({
      TableName: tableName('DiamondTransaction'),
      Key: { id: transactionId },
      UpdateExpression: 'SET balanceAfter = :b',
      ExpressionAttributeValues: { ':b': (updatedWallet.Item?.diamondBalance as number) ?? 0 },
    })
  );

  const narrationMessage = {
    id: randomUUID(),
    conversationId,
    userId,
    role: 'narration',
    content: `你送出了 ${gift.emoji} ${gift.name}`,
    createdAt: nowIso(),
  };
  await ddb.send(new PutCommand({ TableName: tableName('Message'), Item: narrationMessage }));

  const memoryFacts = await loadMemoryFacts(companion.id);
  const companionContext = buildCompanionContext(companion, memoryFacts);
  const aiProvider = getAIProvider();
  const aiOutput = await aiProvider.generateChatResponse({
    companion: companionContext,
    systemPrompt: buildSystemPrompt(companionContext, memoryFacts),
    recentMessages: await loadRecentMessages(conversationId),
    userMessage: `[使用者送出了禮物：${gift.name} ${gift.emoji}]`,
  });

  const reactionMessage = {
    id: randomUUID(),
    conversationId,
    userId,
    role: 'assistant',
    content: aiOutput.content,
    createdAt: nowIso(),
  };
  await ddb.send(new PutCommand({ TableName: tableName('Message'), Item: reactionMessage }));

  await ddb.send(
    new UpdateCommand({
      TableName: tableName('Conversation'),
      Key: { id: conversationId },
      UpdateExpression: 'SET lastMessageAt = :now, lastMessagePreview = :preview',
      ExpressionAttributeValues: {
        ':now': reactionMessage.createdAt,
        ':preview': truncate(`${gift.emoji} ${aiOutput.content}`, 80),
      },
    })
  );

  await bumpRelationshipXp(companion.id, companion.relationshipLevel ?? 1, GIFT_RELATIONSHIP_XP);

  return { narrationMessage, reactionMessage, suggestedReplies: aiOutput.suggestedReplies ?? [] };
}

async function getOwnedConversation(userId: string, conversationId: string) {
  const result = await ddb.send(
    new GetCommand({ TableName: tableName('Conversation'), Key: { id: conversationId } })
  );
  if (!result.Item || result.Item.userId !== userId) {
    throw new Error('FORBIDDEN');
  }
  return result.Item;
}

async function getOwnedCompanion(userId: string, companionId: string) {
  const result = await ddb.send(
    new GetCommand({ TableName: tableName('Companion'), Key: { id: companionId } })
  );
  if (!result.Item || result.Item.userId !== userId) {
    throw new Error('FORBIDDEN');
  }
  return result.Item as {
    id: string;
    name: string;
    gender: string;
    age?: number;
    personality?: string[];
    background?: string;
    speechStyle?: string;
    relationshipLevel?: number;
    mood?: string;
  };
}

function buildCompanionContext(
  companion: Awaited<ReturnType<typeof getOwnedCompanion>>,
  memoryFacts: string[]
): CompanionContext {
  return {
    name: companion.name,
    gender: companion.gender,
    age: companion.age,
    personality: companion.personality ?? [],
    background: companion.background ?? '',
    speechStyle: companion.speechStyle,
    relationshipLevel: companion.relationshipLevel ?? 1,
    mood: companion.mood,
    memoryFacts,
  };
}

async function loadRecentMessages(conversationId: string, limit = 20): Promise<ChatMessage[]> {
  const result = await ddb.send(
    new QueryCommand({
      TableName: tableName('Message'),
      IndexName: 'byConversation',
      KeyConditionExpression: 'conversationId = :cid',
      ExpressionAttributeValues: { ':cid': conversationId },
      ScanIndexForward: false,
      Limit: limit,
    })
  );
  const items = (result.Items ?? []) as ChatMessage[];
  return items.reverse();
}

async function loadMemoryFacts(companionId: string): Promise<string[]> {
  try {
    const result = await ddb.send(
      new QueryCommand({
        TableName: tableName('CompanionMemory'),
        IndexName: 'byCompanion',
        KeyConditionExpression: 'companionId = :cid',
        ExpressionAttributeValues: { ':cid': companionId },
        Limit: 20,
      })
    );
    return (result.Items ?? []).map((item) => `${item.key}: ${item.value}`);
  } catch (err) {
    // Memory lookup must never block chat.
    console.error('loadMemoryFacts failed', err);
    return [];
  }
}

async function bumpRelationshipXp(companionId: string, currentLevel: number, xpAmount: number): Promise<void> {
  const result = await ddb.send(
    new UpdateCommand({
      TableName: tableName('Companion'),
      Key: { id: companionId },
      UpdateExpression: 'ADD relationshipXp :xp SET updatedAt = :now',
      ExpressionAttributeValues: { ':xp': xpAmount, ':now': nowIso() },
      ReturnValues: 'UPDATED_NEW',
    })
  );
  const newXp = (result.Attributes?.relationshipXp as number) ?? 0;
  const newLevel = computeLevel(newXp);
  if (newLevel !== currentLevel) {
    await ddb.send(
      new UpdateCommand({
        TableName: tableName('Companion'),
        Key: { id: companionId },
        UpdateExpression: 'SET relationshipLevel = :lvl',
        ExpressionAttributeValues: { ':lvl': newLevel },
      })
    );
  }
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}
