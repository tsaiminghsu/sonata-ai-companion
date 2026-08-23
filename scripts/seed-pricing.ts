/**
 * One-time seed for GenerationPricing after `ampx sandbox` deploys.
 * No client (not even an authenticated one) is granted write access to this
 * model via AppSync, so seeding goes straight to DynamoDB with the
 * developer's own AWS credentials - the same ones `ampx sandbox` used.
 *
 * Usage: npx tsx scripts/seed-pricing.ts
 */
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import outputs from '../amplify_outputs.json';

async function main() {
  const tableName = outputs.custom?.generationPricingTableName;
  if (!tableName || tableName.endsWith('-placeholder')) {
    throw new Error(
      'amplify_outputs.json has no real generationPricingTableName yet - run `npx ampx sandbox` first.'
    );
  }

  const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
  await ddb.send(
    new PutCommand({
      TableName: tableName,
      Item: { type: 'IMAGE', model: 'mock-sdxl', diamondCost: 10, enabled: true },
    })
  );

  console.log(`Seeded GenerationPricing (IMAGE / mock-sdxl / 10 diamonds) into ${tableName}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
