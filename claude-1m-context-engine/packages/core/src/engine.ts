// ============================================================
// Claude1MContextEngine — Main Engine
// Zero-chunk, full-document context management for Claude API
// ============================================================

import Anthropic from '@anthropic-ai/sdk';
import type { MessageParam, TextBlockParam } from '@anthropic-ai/sdk/resources/messages';
import {
  EngineConfig, DEFAULT_CONFIG, QueryRequest, QueryResponse,
  ContextTree, ContextNode, DocumentMeta, TokenUsage,
  MemoryStore, SourceReference,
} from './types';
import { DocumentLoader } from './document-loader';
import { ContextTreeManager } from './context-tree';
import { MemoryManager } from './memory-manager';
import { VectorCache } from './cache/vector-store';
import { LocalCache } from './cache/local-cache';
import { TokenCounter } from './utils';

export class Claude1MContextEngine {
  private client: Anthropic;
  private config: Required<EngineConfig>;
  private docLoader: DocumentLoader;
  private treeManager: ContextTreeManager;
  private memoryMgr: MemoryManager;
  private vectorCache: VectorCache;
  private localCache: LocalCache;
  private initialized: boolean = false;

  constructor(config: EngineConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config } as Required<EngineConfig>;
    this.client = new Anthropic({ apiKey: this.config.apiKey });
    this.docLoader = new DocumentLoader();
    this.treeManager = new ContextTreeManager(this.config.maxContextTokens);
    this.memoryMgr = new MemoryManager(this.config.maxContextTokens);
    this.vectorCache = new VectorCache(this.config.vectorCacheDir);
    this.localCache = new LocalCache(this.config.cacheDir);
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    await this.vectorCache.initialize();
    await this.localCache.initialize();
    this.initialized = true;
  }

  // ---- Document Ingestion ----

  async ingestFile(filePath: string, title?: string, tags: string[] = []): Promise<DocumentMeta> {
    this.ensureInit();
    const docMeta = await this.docLoader.load(filePath, title, tags);

    const cached = this.localCache.get(docMeta.checksum);
    if (cached) return cached as DocumentMeta;

    const content = await this.docLoader.readContent(filePath);
    docMeta.tokenCount = TokenCounter.count(content);
    docMeta.charCount = content.length;

    if (docMeta.tokenCount > this.config.maxContextTokens * 0.9) {
      await this.vectorCache.indexDocument(docMeta.id, content);
    }

    this.localCache.set(docMeta.checksum, docMeta);
    return docMeta;
  }

  async ingestDirectory(dirPath: string): Promise<DocumentMeta[]> {
    const results: DocumentMeta[] = [];
    const files = await this.docLoader.scanDirectory(dirPath);
    for (const file of files) {
      results.push(await this.ingestFile(file));
    }
    return results;
  }

  // ---- Context Tree Operations ----

  createContextTree(name: string): ContextTree {
    this.ensureInit();
    return this.treeManager.create(name);
  }

  addToTree(treeId: string, docMeta: DocumentMeta, parentId?: string): ContextNode {
    this.ensureInit();
    return this.treeManager.addNode(treeId, docMeta, parentId);
  }

  getContextTree(treeId: string): ContextTree | null {
    return this.treeManager.get(treeId);
  }

  listContextTrees(): ContextTree[] {
    return this.treeManager.list();
  }

  removeFromTree(treeId: string, nodeId: string): void {
    this.treeManager.removeNode(treeId, nodeId);
  }

  pinNode(treeId: string, nodeId: string): void {
    this.treeManager.pinNode(treeId, nodeId);
  }

  // ---- Query ----

  async query(req: QueryRequest): Promise<QueryResponse> {
    this.ensureInit();
    const startTime = Date.now();

    const tree = req.contextTreeId
      ? this.treeManager.get(req.contextTreeId)
      : null;

    const systemPrompt = this.buildSystemPrompt(req, tree);

    const messages = await this.buildMessages(req, tree);

    try {
      const response = await this.client.messages.create({
        model: this.config.model,
        max_tokens: req.maxTokens || 4096,
        temperature: req.temperature ?? this.config.defaultTemperature,
        system: systemPrompt,
        messages,
      });

      const textContent = response.content
        .filter((b): b is TextBlockParam => b.type === 'text')
        .map(b => b.text)
        .join('\n');

      const usage: TokenUsage = {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        cachedInputTokens: (response.usage as { cache_read_input_tokens?: number }).cache_read_input_tokens || 0,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
      };

      return {
        answer: textContent,
        sources: this.extractSources(textContent, tree),
        usage,
        contextTreeId: tree?.id || '',
        latencyMs: Date.now() - startTime,
      };
    } catch (err) {
      throw new Error(`Claude API error: ${(err as Error).message}`);
    }
  }

  async *queryStream(req: QueryRequest): AsyncGenerator<string, void, unknown> {
    this.ensureInit();
    const tree = req.contextTreeId ? this.treeManager.get(req.contextTreeId) : null;
    const systemPrompt = this.buildSystemPrompt(req, tree);
    const messages = await this.buildMessages(req, tree);

    const stream = this.client.messages.stream({
      model: this.config.model,
      max_tokens: req.maxTokens || 4096,
      temperature: req.temperature ?? this.config.defaultTemperature,
      system: systemPrompt,
      messages,
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        yield event.delta.text;
      }
    }
  }

  // ---- Memory Operations ----

  getMemoryStore(): MemoryStore {
    return this.memoryMgr.getStore();
  }

  addMemory(label: string, content: string, priority: number = 5, ttlMinutes?: number): void {
    this.memoryMgr.add(label, content, priority, ttlMinutes);
  }

  removeMemory(slotId: string): void {
    this.memoryMgr.remove(slotId);
  }

  clearMemory(): void {
    this.memoryMgr.clear();
  }

  // ---- Vector Cache ----

  async searchSimilar(query: string, topK: number = 10) {
    return this.vectorCache.search(query, topK);
  }

  async getCacheStats() {
    return {
      vectorEntries: await this.vectorCache.count(),
      localEntries: this.localCache.size(),
      contextTrees: this.treeManager.list().length,
      memorySlots: this.memoryMgr.getStore().slots.length,
    };
  }

  // ---- Internal Helpers ----

  private ensureInit(): void {
    if (!this.initialized) throw new Error('Engine not initialized. Call initialize() first.');
  }

  private buildSystemPrompt(req: QueryRequest, tree?: ContextTree | null): string {
    const parts: string[] = [];

    if (req.systemPrompt) {
      parts.push(req.systemPrompt);
    } else {
      parts.push(
        'You are a precise, expert-level knowledge base assistant.',
        'Read and reason over the ENTIRE provided document context — do not skim.',
        'For Chinese documents, respond in Chinese. For English documents, respond in English.',
        'Cite specific sections when answering. Be concise but thorough.',
      );
    }

    if (tree) {
      const flatNodes = this.flattenTree(tree.root);
      const treeContext = flatNodes
        .map(n => `[${n.id}] ${n.title}: ${n.summary}`)
        .join('\n');
      parts.push(`\n<context_tree>\n${treeContext}\n</context_tree>`);
    }

    if (this.config.enablePromptCaching) {
      // Mark system prompt as cacheable by placing it in a cache_control block
    }

    return parts.join('\n\n');
  }

  private async buildMessages(
    req: QueryRequest,
    tree?: ContextTree | null,
  ): Promise<MessageParam[]> {
    const messages: MessageParam[] = [];

    if (tree) {
      const flatNodes = this.flattenTree(tree.root);
      let docContext = '';
      for (const node of flatNodes) {
        const doc = this.localCache.get(node.docId);
        if (doc) {
          docContext += `\n--- Document: ${node.title} ---\n${(doc as { content: string }).content}\n`;
        }
      }
      if (docContext) {
        messages.push({
          role: 'user',
          content: `Here is the full document context for reference:\n${docContext}\n\nQuestion: ${req.query}`,
        });
      }
    }

    if (messages.length === 0) {
      messages.push({ role: 'user', content: req.query });
    }

    return messages;
  }

  private flattenTree(node: ContextNode): ContextNode[] {
    const result: ContextNode[] = [node];
    for (const child of node.children) {
      result.push(...this.flattenTree(child));
    }
    return result;
  }

  private extractSources(answer: string, tree?: ContextTree | null): SourceReference[] {
    if (!tree) return [];
    const flat = this.flattenTree(tree.root);
    return flat.map(n => ({
      docId: n.docId,
      filename: n.title,
      snippet: n.summary,
      relevanceScore: n.priority / 10,
    }));
  }

  async shutdown(): Promise<void> {
    await this.vectorCache.close();
    this.localCache.close();
  }
}
