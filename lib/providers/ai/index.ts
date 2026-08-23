import type { AIProvider } from './types';
import { MockAIProvider } from './MockAIProvider';

export * from './types';

let cached: AIProvider | undefined;

/**
 * Swap point for a real AI vendor: implement AIProvider (e.g. Anthropic/OpenAI
 * backed) in a ProductionAIProvider.ts, branch on it here, and set
 * AI_PROVIDER=production in the Lambda's environment. No caller changes.
 */
export function getAIProvider(): AIProvider {
  if (cached) return cached;

  const providerName = process.env.AI_PROVIDER ?? 'mock';
  switch (providerName) {
    case 'mock':
      cached = new MockAIProvider();
      return cached;
    default:
      throw new Error(`Unknown AI_PROVIDER "${providerName}" - only "mock" is implemented in P0`);
  }
}
