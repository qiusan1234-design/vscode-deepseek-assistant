// ============================================================
// @claude-1m/core — Public API
// ============================================================

export { Claude1MContextEngine } from './engine';
export { ContextTreeManager } from './context-tree';
export { DocumentLoader } from './document-loader';
export { MemoryManager } from './memory-manager';
export { VectorCache } from './cache/vector-store';
export { LocalCache } from './cache/local-cache';
export { TokenCounter, formatBytes, formatTokens, sleep, extractCodeBlocks } from './utils';

export type {
  EngineConfig,
  DocumentMeta,
  ContextNode,
  ContextTree,
  MemorySlot,
  MemoryStore,
  QueryRequest,
  QueryResponse,
  SourceReference,
  TokenUsage,
  VectorEntry,
  VectorSearchResult,
  IngestOptions,
  IngestResult,
} from './types';

export { DEFAULT_CONFIG, SUPPORTED_FILE_TYPES } from './types';
