'use client';

import { useEffect, useState } from 'react';
import { dataClient } from './client';

const cache = new Map<string, string>();

/** Resolves a private S3 key to a short-lived presigned URL via the
 * createDownloadUrl query. Returns undefined while loading or if no key. */
export function useAssetUrl(key: string | null | undefined): string | undefined {
  const [resolvedKey, setResolvedKey] = useState(key);
  const [url, setUrl] = useState<string | undefined>(key ? cache.get(key) : undefined);

  // Reset synchronously during render when `key` changes, rather than in an
  // effect - avoids an extra render pass just to mirror a prop into state.
  if (resolvedKey !== key) {
    setResolvedKey(key);
    setUrl(key ? cache.get(key) : undefined);
  }

  useEffect(() => {
    if (!key || cache.has(key)) return;
    let cancelled = false;
    (async () => {
      const result = await dataClient.queries.createDownloadUrl({ key });
      if (!cancelled && result.data?.url) {
        cache.set(key, result.data.url);
        setUrl(result.data.url);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [key]);

  return url;
}
