// ============================================================
// DocumentLoader — Whole-document reader (no chunking)
// ============================================================

import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuid } from 'uuid';
import * as crypto from 'crypto';
import { DocumentMeta, SUPPORTED_FILE_TYPES } from './types';

export class DocumentLoader {
  private maxFileSize: number = 100 * 1024 * 1024; // 100MB

  async load(filePath: string, title?: string, tags: string[] = []): Promise<DocumentMeta> {
    const absPath = path.resolve(filePath);

    if (!fs.existsSync(absPath)) {
      throw new Error(`File not found: ${absPath}`);
    }

    const stat = fs.statSync(absPath);
    if (stat.size > this.maxFileSize) {
      throw new Error(`File too large: ${stat.size} bytes (max ${this.maxFileSize})`);
    }

    const ext = path.extname(absPath).toLowerCase();
    if (!SUPPORTED_FILE_TYPES.includes(ext) && ext !== '') {
      // Allow unknown types but log warning
    }

    const content = await this.readContent(absPath);
    const checksum = crypto.createHash('sha256').update(content).digest('hex');
    const filename = path.basename(absPath);

    return {
      id: uuid(),
      path: absPath,
      filename,
      mimeType: this.guessMimeType(ext),
      sizeBytes: stat.size,
      charCount: content.length,
      tokenCount: 0, // set by engine
      language: this.detectLanguage(content),
      createdAt: stat.birthtime.toISOString(),
      updatedAt: stat.mtime.toISOString(),
      checksum,
      tags,
    };
  }

  async readContent(filePath: string): Promise<string> {
    const ext = path.extname(filePath).toLowerCase();

    switch (ext) {
      case '.pdf':
        return this.readPdf(filePath);
      case '.docx':
        return this.readDocx(filePath);
      default:
        // Text-based: auto-detect encoding for Chinese support
        return this.readTextFile(filePath);
    }
  }

  async scanDirectory(dirPath: string): Promise<string[]> {
    const absPath = path.resolve(dirPath);
    if (!fs.statSync(absPath).isDirectory()) {
      throw new Error(`Not a directory: ${absPath}`);
    }

    const results: string[] = [];
    const walk = (dir: string) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
            walk(fullPath);
          }
        } else {
          const ext = path.extname(entry.name).toLowerCase();
          if (SUPPORTED_FILE_TYPES.includes(ext)) {
            results.push(fullPath);
          }
        }
      }
    };

    walk(absPath);
    return results;
  }

  // ---- Private Helpers ----

  private readTextFile(filePath: string): string {
    // Try UTF-8 first, then GBK for Chinese documents
    try {
      return fs.readFileSync(filePath, 'utf-8');
    } catch {
      // Fallback: read as buffer and decode
      const buf = fs.readFileSync(filePath);
      // Try GBK/GB2312 detection
      if (this.looksLikeGBK(buf)) {
        const iconv = require('iconv-lite');
        return iconv.decode(buf, 'gbk');
      }
      return buf.toString('utf-8');
    }
  }

  private async readPdf(filePath: string): Promise<string> {
    try {
      const pdfParse = require('pdf-parse');
      const buf = fs.readFileSync(filePath);
      const data = await pdfParse(buf);
      return data.text;
    } catch {
      return `[PDF binary: ${path.basename(filePath)}]`;
    }
  }

  private async readDocx(filePath: string): Promise<string> {
    try {
      const mammoth = require('mammoth');
      const buf = fs.readFileSync(filePath);
      const result = await mammoth.extractRawText({ buffer: buf });
      return result.value;
    } catch {
      return `[DOCX binary: ${path.basename(filePath)}]`;
    }
  }

  private guessMimeType(ext: string): string {
    const map: Record<string, string> = {
      '.txt': 'text/plain',
      '.md': 'text/markdown',
      '.json': 'application/json',
      '.yaml': 'text/yaml',
      '.yml': 'text/yaml',
      '.csv': 'text/csv',
      '.html': 'text/html',
      '.py': 'text/x-python',
      '.ts': 'text/typescript',
      '.js': 'text/javascript',
      '.pdf': 'application/pdf',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };
    return map[ext] || 'application/octet-stream';
  }

  private detectLanguage(content: string): 'zh' | 'en' | 'mixed' | 'other' {
    const sample = content.slice(0, 10000);
    let cjk = 0;
    let latin = 0;
    for (const ch of sample) {
      const code = ch.charCodeAt(0);
      if ((code >= 0x4E00 && code <= 0x9FFF) ||
          (code >= 0x3400 && code <= 0x4DBF) ||
          (code >= 0xF900 && code <= 0xFAFF)) {
        cjk++;
      } else if ((code >= 0x41 && code <= 0x5A) || (code >= 0x61 && code <= 0x7A)) {
        latin++;
      }
    }
    const total = cjk + latin || 1;
    const cjkRatio = cjk / total;
    if (cjkRatio > 0.6) return 'zh';
    if (cjkRatio < 0.2) return 'en';
    if (cjkRatio >= 0.2 && cjkRatio <= 0.6) return 'mixed';
    return 'other';
  }

  private looksLikeGBK(buf: Buffer): boolean {
    // Simple heuristic: check if high bytes are common in GBK range
    let gbkBytes = 0;
    for (let i = 0; i < Math.min(buf.length, 1000); i++) {
      if (buf[i] >= 0x81 && buf[i] <= 0xFE) gbkBytes++;
    }
    return gbkBytes > buf.length * 0.05;
  }
}
