import { randomUUID, createHmac } from 'node:crypto';
import { SchedulerClient, CreateScheduleCommand, FlexibleTimeWindowMode } from '@aws-sdk/client-scheduler';
import type {
  GenerationProvider,
  CreateImageJobInput,
  CreateVideoJobInput,
  CreateJobOutput,
  JobStatusOutput,
} from './types';

// Placeholder image generator so the mock pipeline produces a real,
// fetchable output (the webhook path always copies it into S3) without a
// real GPU vendor. The prompt is echoed into the image text so a Playwright
// test can assert the pipeline actually carried the user's input through.
function mockImageUrl(prompt: string): string {
  const text = encodeURIComponent(prompt.slice(0, 40) || 'Sonata Mock');
  return `https://placehold.co/512x512/1A0A19/FF1680.png?text=${text}`;
}

const scheduler = new SchedulerClient({});

type MockPayload = { providerJobId: string; status: 'PROCESSING' | 'COMPLETED'; outputUrl?: string };

/**
 * Does NOT shortcut the async lifecycle: returns a fake providerJobId
 * immediately, then schedules two one-time EventBridge events - a
 * PROCESSING tick, then COMPLETED a few seconds later - that invoke the
 * generation-webhook Lambda directly (Lambda-to-Lambda), each carrying a
 * synthetic HMAC signature computed from the same GENERATION_WEBHOOK_SECRET
 * the real webhook verifies against - so mock jobs exercise the exact same
 * QUEUED->PROCESSING->COMPLETED code path, S3 copy, and idempotency guard a
 * real provider would.
 */
export class MockGenerationProvider implements GenerationProvider {
  async createImageJob(input: CreateImageJobInput): Promise<CreateJobOutput> {
    const providerJobId = `mock-img-${randomUUID()}`;
    await this.scheduleLifecycle(providerJobId, mockImageUrl(input.prompt));
    return { providerJobId, status: 'QUEUED' };
  }

  async createVideoJob(input: CreateVideoJobInput): Promise<CreateJobOutput> {
    // P1: video generation is out of scope; keep the interface implemented
    // so the type stays honest about what GenerationProvider requires.
    const providerJobId = `mock-vid-${randomUUID()}`;
    await this.scheduleLifecycle(providerJobId, mockImageUrl(input.prompt));
    return { providerJobId, status: 'QUEUED' };
  }

  async getJobStatus(): Promise<JobStatusOutput> {
    // Not used in P0: completion is delivered via the scheduled self-invoke
    // webhook, not polling the provider. Implemented to satisfy the interface.
    return { status: 'PROCESSING' };
  }

  private async scheduleLifecycle(providerJobId: string, outputUrl: string): Promise<void> {
    const processingDelay = 1 + Math.floor(Math.random() * 2); // 1-2s
    const completedDelay = processingDelay + 2 + Math.floor(Math.random() * 4); // +2-5s

    await this.scheduleEvent(providerJobId, { providerJobId, status: 'PROCESSING' }, processingDelay);
    await this.scheduleEvent(
      providerJobId,
      { providerJobId, status: 'COMPLETED', outputUrl },
      completedDelay,
      'completed'
    );
  }

  private async scheduleEvent(
    providerJobId: string,
    payload: MockPayload,
    delaySeconds: number,
    suffix = 'processing'
  ): Promise<void> {
    // EventBridge Scheduler `at()` supports second-level precision, so a
    // short mock delay schedules directly - no minute-boundary rounding
    // needed. (Actual delivery has a small amount of AWS-side latency on top
    // of this, which only makes the QUEUED/PROCESSING UI states more visible.)
    const at = new Date(Date.now() + delaySeconds * 1000);
    const secret = process.env.GENERATION_WEBHOOK_SECRET ?? '';
    const signature = createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');

    await scheduler.send(
      new CreateScheduleCommand({
        // Decoupled from providerJobId's length (which can vary) to avoid any
        // risk of two schedule names colliding after truncation - schedules
        // self-delete on firing, so human-traceability isn't needed here.
        Name: `sonata-mock-${suffix}-${randomUUID().slice(0, 8)}`,
        GroupName: process.env.SCHEDULER_GROUP_NAME,
        FlexibleTimeWindow: { Mode: FlexibleTimeWindowMode.OFF },
        ScheduleExpression: `at(${toScheduleExpr(at)})`,
        ActionAfterCompletion: 'DELETE',
        Target: {
          Arn: process.env.GENERATION_WEBHOOK_FUNCTION_ARN!,
          RoleArn: process.env.SCHEDULER_INVOKE_ROLE_ARN!,
          Input: JSON.stringify({ source: 'mock-provider', signature, body: payload }),
        },
      })
    );
  }
}

function toScheduleExpr(date: Date): string {
  // EventBridge `at()` wants yyyy-MM-ddTHH:mm:ss, UTC, no milliseconds/zone.
  return date.toISOString().replace(/\.\d{3}Z$/, '');
}
