import { defineFunction } from '@aws-amplify/backend';

export const generationWebhook = defineFunction({
  name: 'generation-webhook',
  entry: './handler.ts',
  timeoutSeconds: 30,
  runtime: 20, // needs global fetch() to download provider output
});
