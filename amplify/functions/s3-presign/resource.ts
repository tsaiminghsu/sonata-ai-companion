import { defineFunction } from '@aws-amplify/backend';

export const s3Presign = defineFunction({
  name: 's3-presign',
  entry: './handler.ts',
});
