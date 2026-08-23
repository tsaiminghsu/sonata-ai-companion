import { randomUUID } from 'node:crypto';
import { PutCommand, QueryCommand, TransactWriteCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { ConditionalCheckFailedException, TransactionCanceledException } from '@aws-sdk/client-dynamodb';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { ddb, tableName, nowIso } from '../shared/dynamo';

const s3 = new S3Client({});

export interface FinalizeJobPayload {
  providerJobId: string;
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED';
  outputUrl?: string;
  error?: string;
}

/**
 * Idempotent status-delivery handler shared by the real webhook HTTP
 * entrypoint and the mock provider's self-invoke. PROCESSING is a
 * non-terminal progress tick (QUEUED->PROCESSING only, no side effects).
 * COMPLETED/FAILED are terminal: if the job is already terminal, this is a
 * safe no-op (duplicate delivery); otherwise it atomically transitions the
 * job and either copies the provider's output into S3 + creates the Asset
 * (COMPLETED, no wallet mutation - already charged at job creation) or
 * refunds the diamond spend (FAILED).
 */
export async function finalizeJob(payload: FinalizeJobPayload): Promise<{ handled: boolean }> {
  const job = await findJobByProviderJobId(payload.providerJobId);
  if (!job) {
    console.error('finalizeJob: no GenerationJob for providerJobId', payload.providerJobId);
    return { handled: false };
  }

  if (payload.status === 'PROCESSING') {
    const transitioned = await transitionFromQueuedToProcessing(job.id as string);
    return { handled: transitioned };
  }

  const transitioned = await transitionToTerminal(job.id as string, payload.status);
  if (!transitioned) {
    // Already terminal - duplicate webhook delivery, nothing to do.
    return { handled: false };
  }

  if (payload.status === 'COMPLETED') {
    await completeJob(job, payload);
  } else {
    await refundJob(job, payload.error);
  }
  return { handled: true };
}

async function findJobByProviderJobId(providerJobId: string) {
  const result = await ddb.send(
    new QueryCommand({
      TableName: tableName('GenerationJob'),
      IndexName: 'byProviderJobId',
      KeyConditionExpression: 'providerJobId = :pid',
      ExpressionAttributeValues: { ':pid': providerJobId },
      Limit: 1,
    })
  );
  return result.Items?.[0];
}

async function transitionFromQueuedToProcessing(jobId: string): Promise<boolean> {
  try {
    await ddb.send(
      new UpdateCommand({
        TableName: tableName('GenerationJob'),
        Key: { id: jobId },
        UpdateExpression: 'SET #status = :processing, updatedAt = :now',
        ConditionExpression: '#status = :queued',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: { ':processing': 'PROCESSING', ':queued': 'QUEUED', ':now': nowIso() },
      })
    );
    return true;
  } catch (err) {
    if (err instanceof ConditionalCheckFailedException) {
      return false;
    }
    throw err;
  }
}

async function transitionToTerminal(jobId: string, newStatus: 'COMPLETED' | 'FAILED'): Promise<boolean> {
  try {
    await ddb.send(
      new UpdateCommand({
        TableName: tableName('GenerationJob'),
        Key: { id: jobId },
        UpdateExpression: 'SET #status = :new, updatedAt = :now',
        ConditionExpression:
          '#status <> :completed AND #status <> :failed AND #status <> :cancelled',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: {
          ':new': newStatus,
          ':now': nowIso(),
          ':completed': 'COMPLETED',
          ':failed': 'FAILED',
          ':cancelled': 'CANCELLED',
        },
      })
    );
    return true;
  } catch (err) {
    if (err instanceof ConditionalCheckFailedException) {
      return false;
    }
    throw err;
  }
}

async function completeJob(
  job: Record<string, unknown>,
  payload: FinalizeJobPayload
): Promise<void> {
  const outputUrl = payload.outputUrl!;
  const response = await fetch(outputUrl);
  if (!response.ok) {
    throw new Error(`Failed to download provider output: HTTP ${response.status}`);
  }
  const contentType = response.headers.get('content-type') ?? 'image/png';
  const extension = contentType.includes('png') ? 'png' : contentType.includes('jpeg') ? 'jpg' : 'bin';
  const bytes = new Uint8Array(await response.arrayBuffer());

  const userId = job.userId as string;
  const companionId = job.companionId as string | undefined;
  const s3Key = companionId
    ? `users/${userId}/companions/${companionId}/images/${job.id}.${extension}`
    : `users/${userId}/assets/${job.id}.${extension}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: process.env.ASSETS_BUCKET_NAME,
      Key: s3Key,
      Body: bytes,
      ContentType: contentType,
    })
  );

  const now = nowIso();
  const assetId = randomUUID();
  await ddb.send(
    new PutCommand({
      TableName: tableName('Asset'),
      Item: {
        id: assetId,
        userId,
        companionId,
        type: 'IMAGE',
        s3Key,
        generationJobId: job.id,
        prompt: job.prompt,
        createdAt: now,
      },
    })
  );
  await ddb.send(
    new PutCommand({
      TableName: tableName('GenerationResult'),
      Item: {
        id: randomUUID(),
        generationJobId: job.id,
        userId,
        providerOutputUrl: outputUrl,
        s3Key,
        createdAt: now,
      },
    })
  );
  await ddb.send(
    new UpdateCommand({
      TableName: tableName('GenerationJob'),
      Key: { id: job.id },
      UpdateExpression: 'SET resultAssetId = :assetId, updatedAt = :now',
      ExpressionAttributeValues: { ':assetId': assetId, ':now': nowIso() },
    })
  );
}

async function refundJob(job: Record<string, unknown>, error: string | undefined): Promise<void> {
  const userId = job.userId as string;
  const jobId = job.id as string;
  const amount = job.diamondCost as number;
  const now = nowIso();
  const refundTransactionId = `genjob#${jobId}#refund`;

  try {
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
        ],
      })
    );
  } catch (err) {
    if (!(err instanceof TransactionCanceledException)) throw err;
    // refund ledger entry already exists - fall through to still record error on the job
  }

  await ddb.send(
    new UpdateCommand({
      TableName: tableName('GenerationJob'),
      Key: { id: jobId },
      UpdateExpression: 'SET refundTransactionId = :rtid, errorMessage = :err, updatedAt = :now',
      ExpressionAttributeValues: {
        ':rtid': refundTransactionId,
        ':err': error ?? 'GENERATION_FAILED',
        ':now': now,
      },
    })
  );
}
