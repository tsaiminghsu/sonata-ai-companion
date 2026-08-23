'use client';

import { useEffect, useState } from 'react';
import { getCurrentUser } from '@/lib/amplify/auth';
import type { Schema } from '@/amplify/data/resource';
import { dataClient } from '@/lib/amplify/client';
import { AssetCard } from '@/components/assets/AssetCard';

type Asset = Schema['Asset']['type'];

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[] | null>(null);

  useEffect(() => {
    (async () => {
      const { userId } = await getCurrentUser();
      const result = await dataClient.models.Asset.assetsByUser({ userId }, { sortDirection: 'DESC' });
      setAssets(result.data);
    })();
  }, []);

  async function handleDelete(id: string) {
    await dataClient.models.Asset.delete({ id });
    setAssets((prev) => (prev ? prev.filter((a) => a.id !== id) : prev));
  }

  return (
    <div className="flex flex-col gap-6 p-6 md:p-10">
      <h1 className="text-xl font-semibold">我的資產</h1>

      {assets === null ? (
        <p className="text-sm text-muted">讀取中...</p>
      ) : assets.length === 0 ? (
        <div className="glass-card flex flex-col items-center gap-2 p-10 text-center">
          <p className="text-muted">還沒有資產</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {assets.map((asset) => (
            <AssetCard key={asset.id} asset={asset} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}
