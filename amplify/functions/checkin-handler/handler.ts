import type { AppSyncResolverHandler, AppSyncIdentityCognito } from 'aws-lambda';
import { GetCommand, TransactWriteCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { TransactionCanceledException } from '@aws-sdk/client-dynamodb';
import { ddb, tableName, nowIso } from '../shared/dynamo';

const DAILY_CHECKIN_AMOUNT = 20;

type SetSpendLimitArgs = { dailySpendLimit?: number | null };

/** Backs two custom mutations (dispatched on event.info.fieldName):
 * - checkIn: daily +20 diamonds, once per day
 * - setSpendLimit: 消費上限自設 - a Wallet preference write, kept Lambda-only
 *   like every other Wallet field rather than a client-writable field. */
export const handler: AppSyncResolverHandler<SetSpendLimitArgs, unknown> = async (event) => {
  const identity = event.identity as AppSyncIdentityCognito | null;
  const userId = identity?.sub;
  if (!userId) {
    throw new Error('UNAUTHORIZED');
  }

  switch (event.info.fieldName) {
    case 'setSpendLimit':
      return setSpendLimit(userId, event.arguments as SetSpendLimitArgs);
    case 'checkIn':
      return checkIn(userId);
    default:
      throw new Error(`Unknown operation: ${event.info.fieldName}`);
  }
};

async function setSpendLimit(userId: string, { dailySpendLimit }: SetSpendLimitArgs) {
  if (dailySpendLimit != null && dailySpendLimit < 0) {
    throw new Error('INVALID_SPEND_LIMIT');
  }
  const result = await ddb.send(
    new UpdateCommand({
      TableName: tableName('Wallet'),
      Key: { userId },
      UpdateExpression: 'SET dailySpendLimit = :limit, updatedAt = :now',
      ExpressionAttributeValues: { ':limit': dailySpendLimit ?? null, ':now': nowIso() },
      ReturnValues: 'ALL_NEW',
    })
  );
  return result.Attributes;
}

async function checkIn(userId: string) {
  const now = nowIso();
  const today = now.slice(0, 10); // YYYY-MM-DD
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const transactionId = `checkin#${userId}#${today}`;

  const yesterdayCheckIn = await ddb.send(
    new GetCommand({ TableName: tableName('CheckIn'), Key: { userId, checkInDate: yesterday } })
  );
  const streakCount = ((yesterdayCheckIn.Item?.streakCount as number) ?? 0) + 1;

  const checkInItem = {
    userId,
    checkInDate: today,
    diamondAwarded: DAILY_CHECKIN_AMOUNT,
    streakCount,
    createdAt: now,
  };

  try {
    await ddb.send(
      new TransactWriteCommand({
        TransactItems: [
          {
            Put: {
              TableName: tableName('CheckIn'),
              Item: checkInItem,
              ConditionExpression: 'attribute_not_exists(userId)',
            },
          },
          {
            Update: {
              TableName: tableName('Wallet'),
              Key: { userId },
              UpdateExpression: 'ADD diamondBalance :amount SET updatedAt = :now',
              ExpressionAttributeValues: { ':amount': DAILY_CHECKIN_AMOUNT, ':now': now },
            },
          },
          {
            Put: {
              TableName: tableName('DiamondTransaction'),
              // balanceAfter is filled in right after the transaction commits
              // (TransactWriteItems can't return updated attribute values) -
              // Wallet.diamondBalance stays the source of truth regardless.
              Item: {
                id: transactionId,
                userId,
                amount: DAILY_CHECKIN_AMOUNT,
                type: 'DAILY_CHECKIN',
                relatedEntityId: today,
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
      throw new Error('ALREADY_CHECKED_IN');
    }
    throw err;
  }

  const wallet = await ddb.send(
    new GetCommand({ TableName: tableName('Wallet'), Key: { userId } })
  );
  const balanceAfter = (wallet.Item?.diamondBalance as number) ?? DAILY_CHECKIN_AMOUNT;
  await ddb.send(
    new UpdateCommand({
      TableName: tableName('DiamondTransaction'),
      Key: { id: transactionId },
      UpdateExpression: 'SET balanceAfter = :balanceAfter',
      ExpressionAttributeValues: { ':balanceAfter': balanceAfter },
    })
  );

  return checkInItem;
}
