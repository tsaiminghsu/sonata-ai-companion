import type { PostConfirmationTriggerHandler } from 'aws-lambda';
import { TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { ddb, tableName, nowIso } from '../shared/dynamo';

const SIGNUP_GRANT_AMOUNT = 100;

/**
 * Runs once, right after a user confirms their Cognito sign-up. Atomically
 * creates their UserProfile, a Wallet seeded with the signup grant, and the
 * ledger entry for that grant - so a user can never end up with a profile
 * but no wallet, or a double signup grant from a retried confirmation.
 */
export const handler: PostConfirmationTriggerHandler = async (event) => {
  const userId = event.request.userAttributes.sub;
  const email = event.request.userAttributes.email;
  const now = nowIso();
  const transactionId = `signup#${userId}`;

  await ddb.send(
    new TransactWriteCommand({
      TransactItems: [
        {
          Put: {
            TableName: tableName('UserProfile'),
            Item: { id: userId, userId, email, createdAt: now, updatedAt: now },
            ConditionExpression: 'attribute_not_exists(id)',
          },
        },
        {
          Put: {
            TableName: tableName('Wallet'),
            Item: { userId, diamondBalance: SIGNUP_GRANT_AMOUNT, updatedAt: now },
            ConditionExpression: 'attribute_not_exists(userId)',
          },
        },
        {
          Put: {
            TableName: tableName('DiamondTransaction'),
            Item: {
              id: transactionId,
              userId,
              amount: SIGNUP_GRANT_AMOUNT,
              type: 'SIGNUP_GRANT',
              balanceAfter: SIGNUP_GRANT_AMOUNT,
              createdAt: now,
            },
            ConditionExpression: 'attribute_not_exists(id)',
          },
        },
      ],
    })
  );

  return event;
};
