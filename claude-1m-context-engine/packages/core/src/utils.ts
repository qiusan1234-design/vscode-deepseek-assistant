// ============================================================
// TokenCounter & Utilities
// ============================================================

let tiktokenModule: typeof import('tiktoken') | null = null;

function getTiktoken() {
  if (!tiktokenModule) {
    try {
      tiktokenModule = require('tiktoken');
    } catch {
      tiktokenModule = null;
    }
  }
  return tiktokenModule;
}

export class TokenCounter {
  private static encoder: any = null;

  static count(text: string): number {
    const tiktoken = getTiktoken();
    if (tiktoken) {
      try {
        if (!this.encoder) {
          // cl100k_base is used by Claude
          this.encoder = tiktoken.get_encoding('cl100k_base');
        }
        return this.encoder.encode(text).length;
      } catch {
        // fallback
      }
    }
    return this.estimate(text);
  }

  static estimate(text: string): number {
    // Rough estimate: ~4 chars per token for English, ~1.5 for Chinese
    let cjk = 0;
    let other = 0;
    for (const ch of text) {
      const code = ch.charCodeAt(0);
      if (code >= 0x4E00 && code <= 0x9FFF) cjk++;
      else if (code > 127) other++;
      else other++;
    }
    return Math.ceil(cjk / 1.3 + other / 3.5);
  }

  static truncate(text: string, maxTokens: number): string {
    const total = this.count(text);
    if (total <= maxTokens) return text;

    // Binary search for truncation point
    let lo = 0;
    let hi = text.length;
    while (lo < hi) {
      const mid = Math.floor((lo + hi + 1) / 2);
      if (this.count(text.slice(0, mid)) <= maxTokens) {
        lo = mid;
      } else {
        hi = mid - 1;
      }
    }
    return text.slice(0, lo) + '\n\n[Content truncated due to token limit]';
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

export function formatTokens(tokens: number): string {
  if (tokens < 1000) return `${tokens}`;
  if (tokens < 1000000) return `${(tokens / 1000).toFixed(1)}K`;
  return `${(tokens / 1000000).toFixed(1)}M`;
}

export function extractCodeBlocks(text: string): Array<{ language: string; code: string }> {
  const regex = /```(\w*)\n([\s\S]*?)```/g;
  const results: Array<{ language: string; code: string }> = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    results.push({ language: match[1] || '', code: match[2].trim() });
  }
  return results;
}
