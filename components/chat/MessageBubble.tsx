type Role = 'user' | 'assistant' | 'system' | 'narration';

export function MessageBubble({ role, content }: { role: Role; content: string }) {
  if (role === 'narration' || role === 'system') {
    return (
      <div className="glass-panel mx-auto max-w-md rounded-xl px-4 py-3 text-center text-xs text-muted">
        {content}
      </div>
    );
  }

  const isUser = role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        data-testid="chat-message"
        data-role={role}
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? 'bg-gradient-to-r from-magenta to-crimson text-white'
            : 'glass-panel text-[var(--color-text)]'
        }`}
      >
        {content}
      </div>
    </div>
  );
}
