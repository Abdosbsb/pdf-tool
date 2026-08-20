let idCounter = 0;

interface CachedFile {
  file: File;
  expiresAt: number;
}

const cache = new Map<string, CachedFile>();

const TTL_MS = 10 * 60 * 1000;

export function cacheFile(file: File): string {
  cleanup();
  const key = `file_${Date.now()}_${++idCounter}`;
  cache.set(key, { file, expiresAt: Date.now() + TTL_MS });
  return key;
}

export function getCachedFile(key: string): File | null {
  cleanup();
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.file;
}

export function removeCachedFile(key: string): void {
  cache.delete(key);
}

function cleanup(): void {
  const now = Date.now();
  for (const [key, entry] of cache) {
    if (now > entry.expiresAt) cache.delete(key);
  }
}
