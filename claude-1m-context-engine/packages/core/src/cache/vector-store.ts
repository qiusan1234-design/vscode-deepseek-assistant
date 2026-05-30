// ============================================================
// VectorCache — Local vector embedding store (no external DB)
// ============================================================

import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuid } from 'uuid';
import { VectorEntry, VectorSearchResult } from '../types';

export class VectorCache {
  private dir: string;
  private entries: VectorEntry[] = [];
  private dirty: boolean = false;
  private saveTimer: ReturnType<typeof setInterval> | null = null;

  constructor(cacheDir?: string) {
    this.dir = cacheDir || path.join(process.cwd(), '.cache', 'vector-cache');
  }

  async initialize(): Promise<void> {
    fs.mkdirSync(this.dir, { recursive: true });
    const indexPath = path.join(this.dir, 'index.json');
    if (fs.existsSync(indexPath)) {
      try {
        const data = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
        this.entries = data.entries || [];
      } catch {
        this.entries = [];
      }
    }
    // Auto-save every 30 seconds if dirty
    this.saveTimer = setInterval(() => this.flushIfDirty(), 30000);
  }

  async search(query: string, topK: number = 10): Promise<VectorSearchResult[]> {
    const queryEmbedding = this.simpleEmbed(query);
    const scored = this.entries.map(entry => ({
      entry,
      score: this.cosineSimilarity(queryEmbedding, entry.embedding),
    }));
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK);
  }

  async indexDocument(docId: string, content: string): Promise<void> {
    // Simple sliding-window embedding for large docs
    const chunks = this.slideWindow(content, 2048, 512);

    for (const chunk of chunks) {
      const embedding = this.simpleEmbed(chunk.text);
      this.entries.push({
        id: uuid(),
        docId,
        content: chunk.text,
        embedding,
        metadata: { start: chunk.start, end: chunk.end },
      });
    }

    this.dirty = true;
  }

  async count(): Promise<number> {
    return this.entries.length;
  }

  async close(): Promise<void> {
    if (this.saveTimer) clearInterval(this.saveTimer);
    await this.flush();
  }

  // ---- Private ----

  private simpleEmbed(text: string): number[] {
    // Lightweight TF-IDF-like embedding for local caching
    // In production, use a proper embedding model or API
    const tokens = this.tokenize(text.toLowerCase());
    const tf: Map<string, number> = new Map();
    for (const t of tokens) {
      tf.set(t, (tf.get(t) || 0) + 1);
    }
    // Build sparse representation mapped to fixed 256-dim vector
    const dim = 256;
    const vec = new Array(dim).fill(0);
    let i = 0;
    for (const [token, count] of tf) {
      const hash = this.hashString(token);
      vec[hash % dim] += count / tokens.length;
      i++;
    }
    // L2 normalize
    const mag = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
    return vec.map(v => v / mag);
  }

  private tokenize(text: string): string[] {
    // Simple tokenizer: split on non-alphanumeric, keep CJK chars separate
    const tokens: string[] = [];
    let current = '';
    for (const ch of text) {
      const isCJK = ch.charCodeAt(0) >= 0x4E00 && ch.charCodeAt(0) <= 0x9FFF;
      const isAlphaNum = /[a-zA-Z0-9]/.test(ch);
      if (isCJK) {
        if (current) tokens.push(current);
        tokens.push(ch);
        current = '';
      } else if (isAlphaNum) {
        current += ch;
      } else {
        if (current) tokens.push(current);
        current = '';
      }
    }
    if (current) tokens.push(current);
    return tokens.filter(t => t.length > 1 || /[一-鿿]/.test(t));
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0;
    let magA = 0;
    let magB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      magA += a[i] * a[i];
      magB += b[i] * b[i];
    }
    const denom = Math.sqrt(magA) * Math.sqrt(magB);
    return denom === 0 ? 0 : dot / denom;
  }

  private hashString(s: string): number {
    let hash = 0;
    for (let i = 0; i < s.length; i++) {
      const ch = s.charCodeAt(i);
      hash = ((hash << 5) - hash) + ch;
      hash |= 0;
    }
    return Math.abs(hash);
  }

  private slideWindow(content: string, windowSize: number, stride: number): Array<{ text: string; start: number; end: number }> {
    const chunks: Array<{ text: string; start: number; end: number }> = [];
    let start = 0;
    while (start < content.length) {
      const end = Math.min(start + windowSize, content.length);
      chunks.push({ text: content.slice(start, end), start, end });
      start += stride;
    }
    return chunks;
  }

  private flushIfDirty(): void {
    if (this.dirty) {
      this.flush();
    }
  }

  private async flush(): Promise<void> {
    const indexPath = path.join(this.dir, 'index.json');
    fs.writeFileSync(indexPath, JSON.stringify({ entries: this.entries }, null, 2));
    this.dirty = false;
  }
}
