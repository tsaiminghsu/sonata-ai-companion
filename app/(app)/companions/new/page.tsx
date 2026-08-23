'use client';

import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/amplify/auth';
import { dataClient } from '@/lib/amplify/client';
import { GlassCard } from '@/components/ui/GlassCard';
import { CompanionForm, type CompanionFormValues } from '@/components/companion/CompanionForm';

export default function NewCompanionPage() {
  const router = useRouter();

  async function handleSubmit(values: CompanionFormValues) {
    const { userId } = await getCurrentUser();

    const created = await dataClient.models.Companion.create({
      userId,
      name: values.name,
      gender: values.gender as 'MALE' | 'FEMALE' | 'NONBINARY',
      age: values.age ? Number(values.age) : undefined,
      personality: values.personality,
      background: values.background,
      speechStyle: values.speechStyle,
      avatarUrl: values.avatarUrl,
      relationshipLevel: 1,
      relationshipXp: 0,
    });
    if (created.errors?.length || !created.data) {
      throw new Error(created.errors?.[0]?.message ?? '建立失敗');
    }

    router.push(`/companions/${created.data.id}`);
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 p-6 md:p-10">
      <h1 className="text-xl font-semibold">建立伴侶</h1>
      <GlassCard>
        <CompanionForm
          submitLabel="建立伴侶"
          submittingLabel="建立中..."
          onSubmit={handleSubmit}
        />
      </GlassCard>
    </div>
  );
}
