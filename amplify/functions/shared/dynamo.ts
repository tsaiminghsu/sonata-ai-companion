import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});

export const ddb = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true },
});

/**
 * Amplify Data provisions table names as `${ModelName}-${apiId}-${envName}` and
 * exposes them to functions via env vars named `<MODEL_NAME_UPPER_SNAKE>_TABLE_NAME`
 * (wired up explicitly in amplify/backend.ts via `backend.data.resources.tables`).
 */
export function tableName(model: string): string {
  const envVar = `${model.toUpperCase()}_TABLE_NAME`;
  const value = process.env[envVar];
  if (!value) {
    throw new Error(`Missing env var ${envVar} - was the table name wired in amplify/backend.ts?`);
  }
  return value;
}

export function nowIso(): string {
  return new Date().toISOString();
}
