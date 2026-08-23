export function SuggestedReplyChips({
  suggestions,
  onSelect,
  disabled,
}: {
  suggestions: string[];
  onSelect: (text: string) => void;
  disabled?: boolean;
}) {
  if (suggestions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 px-4 py-2">
      {suggestions.map((text) => (
        <button
          key={text}
          data-testid="suggested-reply"
          disabled={disabled}
          onClick={() => onSelect(text)}
          className="neon-ring glass-panel rounded-full px-3.5 py-1.5 text-xs text-muted transition hover:text-[var(--color-text)] disabled:opacity-40"
        >
          {text}
        </button>
      ))}
    </div>
  );
}
