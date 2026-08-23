import { GlassCard } from '@/components/ui/GlassCard';
import { SoonBadge } from '@/components/ui/SoonBadge';

export default function TheaterPage() {
  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4 p-6 md:p-10">
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-semibold">劇場</h1>
        <SoonBadge />
      </div>
      <GlassCard>
        <p className="text-sm text-muted">
          互動劇場（分支故事、場景與選擇）即將推出。目前你可以先建立角色並開始聊天。
        </p>
      </GlassCard>
    </div>
  );
}
