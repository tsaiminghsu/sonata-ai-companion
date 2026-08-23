'use client';

import { FormEvent, useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import { AVATAR_PRESETS } from '@/lib/companion/avatarPresets';

export const PERSONALITY_OPTIONS = [
  '溫柔', '活潑', '高冷', '成熟', '理性', '可愛',
  '幽默', '神秘', '傲嬌', '浪漫', '忠誠', '害羞',
] as const;
export const GENDER_OPTIONS = [
  { value: 'FEMALE', label: '女性' },
  { value: 'MALE', label: '男性' },
  { value: 'NONBINARY', label: '無性別' },
] as const;

export type CompanionFormValues = {
  name: string;
  gender: string;
  age: string;
  personality: string[];
  background: string;
  speechStyle: string;
  avatarUrl: string;
};

export function CompanionForm({
  initial,
  submitLabel,
  submittingLabel,
  onSubmit,
}: {
  initial?: Partial<CompanionFormValues>;
  submitLabel: string;
  submittingLabel: string;
  onSubmit: (values: CompanionFormValues) => Promise<void>;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [gender, setGender] = useState(initial?.gender ?? GENDER_OPTIONS[0].value);
  const [age, setAge] = useState(initial?.age ?? '');
  const [personality, setPersonality] = useState<string[]>(initial?.personality ?? []);
  const [background, setBackground] = useState(initial?.background ?? '');
  const [speechStyle, setSpeechStyle] = useState(initial?.speechStyle ?? '');
  const [avatarUrl, setAvatarUrl] = useState(initial?.avatarUrl ?? AVATAR_PRESETS[0].url);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function togglePersonality(trait: string) {
    setPersonality((prev) =>
      prev.includes(trait) ? prev.filter((t) => t !== trait) : [...prev, trait]
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({ name, gender, age, personality, background, speechStyle, avatarUrl });
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失敗，請稍後再試');
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <label className="text-sm text-muted">選擇角色形象</label>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {AVATAR_PRESETS.map((preset) => (
            <button
              type="button"
              key={preset.id}
              onClick={() => setAvatarUrl(preset.url)}
              aria-pressed={avatarUrl === preset.url}
              className={`relative aspect-[4/5] overflow-hidden rounded-xl transition ${
                avatarUrl === preset.url ? 'ring-2 ring-magenta' : 'opacity-70 hover:opacity-100'
              }`}
            >
              <Image src={preset.url} alt={preset.label} fill className="object-cover" unoptimized />
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm text-muted">名字</label>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="neon-ring glass-panel rounded-lg px-3 py-2.5 text-sm outline-none"
          placeholder="林雅"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm text-muted">性別</label>
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            className="neon-ring glass-panel rounded-lg px-3 py-2.5 text-sm outline-none"
          >
            {GENDER_OPTIONS.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm text-muted">年齡</label>
          <input
            type="number"
            min={18}
            max={99}
            value={age}
            onChange={(e) => setAge(e.target.value)}
            className="neon-ring glass-panel rounded-lg px-3 py-2.5 text-sm outline-none"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm text-muted">個性（可複選）</label>
        <div className="flex flex-wrap gap-2">
          {PERSONALITY_OPTIONS.map((trait) => (
            <button
              type="button"
              key={trait}
              onClick={() => togglePersonality(trait)}
              className={`neon-ring rounded-full px-3.5 py-1.5 text-sm transition ${
                personality.includes(trait)
                  ? 'bg-gradient-to-r from-magenta to-violet text-white'
                  : 'glass-panel text-muted'
              }`}
            >
              {trait}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm text-muted">背景故事</label>
        <textarea
          value={background}
          onChange={(e) => setBackground(e.target.value)}
          rows={4}
          className="neon-ring glass-panel rounded-lg px-3 py-2.5 text-sm outline-none"
          placeholder="描述這位角色的故事..."
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm text-muted">說話風格（選填）</label>
        <textarea
          value={speechStyle}
          onChange={(e) => setSpeechStyle(e.target.value)}
          rows={2}
          className="neon-ring glass-panel rounded-lg px-3 py-2.5 text-sm outline-none"
          placeholder="例如：說話總是加上「~」、喜歡用可愛的語助詞、偶爾會裝可愛"
        />
      </div>

      {error && <p className="text-sm text-magenta">{error}</p>}

      <Button type="submit" disabled={submitting}>
        {submitting ? submittingLabel : submitLabel}
      </Button>
    </form>
  );
}
