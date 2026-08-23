import { defineStorage } from '@aws-amplify/backend';

/**
 * Single private bucket for all user assets (avatars, generated images/video,
 * character/wardrobe images). No `access` rules are declared here on purpose:
 * the frontend never talks to S3 directly. All reads/writes go through the
 * s3-presign, generation-create, and generation-webhook Lambdas, which are
 * granted IAM access explicitly in amplify/backend.ts.
 */
export const storage = defineStorage({
  name: 'sonataAssets',
});
