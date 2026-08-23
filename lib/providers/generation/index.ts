import type { GenerationProvider } from './types';
import { MockGenerationProvider } from './MockGenerationProvider';

export * from './types';

let cached: GenerationProvider | undefined;

/**
 * Swap point for a real GPU vendor (Replicate/RunPod/Modal/SageMaker/etc):
 * implement GenerationProvider in a ProductionGenerationProvider.ts, branch
 * on it here, and set GENERATION_PROVIDER=production in the Lambda's
 * environment. No caller changes.
 */
export function getGenerationProvider(): GenerationProvider {
  if (cached) return cached;

  const providerName = process.env.GENERATION_PROVIDER ?? 'mock';
  switch (providerName) {
    case 'mock':
      cached = new MockGenerationProvider();
      return cached;
    default:
      throw new Error(
        `Unknown GENERATION_PROVIDER "${providerName}" - only "mock" is implemented in P0`
      );
  }
}
