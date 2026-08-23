'use client';

import { useEffect, useState, useCallback, FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { getCurrentUser } from '@/lib/amplify/auth';
import type { Schema } from '@/amplify/data/resource';
import { dataClient } from '@/lib/amplify/client';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { ButtonLink } from '@/components/ui/ButtonLink';
import { CompanionForm, type CompanionFormValues } from '@/components/companion/CompanionForm';
import { XP_PER_LEVEL } from '@/lib/relationship/xp';

type Companion = Schema['Companion']['type'];
type Memory = Schema['CompanionMemory']['type'];

export default function CompanionDetailPage() {
  const params = useParams<{ companionId: string }>();
  const router = useRouter();
  const companionId = params.companionId;

  const [companion, setCompanion] = useState<Companion | null | undefined>(undefined);
  const [editing, setEditing] = useState(false);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [memoryKey, setMemoryKey] = useState('');
  const [memoryValue, setMemoryValue] = useState('');

  const loadCompanion = useCallback(async () => {
    const result = await dataClient.models.Companion.get({ id: companionId });
    setCompanion(result.data ?? null);
  }, [companionId]);

  const loadMemories = useCallback(async () => {
    const result = await dataClient.models.CompanionMemory.memoriesByCompanion({ companionId });
    setMemories(result.data);
  }, [companionId]);

  useEffect(() => {
    void (async () => {
      await loadCompanion();
      await loadMemories();
    })();
  }, [loadCompanion, loadMemories]);

  async function handleUpdate(values: CompanionFormValues) {
    await dataClient.models.Companion.update({
      id: companionId,
      name: values.name,
      gender: values.gender as 'MALE' | 'FEMALE' | 'NONBINARY',
      age: values.age ? Number(values.age) : undefined,
      personality: values.personality,
      background: values.background,
      speechStyle: values.speechStyle,
      avatarUrl: values.avatarUrl,
    });
    setEditing(false);
    loadCompanion();
  }

  async function handleDelete() {
    if (!confirm('確定要刪除這位伴侶嗎？此動作無法復原。')) return;
    await dataClient.models.Companion.delete({ id: companionId });
    router.push('/companions');
  }

  async function handleAddMemory(e: FormEvent) {
    e.preventDefault();
    if (!memoryKey.trim() || !memoryValue.trim()) return;
    const { userId } = await getCurrentUser();
    await dataClient.models.CompanionMemory.create({
      companionId,
      userId,
      key: memoryKey.trim(),
      value: memoryValue.trim(),
      source: 'MANUAL',
    });
    setMemoryKey('');
    setMemoryValue('');
    loadMemories();
  }

  async function handleDeleteMemory(id: string) {
    await dataClient.models.CompanionMemory.delete({ id });
    loadMemories();
  }

  if (companion === undefined) {
    return <p className="p-10 text-sm text-muted">讀取中...</p>;
  }
  if (companion === null) {
    return <p className="p-10 text-sm text-muted">找不到這位伴侶。</p>;
  }

  const xp = companion.relationshipXp ?? 0;
  const level = companion.relationshipLevel ?? 1;
  const xpIntoLevel = xp % XP_PER_LEVEL;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-6 md:p-10">
      <div className="grid gap-6 md:grid-cols-[220px_1fr]">
        <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-gradient-to-br from-surface-raised to-violet/30">
          {companion.avatarUrl ? (
            <Image src={companion.avatarUrl} alt={companion.name} fill className="object-cover" unoptimized />
          ) : (
            <div className="flex h-full items-center justify-center text-5xl font-bold text-white/20">
              {companion.name.slice(0, 1)}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-semibold">{companion.name}</h1>
              <p className="text-sm text-muted">
                {(companion.personality ?? []).filter(Boolean).join('・') || '尚未設定個性'}
              </p>
            </div>
            <ButtonLink data-testid="start-chat" href={`/chat/${companion.id}`}>
              開始聊天
            </ButtonLink>
          </div>

          <div>
            <div className="mb-1 flex justify-between text-xs text-muted">
              <span>親密度 Lv.{level}</span>
              <span>{xpIntoLevel}/{XP_PER_LEVEL} XP</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full bg-gradient-to-r from-magenta to-violet"
                style={{ width: `${(xpIntoLevel / XP_PER_LEVEL) * 100}%` }}
              />
            </div>
          </div>

          <p className="whitespace-pre-wrap text-sm text-muted">
            {companion.background || '尚未設定背景故事。'}
          </p>

          <div className="mt-auto flex gap-2">
            <Button variant="secondary" onClick={() => setEditing((v) => !v)}>
              {editing ? '取消編輯' : '編輯資料'}
            </Button>
            <Button variant="ghost" onClick={handleDelete}>
              刪除
            </Button>
          </div>
        </div>
      </div>

      {editing && (
        <GlassCard>
          <CompanionForm
            initial={{
              name: companion.name,
              gender: companion.gender ?? undefined,
              age: companion.age?.toString() ?? '',
              personality: (companion.personality ?? []).filter((p): p is string => Boolean(p)),
              background: companion.background ?? '',
              speechStyle: companion.speechStyle ?? '',
              avatarUrl: companion.avatarUrl ?? undefined,
            }}
            submitLabel="儲存變更"
            submittingLabel="儲存中..."
            onSubmit={handleUpdate}
          />
        </GlassCard>
      )}

      <GlassCard>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">記憶</h2>
        {memories.length === 0 ? (
          <p className="mb-4 text-sm text-muted">還沒有記憶紀錄。</p>
        ) : (
          <ul className="mb-4 flex flex-col gap-2">
            {memories.map((memory) => (
              <li
                key={memory.id}
                className="flex items-center justify-between gap-3 rounded-lg glass-panel px-3 py-2 text-sm"
              >
                <span>
                  <span className="text-muted">{memory.key}：</span>
                  {memory.value}
                </span>
                <button
                  onClick={() => handleDeleteMemory(memory.id)}
                  className="text-xs text-muted hover:text-magenta"
                >
                  刪除
                </button>
              </li>
            ))}
          </ul>
        )}
        <form onSubmit={handleAddMemory} className="flex flex-col gap-2 sm:flex-row">
          <input
            value={memoryKey}
            onChange={(e) => setMemoryKey(e.target.value)}
            placeholder="例如：居住地"
            className="neon-ring glass-panel flex-1 rounded-lg px-3 py-2 text-sm outline-none"
          />
          <input
            value={memoryValue}
            onChange={(e) => setMemoryValue(e.target.value)}
            placeholder="例如：台北"
            className="neon-ring glass-panel flex-1 rounded-lg px-3 py-2 text-sm outline-none"
          />
          <Button type="submit" variant="secondary">
            新增
          </Button>
        </form>
      </GlassCard>
    </div>
  );
}
