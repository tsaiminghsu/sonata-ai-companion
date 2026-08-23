import { createHmac } from 'node:crypto';
import { test, expect } from '@playwright/test';
import { createConfirmedTestUser, login } from './fixtures/auth';
import outputs from '../amplify_outputs.json';

// Requires GENERATION_WEBHOOK_SECRET in the test runner's env, matching the
// value set via `ampx sandbox secret set GENERATION_WEBHOOK_SECRET` for the
// deployed backend - the secret is intentionally not exposed through
// amplify_outputs.json, so this test can't reconstruct a valid signature
// without it and skips rather than failing when it's absent.
const WEBHOOK_SECRET = process.env.GENERATION_WEBHOOK_SECRET;
const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

test('duplicate webhook delivery for a COMPLETED job does not create a second asset', async ({
  page,
  request,
}) => {
  test.skip(DEMO_MODE, 'demo mode has no real Lambda/webhook - only meaningful against a deployed backend');
  test.skip(!WEBHOOK_SECRET, 'GENERATION_WEBHOOK_SECRET not set in test env - see comment above');

  const user = await createConfirmedTestUser();
  await login(page, user);

  const idToken = await page.evaluate(() => window.__sonataTestIdToken?.());
  expect(idToken).toBeTruthy();

  const createResult = await request.post(outputs.data.url, {
    headers: { Authorization: idToken!, 'Content-Type': 'application/json' },
    data: {
      query: `mutation Create($prompt: String!) {
        createImageGenerationJob(prompt: $prompt) { id providerJobId status }
      }`,
      variables: { prompt: '冪等性測試' },
    },
  });
  const createBody = await createResult.json();
  const job = createBody.data.createImageGenerationJob;
  expect(job.providerJobId).toBeTruthy();

  const payload = {
    providerJobId: job.providerJobId,
    status: 'COMPLETED',
    outputUrl: 'https://placehold.co/64x64.png?text=idempotency-test',
  };
  const rawBody = JSON.stringify(payload);
  const signature = createHmac('sha256', WEBHOOK_SECRET!).update(rawBody).digest('hex');

  for (let i = 0; i < 2; i++) {
    const webhookResult = await request.post(outputs.custom.generationWebhookUrl, {
      headers: { 'x-signature': signature, 'Content-Type': 'application/json' },
      data: rawBody,
    });
    expect(webhookResult.ok()).toBeTruthy();
  }

  const resultsResult = await request.post(outputs.data.url, {
    headers: { Authorization: idToken!, 'Content-Type': 'application/json' },
    data: {
      query: `query Results($jobId: ID!) {
        resultsByJob(generationJobId: $jobId) { items { id } }
      }`,
      variables: { jobId: job.id },
    },
  });
  const resultsBody = await resultsResult.json();
  expect(resultsBody.data.resultsByJob.items).toHaveLength(1);
});
