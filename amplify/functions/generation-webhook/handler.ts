import { createHmac, timingSafeEqual } from 'node:crypto';
import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { finalizeJob, type FinalizeJobPayload } from './core';

type MockSelfInvokeEvent = {
  source: 'mock-provider';
  signature: string;
  body: FinalizeJobPayload;
};

function isHttpEvent(event: unknown): event is APIGatewayProxyEventV2 {
  return typeof event === 'object' && event !== null && 'requestContext' in event;
}

function verify(rawPayload: string, signature: string | undefined): boolean {
  const secret = process.env.GENERATION_WEBHOOK_SECRET ?? '';
  if (!signature) return false;
  const expected = createHmac('sha256', secret).update(rawPayload).digest('hex');
  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(signature, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

export const handler = async (
  event: APIGatewayProxyEventV2 | MockSelfInvokeEvent
): Promise<APIGatewayProxyResultV2 | { handled: boolean }> => {
  if (isHttpEvent(event)) {
    const rawBody = event.body ?? '';
    const signature = event.headers?.['x-signature'] ?? event.headers?.['X-Signature'];
    if (!verify(rawBody, signature)) {
      return { statusCode: 401, body: JSON.stringify({ error: 'INVALID_SIGNATURE' }) };
    }
    const payload = JSON.parse(rawBody) as FinalizeJobPayload;
    const result = await finalizeJob(payload);
    return { statusCode: 200, body: JSON.stringify(result) };
  }

  // Mock provider self-invoke: same signature scheme, verified over the
  // JSON-serialized body it signed in MockGenerationProvider.
  if (!verify(JSON.stringify(event.body), event.signature)) {
    throw new Error('INVALID_SIGNATURE');
  }
  return finalizeJob(event.body);
};
