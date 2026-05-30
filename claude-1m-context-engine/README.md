<p align="center">
  <h1 align="center">Claude 1M Context Engine</h1>
  <p align="center">
    <strong>Ultra-long 100万 token context knowledge engine — no chunking, full-document understanding</strong>
  </p>
  <p align="center">
    <a href="https://github.com/qiusan1234-design/claude-1m-context-engine/stargazers">
      <img src="https://img.shields.io/github/stars/qiusan1234-design/claude-1m-context-engine?style=social" alt="Stars">
    </a>
    <a href="https://github.com/qiusan1234-design/claude-1m-context-engine/blob/main/LICENSE">
      <img src="https://img.shields.io/github/license/qiusan1234-design/claude-1m-context-engine" alt="License">
    </a>
    <img src="https://img.shields.io/badge/TypeScript-5.7-blue" alt="TypeScript">
    <img src="https://img.shields.io/badge/Node.js-%3E%3D20-green" alt="Node.js">
    <img src="https://img.shields.io/badge/Claude-1M%20Context-orange" alt="Claude">
  </p>
</p>

<p align="center">
  <a href="README_CN.md">中文文档</a> ·
  <a href="#quick-start">Quick Start</a> ·
  <a href="#features">Features</a> ·
  <a href="docs/architecture.md">Architecture</a> ·
  <a href="docs/api.md">API</a>
</p>

---

## Why This Exists

Everyone is building RAG with chunking. But with Claude's **1,000,000 token context window**, you don't need to chunk anymore. You can put an entire codebase, a full novel, or hundreds of documents into a single context — and Claude can reason over ALL of it.

This project is the first **zero-chunk, local-first** knowledge engine that truly leverages the 1M context window. No vector DB fragmentation, no lost cross-reference, no hallucinated stitching. **Read the whole document, understand the whole document.**

> 中文用户：这是一个不切片的超长上下文知识库引擎，特别优化了中国长文档场景。详见 [中文 README](README_CN.md)。

---

## Features

### Core Engine
- **Zero-Chunk Ingestion** — Entire documents loaded as-is, preserving structure and cross-references
- **Context Memory Tree** — Hierarchical knowledge organization with priority-based eviction
- **Local Vector Cache** — Lightweight TF-IDF search for document retrieval, no external DB
- **Prompt Caching** — Claude API prompt caching for 90% cost savings on repeated context
- **Memory Slots** — Persistent key-value knowledge slots with TTL

### Local & Private
- **100% Localhost** — All data stays on your machine
- **No Cloud Dependencies** — Only Claude API calls leave your network
- **Token-Based Auth** — Optional API token for private LAN access

### VSCode Extension
- Sidebar tree view for context hierarchy
- Auto-ingest on file save
- Inline query panel with streaming responses
- Status bar indicator for engine state

### Chinese Long-Document Optimized
- Auto-detection of GBK/GB2312/UTF-8 encoding
- CJK-aware token counting
- Language detection for Chinese/English/mixed documents
- Chinese-proficient system prompts

### CLI & API
- Full-featured `c1m` CLI: ingest, query, serve, memory management
- REST API with SSE streaming
- WebSocket for real-time streaming responses

---

## Quick Start

