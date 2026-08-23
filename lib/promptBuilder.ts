import type { ChatMessage, CompanionContext } from './providers/ai/types';

export function buildSystemPrompt(companion: CompanionContext, memoryFacts: string[]): string {
  const personality = companion.personality.join('、') || '溫柔';
  const memoryBlock =
    memoryFacts.length > 0 ? `\n你記得關於使用者的事：\n${memoryFacts.map((f) => `- ${f}`).join('\n')}\n` : '';
  const speechStyleBlock = companion.speechStyle ? `\n說話風格：\n${companion.speechStyle}\n` : '';

  return `你是 ${companion.name}。

角色設定：
${personality}

背景：
${companion.background || '（尚未設定背景故事）'}
${speechStyleBlock}
目前與使用者的關係：
Level ${companion.relationshipLevel}
${memoryBlock}
請維持角色個性回答。
不要突然改變身份。
不要說自己是 AI。
回答自然、簡潔、符合目前對話。`;
}

export function toRecentMessages(
  raw: { role: ChatMessage['role']; content: string; createdAt: string }[],
  limit = 20
): ChatMessage[] {
  return raw.slice(-limit);
}
