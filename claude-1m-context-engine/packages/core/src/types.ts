// ============================================================
// claude-1m-context-engine — Core Type Definitions
// ============================================================

export interface DocumentMeta {
  id: string;
  path: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  charCount: number;
  tokenCount: number;
  language: 'zh' | 'en' | 'mixed' | 'other';
  createdAt: string;
  updatedAt: string;
  checksum: string;
  tags: string[];
}

export interface ContextNode {
  id: string;
  parentId: string | null;
  docId: string;
  title: string;
  summary: string;
  tokenCount: number;
  priority: number;
  children: ContextNode[];
  metadata: Record<string, unknown>;
  pinned: boolean;
  lastAccessedAt: string;
}

export interface ContextTree {
  id: string;
  name: string;
  root: ContextNode;
  totalTokens: number;
  maxTokens: number;
  nodeCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface MemorySlot {
  id: string;
  label: string;
  content: string;
  tokenCount: number;
  priority: number;
  ttl: number | null;
  createdAt: string;
  expiresAt: string | null;
}

export interface MemoryStore {
  id: string;
  slots: MemorySlot[];
  totalTokens: number;
  maxTokens: number;
}

export interface QueryRequest {
  query: string;
  contextTreeId?: string;
  maxTokens?: number;
  temperature?: number;
  topK?: number;
  includeSources?: boolean;
  language?: 'zh' | 'en' | 'auto';
  systemPrompt?: string;
  stream?: boolean;
}

export interface QueryResponse {
  answer: string;
  sources: SourceReference[];
  usage: TokenUsage;
  contextTreeId: string;
  latencyMs: number;
}

export interface SourceReference {
  docId: string;
  filename: string;
  snippet: string;
  relevanceScore: number;
  startLine?: number;
  endLine?: number;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens: number;
  totalTokens: number;
}

export interface VectorEntry {
  id: string;
  docId: string;
  content: string;
  embedding: number[];
  metadata: Record<string, unknown>;
}

export interface VectorSearchResult {
  entry: VectorEntry;
  score: number;
}

export interface EngineConfig {
  apiKey: string;
  model?: string;
  maxContextTokens?: number;
  cacheDir?: string;
  vectorCacheDir?: string;
  defaultTemperature?: number;
  maxRetries?: number;
  timeoutMs?: number;
  enablePromptCaching?: boolean;
  enableVectorCache?: boolean;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

export interface IngestOptions {
  filePath: string;
  title?: string;
  tags?: string[];
  language?: 'zh' | 'en' | 'auto';
  priority?: number;
}

export interface IngestResult {
  docMeta: DocumentMeta;
  contextNode: ContextNode;
  tokenUsage: TokenUsage;
}

export const DEFAULT_CONFIG: Partial<EngineConfig> = {
  model: 'claude-sonnet-4-6',
  maxContextTokens: 900000,
  defaultTemperature: 0.3,
  maxRetries: 3,
  timeoutMs: 300000,
  enablePromptCaching: true,
  enableVectorCache: true,
  logLevel: 'info',
};

export const SUPPORTED_FILE_TYPES = [
  '.txt', '.md', '.markdown', '.rst',
  '.json', '.yaml', '.yml', '.toml',
  '.csv', '.tsv',
  '.html', '.htm', '.xml',
  '.py', '.ts', '.js', '.tsx', '.jsx',
  '.java', '.go', '.rs', '.c', '.cpp', '.h',
  '.rb', '.php', '.swift', '.kt',
  '.pdf',
  '.docx',
];