### Prerequisites
- Node.js >= 20
- [Anthropic API key](https://console.anthropic.com/)

### One-Click Deploy

```bash
# Linux/macOS
git clone https://github.com/qiusan1234-design/claude-1m-context-engine.git
cd claude-1m-context-engine
bash deploy.sh

# Windows PowerShell
git clone https://github.com/qiusan1234-design/claude-1m-context-engine.git
cd claude-1m-context-engine
.\deploy.ps1
```

### Docker

```bash
export ANTHROPIC_API_KEY=sk-ant-your-key
docker compose up -d
```

### Manual Setup

```bash
npm install
npm run build:core
npm run build:server
npm run build:cli

# Set your API key
export ANTHROPIC_API_KEY=sk-ant-your-key

# Start the server
npm run dev:server
```

---

## Usage

### CLI

```bash
# Ingest a document
npx c1m ingest ./docs/research-paper.pdf

# Ingest a whole directory
npx c1m ingest ./my-knowledge-base/

# Query with streaming
npx c1m query "What is the main finding?" --stream

# Create a context tree
npx c1m tree create my-project

# Add document to tree
npx c1m tree add <tree-id> ./docs/architecture.md

# Start the API server
npx c1m serve --port 3721
```

### API

```bash
# Health check
curl http://127.0.0.1:3721/health

# Ingest a file
curl -X POST http://127.0.0.1:3721/api/documents/ingest-path \
  -H "Content-Type: application/json" \
  -d '{"filePath": "/path/to/doc.pdf", "tags": ["research"]}'

# Query
curl -X POST http://127.0.0.1:3721/api/query \
  -H "Content-Type: application/json" \
  -d '{"query": "Summarize the key points", "includeSources": true}'

# Stream query
curl -X POST http://127.0.0.1:3721/api/query \
  -H "Content-Type: application/json" \
  -d '{"query": "Explain the architecture", "stream": true}'
```

### TypeScript/JavaScript

```typescript
import { Claude1MContextEngine } from '@claude-1m/core';

const engine = new Claude1MContextEngine({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  model: 'claude-sonnet-4-6',
  maxContextTokens: 900000,
});

await engine.initialize();

// Ingest
const doc = await engine.ingestFile('./docs/paper.pdf');
console.log(`Loaded: ${doc.filename} (${doc.tokenCount} tokens)`);

// Build context tree
const tree = engine.createContextTree('research');
engine.addToTree(tree.id, doc);

// Query
const result = await engine.query({
  query: 'What are the key findings?',
  contextTreeId: tree.id,
  stream: false,
});

console.log(result.answer);
console.log(`Tokens: ${result.usage.inputTokens} in / ${result.usage.outputTokens} out`);
```

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Claude 1M Context Engine             │
├─────────────┬─────────────┬──────────────┬───────────┤
│   VSCode    │    CLI      │  HTTP API    │ WebSocket │
│  Extension  │   (c1m)     │  (Express)   │   (WS)    │
├─────────────┴─────────────┴──────────────┴───────────┤
│                    Core Engine                        │
│  ┌───────────┐ ┌───────────┐ ┌───────────────────┐   │
│  │ Document  │ │ Context   │ │ Memory            │   │
│  │ Loader    │ │ Tree Mgr  │ │ Manager           │   │
│  │(no chunk) │ │           │ │                   │   │
│  └───────────┘ └───────────┘ └───────────────────┘   │
│  ┌───────────┐ ┌───────────────────────────────────┐ │
│  │ Vector    │ │ Local Cache  │ │ Claude API       │ │
│  │ Cache     │ │ (Filesystem) │ │ Client           │ │
│  └───────────┘ └──────────────┘ └──────────────────┘ │
└─────────────────────────────────────────────────────┘
```

See [docs/architecture.md](docs/architecture.md) for full details.

---

## Project Structure

```
claude-1m-context-engine/
├── packages/
│   ├── core/         # Core engine (zero-chunk, context tree, vector cache)
│   ├── server/       # Local REST + WebSocket API server
│   ├── cli/          # Command-line interface (c1m)
│   └── vscode/       # VSCode extension
├── tests/
│   ├── unit/
│   └── integration/
├── examples/         # Usage examples
├── docs/             # Architecture & API docs
├── scripts/          # Build & release scripts
├── deploy.sh         # One-click deploy (Linux/macOS)
├── deploy.ps1        # One-click deploy (Windows)
├── Dockerfile
├── docker-compose.yml
└── README.md
```

---

## VSCode Extension

Available commands (Ctrl+Shift+P):

| Command | Description |
|---------|-------------|
| `C1M: Ingest Current File` | Load the active file into engine |
| `C1M: Ingest Directory` | Load all supported files from a folder |
| `C1M: Query Knowledge Base` | Ask questions against your context |
| `C1M: Create Context Tree` | Organize documents hierarchically |
| `C1M: Add Current File to Tree` | Link document into a tree |
| `C1M: Show Engine Statistics` | View memory usage and cache stats |
| `C1M: Start/Stop Local Server` | Manage the API server |

---

## Why Not Traditional RAG?

| Traditional RAG | Claude 1M Context Engine |
|:---|:---|
| Documents split into ~500-token chunks | **Whole documents** loaded as-is |
| Chunk boundaries break semantics | **Natural document boundaries** |
| Retrieval may miss cross-references | **Claude reads everything** |
| Complex embedding pipeline | **Direct API calls** |
| Vector DB required (Pinecone/Weaviate) | **Local file cache only** |
| Stitching answers from fragments | **Holistic reasoning** |

When the context window is **1 million tokens**, chunking is a bug, not a feature.

---

## Roadmap

- [x] Core zero-chunk ingestion engine
- [x] Context memory tree with LRU eviction
- [x] Local vector cache (TF-IDF)
- [x] VSCode extension with tree view
- [x] CLI tool with streaming
- [x] Docker deployment
- [ ] Semantic embedding with local model (ONNX)
- [ ] Multi-modal document support (images, diagrams)
- [ ] Concurrent document ingestion
- [ ] Context tree diff/merge
- [ ] Obsidian plugin
- [ ] Electron desktop app

---

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `npm test`
5. Submit a PR

---

## License

Apache 2.0 © [qiusan1234-design](https://github.com/qiusan1234-design)

---

## Star History

If you find this project useful, please consider [giving it a star](https://github.com/qiusan1234-design/claude-1m-context-engine)!

<p align="center">
  <strong>Built with Claude, for everyone who has too many documents.</strong>
</p>
