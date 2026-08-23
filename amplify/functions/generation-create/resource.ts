import { defineFunction } from '@aws-amplify/backend';

export const generationCreate = defineFunction({
  name: 'generation-create',
  entry: './handler.ts',
  timeoutSeconds: 30,
});
