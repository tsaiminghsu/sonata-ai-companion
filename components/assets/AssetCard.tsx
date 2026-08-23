'use client';

import Image from 'next/image';
import type { Schema } from '@/amplify/data/resource';
import { useAssetUrl } from '@/lib/amplify/useAssetUrl';

type Asset = Schema['Asset']['type'];

export function AssetCard({ asset, onDelete }: { asset: Asset; onDelete: (id: string) => void }) {
  const url = useAssetUrl(asset.s3Key);

  return (
    <div data-testid="asset-card" className="glass-card group relative overflow-hidden">
      <div className="relative aspect-square w-full bg-surface-raised">
        {url && <Image src={url} alt={asset.prompt ?? asset.type ?? 'asset'} fill className="object-cover" unoptimized />}
      </div>
      <div className="flex items-center justify-between p-2">
        <span className="truncate text-xs text-muted">{asset.type}</span>
        <button
          onClick={() => onDelete(asset.id)}
          className="text-xs text-muted opacity-0 transition group-hover:opacity-100 hover:text-magenta"
        >
          刪除
        </button>
      </div>
    </div>
  );
}
