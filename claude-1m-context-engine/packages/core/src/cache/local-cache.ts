// ============================================================
// LocalCache — File-system metadata and content cache
// ============================================================

import * as fs from 'fs';
import * as path from 'path';

interface CacheEntry {
  key: string;
  value: unknown;
  createdAt: number;
  lastAccessedAt: number;
}

export class LocalCache {
  private dir: string;
  private store: Map<string, CacheEntry> = new Map();
  private maxEntries: number = 10000;
  private initialized: boolean = false;

  constructor(cacheDir?: string) {
    this.dir = cacheDir || path.join(process.cwd(), '.cache', 'local');
  }

  async initialize(): Promise<void> {
    fs.mkdirSync(this.dir, { recursive: true });
    const dataPath = path.join(this.dir, 'cache.json');

    if (fs.existsSync(dataPath)) {
      try {
        const raw = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
        if (Array.isArray(raw)) {
          for (const entry of raw) {
            this.store.set(entry.key, entry);
          }
        }
      } catch {
        // Start fresh
      }
    }

    this.initialized = true;
  }

  get(key: string): unknown | null {
    const entry = this.store.get(key);
    if (entry) {
      entry.lastAccessedAt = Date.now();
      return entry.value;
    }
    return null;
  }

  set(key: string, value: unknown): void {
    if (this.store.size >= this.maxEntries) {
      this.evictOldest();
    }
    const now = Date.now();
    this.store.set(key, { key, value, createdAt: now, lastAccessedAt: now });
    this.persistAsync();
  }

  has(key: string): boolean {
    return this.store.has(key);
  }

  delete(key: string): boolean {
    const result = this.store.delete(key);
    if (result) this.persistAsync();
    return result;
  }

  size(): number {
    return this.store.size;
  }

  close(): void {
    this.persistSync();
  }

  // ---- Private ----

  private evictOldest(): void {
    let oldest: { key: string; time: number } | null = null;
    for (const [key, entry] of this.store) {
      if (!oldest || entry.lastAccessedAt < oldest.time) {
        oldest = { key, time: entry.lastAccessedAt };
      }
    }
    if (oldest) this.store.delete(oldest.key);
  }

  private persistAsync(): void {
    setTimeout(() => this.persistSync(), 100);
  }

  private persistSync(): void {
    if (!this.initialized) return;
    const dataPath = path.join(this.dir, 'cache.json');
    const data = Array.from(this.store.values());
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
  }
}
