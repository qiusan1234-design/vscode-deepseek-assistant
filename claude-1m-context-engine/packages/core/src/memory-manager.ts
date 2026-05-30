// ============================================================
// MemoryManager — Persistent knowledge slots across sessions
// ============================================================

import { v4 as uuid } from 'uuid';
import { MemorySlot, MemoryStore } from './types';
import { TokenCounter } from './utils';

export class MemoryManager {
  private store: MemoryStore;
  private maxTokens: number;

  constructor(maxTokens: number) {
    this.maxTokens = maxTokens;
    this.store = {
      id: uuid(),
      slots: [],
      totalTokens: 0,
      maxTokens,
    };
  }

  getStore(): MemoryStore {
    this.evictExpired();
    return this.store;
  }

  add(label: string, content: string, priority: number = 5, ttlMinutes?: number): MemorySlot {
    this.evictExpired();

    const tokenCount = TokenCounter.count(content);

    if (this.store.totalTokens + tokenCount > this.store.maxTokens) {
      this.evictLowestPriority(tokenCount);
    }

    const now = new Date();
    const slot: MemorySlot = {
      id: uuid(),
      label,
      content,
      tokenCount,
      priority,
      ttl: ttlMinutes ? ttlMinutes * 60 * 1000 : null,
      createdAt: now.toISOString(),
      expiresAt: ttlMinutes
        ? new Date(now.getTime() + ttlMinutes * 60 * 1000).toISOString()
        : null,
    };

    this.store.slots.push(slot);
    this.store.totalTokens += tokenCount;

    return slot;
  }

  remove(slotId: string): boolean {
    const idx = this.store.slots.findIndex(s => s.id === slotId);
    if (idx >= 0) {
      this.store.totalTokens -= this.store.slots[idx].tokenCount;
      this.store.slots.splice(idx, 1);
      return true;
    }
    return false;
  }

  clear(): void {
    this.store.slots = [];
    this.store.totalTokens = 0;
  }

  getRelevant(query: string, topK: number = 5): MemorySlot[] {
    this.evictExpired();
    const queryLower = query.toLowerCase();
    return this.store.slots
      .filter(s => s.label.toLowerCase().includes(queryLower) ||
                   s.content.toLowerCase().includes(queryLower))
      .sort((a, b) => b.priority - a.priority)
      .slice(0, topK);
  }

  // ---- Private ----

  private evictExpired(): void {
    const now = new Date();
    this.store.slots = this.store.slots.filter(s => {
      if (s.expiresAt && new Date(s.expiresAt) < now) {
        this.store.totalTokens -= s.tokenCount;
        return false;
      }
      return true;
    });
  }

  private evictLowestPriority(neededTokens: number): void {
    const sorted = [...this.store.slots]
      .sort((a, b) => a.priority - b.priority ||
                     a.createdAt.localeCompare(b.createdAt));

    let freed = 0;
    for (const slot of sorted) {
      if (freed >= neededTokens) break;
      this.remove(slot.id);
      freed += slot.tokenCount;
    }
  }
}
