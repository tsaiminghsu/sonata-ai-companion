// Framework-agnostic: no `next`/`react` imports. Imported by relative path from
// both amplify/functions/chat-handler and (later) server-side Next.js code.

export type ChatRole = 'user' | 'assistant' | 'system' | 'narration';

export interface ChatMessage {
  role: ChatRole;
  content: string;
  createdAt: string;
}

export interface CompanionContext {
  name: string;
  gender: string;
  age?: number;
  personality: string[];
  background: string;
  speechStyle?: string;
  relationshipLevel: number;
  mood?: string;
  memoryFacts?: string[];
}

export interface GenerateChatResponseInput {
  companion: CompanionContext;
  systemPrompt: string;
  recentMessages: ChatMessage[];
  userMessage: string;
}

export interface GenerateChatResponseOutput {
  content: string;
  suggestedReplies?: string[];
}

export interface AIProvider {
  generateChatResponse(input: GenerateChatResponseInput): Promise<GenerateChatResponseOutput>;
}
