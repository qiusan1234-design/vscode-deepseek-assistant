# Architecture Design

## Overview

Claude 1M Context Engine is a monorepo with four packages:

```
packages/
├── core/      # Engine core — document loading, context trees, vector cache
├── server/    # Express-based REST + WebSocket API server
├── cli/         # Commander-based CLI tool
└── vscode/    # VSCode extension with sidebar tree view
```

## Design Philosophy

### Zero-Chunk Principle

Traditional RAG pipelines split documents into chunks (~500 tokens) for embedding and retrieval. With Claude's 1M token context, we can load entire documents and let the model reason over the complete text. This eliminates:

- Chunk boundary ambiguity
- Lost cross-references between sections
- Hallucinated stitching from partial retrievals
- Complex embedding and re-ranking pipelines

### Context Memory Tree

Documents are organized in a hierarchical tree structure:

```
Root
├── Project A
│   ├── requirements.md (50K tokens)
│   ├── architecture.md (30K tokens)
│   └── api-spec.yaml (10K tokens)
├── Project B
│   └── design-doc.md (80K tokens)
└── Reference
    ├── paper.pdf (200K tokens)
    └── book.md (500K tokens)
```

The tree manager tracks total token usage and evicts low-priority nodes when approaching the 900K token limit (90% of 1M). Pinned nodes are preserved.

### Memory Manager

Persistent key-value slots for cross-session knowledge:

```typescript
engine.addMemory(
  'Project X conventions',
  'Use functional components, avoid classes, prefer async/await',
  7,  // priority (1-10)
  480 // TTL in minutes (8 hours)
);
```

Expired slots are automatically cleaned. Low-priority slots are evicted first when the memory store is full.

### Local Vector Cache

A lightweight TF-IDF + cosine similarity cache for document retrieval and similarity search. No external vector database required. Embeddings are 256-dimensional vectors stored in a local JSON file.

This is intentionally simple — the primary retrieval mechanism is the context tree itself. Vector search is a fallback for discovering relevant documents before adding them to a tree.

### Prompt Caching

The engine marks large document context blocks with Claude's prompt caching mechanism. When the same document context is used across multiple queries, cached tokens cost 90% less. The cache TTL is 5 minutes, after which tokens are re-read at full price.

## Data Flow

```
User Query
    │
    ▼
┌──────────────┐     ┌──────────────────┐
│ Context Tree │────▶│ System Prompt    │
│ (flatten)    │     │ + Tree Structure │
└──────────────┘     └──────────────────┘
                              │
┌──────────────┐              │
│ Doc Content  │──────────────┤
│ (from cache) │              │
└──────────────┘              ▼
                     ┌──────────────────┐
                     │ Claude API Call  │
                     │ (1M context max) │
                     └──────────────────┘
                              │
                              ▼
                     ┌──────────────────┐
                     │ Response +       │
                     │ Source Citations │
                     └──────────────────┘
```

## Security Model

The server is designed for **local-only** deployment:

- `127.0.0.1` binding by default
- Localhost and LAN IPs auto-allowed when no token is set
- Optional `LOCAL_API_TOKEN` for authenticated access
- Helmet security headers
- Rate limiting on API endpoints (Express rate-limit)

## Token Budget

| Component | Allocation | Notes |
|-----------|-----------|-------|
| Claude max context | 1,000,000 tokens | Hard limit |
| Engine cap | 900,000 tokens | 90% — reserve for system prompt + response |
| System prompt | ~2,000 tokens | Instructions, tree structure |
| Doc content | ≤ 880,000 tokens | Actual document text |
| Response | ≤ 16,384 tokens | Claude max output |

## File Support

| Format | Extension | Method |
|--------|-----------|--------|
| Plain text | .txt | fs.readFileSync |
| Markdown | .md | fs.readFileSync + frontmatter via gray-matter |
| Code | .ts, .py, .js, .go, .rs, etc. | fs.readFileSync |
| JSON/YAML | .json, .yaml | fs.readFileSync |
| PDF | .pdf | pdf-parse |
| Word | .docx | mammoth |
| HTML | .html | fs.readFileSync |
| CSV | .csv | fs.readFileSync |

## Performance Considerations

- **Token counting**: Uses tiktoken (cl100k_base) when available; falls back to heuristic estimation
- **Streaming**: Server-Sent Events for HTTP; WebSocket for bidirectional streaming
- **Caching**: Multi-level — vector cache (JSON), local cache (JSON), in-memory Map
- **Large documents**: Documents > 90% of context limit are indexed in vector cache instead of being loaded whole
