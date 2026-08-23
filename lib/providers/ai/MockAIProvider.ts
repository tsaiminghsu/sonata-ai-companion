import type {
  AIProvider,
  GenerateChatResponseInput,
  GenerateChatResponseOutput,
} from './types';

const MOODS: Record<string, string[]> = {
  溫柔: ['嗯…我在聽你說喔。', '別擔心，我陪著你。', '你今天過得還好嗎？'],
  活潑: ['哇，真的嗎！跟我多說一點嘛～', '欸欸這個我也想試試看！', '今天感覺特別有活力呢！'],
  高冷: ['……嗯。', '隨便你。', '有事就直說。'],
  成熟: ['我明白你的意思。', '這件事，我們可以慢慢談。', '你考慮得很周全。'],
  理性: ['讓我們先釐清重點。', '從邏輯上來看，這樣比較合理。', '你的論點我理解了。'],
  可愛: ['嘿嘿，被你發現了~', '人家才沒有在意呢（其實有）。', '要不要一起做點什麼？'],
};

function pick<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length];
}

/**
 * Deterministic-enough templated replies so Playwright can assert on
 * substrings without a real AI vendor wired up. Swap AI_PROVIDER=production
 * (see index.ts) to use a real implementation without touching any caller.
 */
export class MockAIProvider implements AIProvider {
  // Doesn't call a real LLM, so systemPrompt is unused here - a production
  // provider is expected to send it as the system role message.
  async generateChatResponse(
    input: GenerateChatResponseInput
  ): Promise<GenerateChatResponseOutput> {
    const { companion, userMessage } = input;
    const trait = companion.personality[0] ?? '溫柔';
    const bank = MOODS[trait] ?? MOODS['溫柔'];
    const seed = userMessage.length + companion.name.length;
    const line = pick(bank, seed);

    const content = `${line}（關於「${truncate(userMessage, 20)}」，${companion.name}想了想...）`;

    return {
      content,
      suggestedReplies: [
        '再多告訴我一點吧。',
        `${companion.name}，你在想什麼呢？`,
        '我們換個話題聊聊？',
      ],
    };
  }
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}
