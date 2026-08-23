import { defineBackend, secret } from '@aws-amplify/backend';
import { FunctionUrlAuthType, type IFunction } from 'aws-cdk-lib/aws-lambda';
import { Effect, PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Stack } from 'aws-cdk-lib';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { storage } from './storage/resource';
import { postConfirmation } from './functions/post-confirmation/resource';
import { chatHandler } from './functions/chat-handler/resource';
import { checkinHandler } from './functions/checkin-handler/resource';
import { generationCreate } from './functions/generation-create/resource';
import { generationWebhook } from './functions/generation-webhook/resource';
import { s3Presign } from './functions/s3-presign/resource';

const backend = defineBackend({
  auth,
  data,
  storage,
  postConfirmation,
  chatHandler,
  checkinHandler,
  generationCreate,
  generationWebhook,
  s3Presign,
});

const tables = backend.data.resources.tables;
const bucket = backend.storage.resources.bucket;

/** Grants the given function RW/R access on a Data-provisioned table and
 * wires its physical name to the `<MODEL>_TABLE_NAME` env var that
 * amplify/functions/shared/dynamo.ts's `tableName()` helper reads. */
function wireTable(
  modelName: string,
  fn: { addEnvironment: (k: string, v: string) => void; resources: { lambda: IFunction } },
  access: 'read' | 'readwrite'
) {
  const table = tables[modelName];
  if (access === 'read') {
    table.grantReadData(fn.resources.lambda);
  } else {
    table.grantReadWriteData(fn.resources.lambda);
  }
  fn.addEnvironment(`${modelName.toUpperCase()}_TABLE_NAME`, table.tableName);
}

// --- post-confirmation: signup grant (UserProfile + Wallet + ledger) ---
wireTable('UserProfile', backend.postConfirmation, 'readwrite');
wireTable('Wallet', backend.postConfirmation, 'readwrite');
wireTable('DiamondTransaction', backend.postConfirmation, 'readwrite');

// --- chat-handler: sendMessage / ensureConversation / sendGift ---
wireTable('Conversation', backend.chatHandler, 'readwrite');
wireTable('Message', backend.chatHandler, 'readwrite');
wireTable('Companion', backend.chatHandler, 'readwrite');
wireTable('CompanionMemory', backend.chatHandler, 'read');
wireTable('Wallet', backend.chatHandler, 'readwrite');
wireTable('DiamondTransaction', backend.chatHandler, 'readwrite');
backend.chatHandler.addEnvironment('AI_PROVIDER', 'mock');

// --- checkin-handler ---
wireTable('CheckIn', backend.checkinHandler, 'readwrite');
wireTable('Wallet', backend.checkinHandler, 'readwrite');
wireTable('DiamondTransaction', backend.checkinHandler, 'readwrite');

// --- generation-create ---
wireTable('GenerationPricing', backend.generationCreate, 'read');
wireTable('Wallet', backend.generationCreate, 'readwrite');
wireTable('DiamondTransaction', backend.generationCreate, 'readwrite');
wireTable('GenerationJob', backend.generationCreate, 'readwrite');
backend.generationCreate.addEnvironment('GENERATION_PROVIDER', 'mock');
backend.generationCreate.addEnvironment('GENERATION_WEBHOOK_SECRET', secret('GENERATION_WEBHOOK_SECRET'));

// --- generation-webhook ---
wireTable('GenerationJob', backend.generationWebhook, 'readwrite');
wireTable('Wallet', backend.generationWebhook, 'readwrite');
wireTable('DiamondTransaction', backend.generationWebhook, 'readwrite');
wireTable('Asset', backend.generationWebhook, 'readwrite');
wireTable('GenerationResult', backend.generationWebhook, 'readwrite');
backend.generationWebhook.addEnvironment('GENERATION_WEBHOOK_SECRET', secret('GENERATION_WEBHOOK_SECRET'));
backend.generationWebhook.addEnvironment('ASSETS_BUCKET_NAME', bucket.bucketName);
bucket.grantReadWrite(backend.generationWebhook.resources.lambda);

// --- s3-presign ---
wireTable('Companion', backend.s3Presign, 'read');
backend.s3Presign.addEnvironment('ASSETS_BUCKET_NAME', bucket.bucketName);
bucket.grantReadWrite(backend.s3Presign.resources.lambda);

// --- Function URL on generation-webhook: reachable HTTP entrypoint for a
// real GPU provider's webhook callback in a future P1 swap. The mock
// provider does not use this - it invokes the Lambda directly (see below) so
// P0 doesn't depend on this URL at all. ---
const webhookFunctionUrl = backend.generationWebhook.resources.lambda.addFunctionUrl({
  authType: FunctionUrlAuthType.NONE,
});
backend.addOutput({
  custom: {
    generationWebhookUrl: webhookFunctionUrl.url,
    // No client (not even an authenticated one) is granted write access to
    // GenerationPricing - it's seeded once via scripts/seed-pricing.ts using
    // direct table access, which needs the physical table name.
    generationPricingTableName: tables['GenerationPricing'].tableName,
  },
});

// --- EventBridge Scheduler self-invoke wiring for MockGenerationProvider:
// a dedicated role the Scheduler service assumes to invoke the webhook
// Lambda directly, plus permission on generation-create's role to create
// those one-time schedules. ---
const generationCreateStack = Stack.of(backend.generationCreate.resources.lambda);
const schedulerInvokeRole = new Role(generationCreateStack, 'SchedulerInvokeGenerationWebhookRole', {
  assumedBy: new ServicePrincipal('scheduler.amazonaws.com'),
});
schedulerInvokeRole.addToPolicy(
  new PolicyStatement({
    effect: Effect.ALLOW,
    actions: ['lambda:InvokeFunction'],
    resources: [backend.generationWebhook.resources.lambda.functionArn],
  })
);

backend.generationCreate.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    effect: Effect.ALLOW,
    actions: ['scheduler:CreateSchedule'],
    resources: [
      `arn:aws:scheduler:${generationCreateStack.region}:${generationCreateStack.account}:schedule/default/*`,
    ],
  })
);
backend.generationCreate.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    effect: Effect.ALLOW,
    actions: ['iam:PassRole'],
    resources: [schedulerInvokeRole.roleArn],
  })
);
backend.generationCreate.addEnvironment('GENERATION_WEBHOOK_FUNCTION_ARN', backend.generationWebhook.resources.lambda.functionArn);
backend.generationCreate.addEnvironment('SCHEDULER_INVOKE_ROLE_ARN', schedulerInvokeRole.roleArn);
