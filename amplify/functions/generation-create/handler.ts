import { randomUUID } from 'node:crypto';
import type { AppSyncResolverHandler, AppSyncIdentityCognito } from 'aws-lambda';
import { GetCommand, TransactWriteCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { TransactionCanceledException } from '@aws-sdk/client-dynamodb';
import { ddb, tableName, nowIso } from '../shared/dynamo';
import { getGenerationProvider } from '../../../lib/providers/generation';

const IMAGE_MODEL = 'mock-sdxl';

type CreateImageGenerationJobArgs = {
  companionId?: string | null;
  prompt: string;
  parameters?: Record<string, unknown> | null;
};

export const handler: AppSyncResolverHandler<CreateImageGenerationJobArgs, unknown> = async (
  event
) => {
  const identity = event.identity as AppSyncIdentityCognito | null;
  const userId = identity?.sub;
  if (!userId) {
    throw new Error('UNAUTHORIZED');
  }
  const { companionId, prompt, parameters } = event.arguments;

  const pricing = await ddb.send(
    new GetCommand({
      TableName: tableName('GenerationPricing'),
      Key: { type: 'IMAGE', model: IMAGE_MODEL },
    })
  );
  if (!pricing.Item || pricing.Item.enabled === false) {
    throw new Error('GENERATION_UNAVAILABLE');
  }
  const diamondCost = pricing.Item.diamondCost as number;

  const jobId = randomUUID();
  const now = nowIso();
  const transactionId = `genjob#${jobId}#spend`;

  const jobItem = {
    id: jobId,
    userId,
    companionId: companionId ?? undefined,
    type: 'IMAGE',
    status: 'QUEUED',
    provider: process.env.GENERATION_PROVIDER ?? 'mock',
    prompt,
    parameters: parameters ?? undefined,
    diamondCost,
    transactionId,
    createdAt: now,
    updatedAt: now,
  };

  try {
    await ddb.send(
      new TransactWriteCommand({
        TransactItems: [
          {
            Update: {
              TableName: tableName('Wallet'),
              Key: { userId },
              UpdateExpression: 'ADD diamondBalance :neg SET updatedAt = :now',
              ConditionExpression: 'diamondBalance >= :cost',
              ExpressionAttributeValues: { ':neg': -diamondCost, ':cost': diamondCost, ':now': now },
            },
          },
          {
            Put: {
              TableName: tableName('DiamondTransaction'),
              Item: {
                id: transactionId,
                userId,
                amount: -diamondCost,
                type: 'GENERATION_SPEND',
                relatedEntityId: jobId,
                balanceAfter: 0,
                createdAt: now,
              },
              ConditionExpression: 'attribute_not_exists(id)',
            },
          },
          {
            Put: {
              TableName: tableName('GenerationJob'),
              Item: jobItem,
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

  const wallet = await ddb.send(new GetCommand({ TableName: tableName('Wallet'), Key: { userId } }));
  await ddb.send(
    new UpdateCommand({
      TableName: tableName('DiamondTransaction'),
      Key: { id: transactionId },
      UpdateExpression: 'SET balanceAfter = :b',
      ExpressionAttributeValues: { ':b': (wallet.Item?.diamondBalance as number) ?? 0 },
    })
  );

  try {
    const provider = getGenerationProvider();
    const jobResult = await provider.createImageJob({ prompt, parameters: parameters ?? undefined });
    await ddb.send(
      new UpdateCommand({
        TableName: tableName('GenerationJob'),
        Key: { id: jobId },
        UpdateExpression: 'SET providerJobId = :pid, #status = :status, updatedAt = :now',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: {
          ':pid': jobResult.providerJobId,
          ':status': jobResult.status,
          ':now': nowIso(),
        },
      })
    );
    return { ...jobItem, providerJobId: jobResult.providerJobId, status: jobResult.status };
  } catch (err) {
    // The provider call failed synchronously - refund and mark the job FAILED
    // so the client sees a clean failure instead of a job stuck QUEUED forever.
    console.error('generation provider createImageJob failed', err);
    await refund(userId, jobId, diamondCost);
    return { ...jobItem, status: 'FAILED', errorMessage: 'PROVIDER_ERROR' };
  }
};

async function refund(userId: string, jobId: string, amount: number): Promise<void> {
  const now = nowIso();
  const refundTransactionId = `genjob#${jobId}#refund`;
  await ddb.send(
    new TransactWriteCommand({
      TransactItems: [
        {
          Update: {
            TableName: tableName('Wallet'),
            Key: { userId },
            UpdateExpression: 'ADD diamondBalance :amount SET updatedAt = :now',
            ExpressionAttributeValues: { ':amount': amount, ':now': now },
          },
        },
        {
          Put: {
            TableName: tableName('DiamondTransaction'),
            Item: {
              id: refundTransactionId,
              userId,
              amount,
              type: 'GENERATION_REFUND',
              relatedEntityId: jobId,
              balanceAfter: 0,
              createdAt: now,
            },
            ConditionExpression: 'attribute_not_exists(id)',
          },
        },
        {
          Update: {
            TableName: tableName('GenerationJob'),
            Key: { id: jobId },
            UpdateExpression: 'SET #status = :status, refundTransactionId = :rtid, updatedAt = :now',
            ExpressionAttributeNames: { '#status': 'status' },
            ExpressionAttributeValues: { ':status': 'FAILED', ':rtid': refundTransactionId, ':now': now },
          },
        },
      ],
    })
  );
}
