import { randomUUID } from 'node:crypto';
import type { AppSyncResolverHandler, AppSyncIdentityCognito } from 'aws-lambda';
import { GetCommand } from '@aws-sdk/lib-dynamodb';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ddb, tableName } from '../shared/dynamo';

const s3 = new S3Client({});
const URL_EXPIRY_SECONDS = 300;

type CreateUploadUrlArgs = { companionId: string; contentType: string };
type CreateDownloadUrlArgs = { key: string };

export const handler: AppSyncResolverHandler<
  CreateUploadUrlArgs | CreateDownloadUrlArgs,
  unknown
> = async (event) => {
  const identity = event.identity as AppSyncIdentityCognito | null;
  const userId = identity?.sub;
  if (!userId) {
    throw new Error('UNAUTHORIZED');
  }

  switch (event.info.fieldName) {
    case 'createUploadUrl':
      return createUploadUrl(userId, event.arguments as CreateUploadUrlArgs);
    case 'createDownloadUrl':
      return createDownloadUrl(userId, event.arguments as CreateDownloadUrlArgs);
    default:
      throw new Error(`Unknown operation: ${event.info.fieldName}`);
  }
};

async function createUploadUrl(userId: string, { companionId, contentType }: CreateUploadUrlArgs) {
  const companion = await ddb.send(
    new GetCommand({ TableName: tableName('Companion'), Key: { id: companionId } })
  );
  if (!companion.Item || companion.Item.userId !== userId) {
    throw new Error('FORBIDDEN');
  }

  const extension = contentType.includes('png') ? 'png' : contentType.includes('jpeg') ? 'jpg' : 'bin';
  const key = `users/${userId}/companions/${companionId}/avatar/${randomUUID()}.${extension}`;

  const url = await getSignedUrl(
    s3,
    new PutObjectCommand({ Bucket: process.env.ASSETS_BUCKET_NAME, Key: key, ContentType: contentType }),
    { expiresIn: URL_EXPIRY_SECONDS }
  );

  return { url, key };
}

async function createDownloadUrl(userId: string, { key }: CreateDownloadUrlArgs) {
  if (!key.startsWith(`users/${userId}/`)) {
    throw new Error('FORBIDDEN');
  }

  const url = await getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: process.env.ASSETS_BUCKET_NAME, Key: key }),
    { expiresIn: URL_EXPIRY_SECONDS }
  );

  return { url, key };
}
