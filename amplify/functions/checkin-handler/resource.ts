import { defineFunction } from '@aws-amplify/backend';

export const checkinHandler = defineFunction({
  name: 'checkin-handler',
  entry: './handler.ts',
});
