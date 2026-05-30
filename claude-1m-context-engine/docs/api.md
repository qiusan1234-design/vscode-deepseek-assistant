# API Reference

Base URL: `http://127.0.0.1:3721`

## Health

### `GET /health`

Returns server health status.

```json
{
  "status": "ok",
  "version": "1.0.0",
  "uptime": 3600,
  "pid": 12345
}
```

## Status

### `GET /api/status`

Returns engine statistics.

```json
{
  "status": "ok",
  "vectorEntries": 1420,
  "localEntries": 89,
  "contextTrees": 3,
  "memorySlots": 12
}
```

## Context Trees

### `GET /api/context`

List all context trees.

```json
{
  "trees": [
    {
      "id": "uuid",
      "name": "research",
      "root": { "id": "uuid", "children": [...] },
      "totalTokens": 450000,
      "maxTokens": 900000,
      "nodeCount": 15,
      "createdAt": "2025-01-01T00:00:00Z",
      "updatedAt": "2025-01-02T00:00:00Z"
    }
  ]
}
```

### `POST /api/context`

Create a context tree.

**Request:**
```json
{ "name": "my-project" }
```

**Response:** `201 Created`
```json
{ "tree": { ... } }
```

### `GET /api/context/:treeId`

Get a specific tree.

### `POST /api/context/:treeId/nodes`

Add a document node to a tree.

**Request:**
```json
{
  "docId": "/path/to/doc.md",
  "parentId": "optional-parent-node-id",
  "title": "Optional Title",
  "tags": ["tag1", "tag2"]
}
```

### `POST /api/context/:treeId/nodes/:nodeId/pin`

Pin a node (prevent eviction).

### `DELETE /api/context/:treeId/nodes/:nodeId`

Remove a node from a tree.

## Documents

### `POST /api/documents/ingest`

Upload and ingest a file (multipart/form-data).

```
POST /api/documents/ingest
Content-Type: multipart/form-data

file: <binary>
title: optional-title
tags: tag1,tag2
```

### `POST /api/documents/ingest-path`

Ingest a file by local path.

**Request:**
```json
{
  "filePath": "/absolute/path/to/doc.pdf",
  "title": "Optional Title",
  "tags": ["research", "ml"]
}
```

### `POST /api/documents/ingest-directory`

Ingest all supported files in a directory.

**Request:**
```json
{
  "dirPath": "/absolute/path/to/docs/"
}
```

### `GET /api/documents/search?q=keyword&topK=10`

Search the vector cache for similar documents.

## Query

### `POST /api/query`

Send a query to the engine.

**Request (standard):**
```json
{
  "query": "What is the main finding?",
  "contextTreeId": "optional-tree-id",
  "maxTokens": 4096,
  "temperature": 0.3,
  "includeSources": true,
  "language": "auto",
  "systemPrompt": "Optional custom system prompt"
}
```

**Response:**
```json
{
  "answer": "...",
  "sources": [
    {
      "docId": "uuid",
      "filename": "paper.pdf",
      "snippet": "Abstract: ...",
      "relevanceScore": 0.85
    }
  ],
  "usage": {
    "inputTokens": 150000,
    "outputTokens": 2048,
    "cachedInputTokens": 140000,
    "totalTokens": 152048
  },
  "contextTreeId": "uuid",
  "latencyMs": 3421
}
```

**Request (streaming):**
```json
{
  "query": "Explain the architecture",
  "stream": true
}
```

**Response:** Server-Sent Events
```
data: {"text":"The "}
data: {"text":"architecture "}
data: {"text":"uses..."}
data: [DONE]
```

### `GET /api/query/memory`

Get all memory slots.

### `POST /api/query/memory`

Add a memory slot.

**Request:**
```json
{
  "label": "convention",
  "content": "Use tabs for indentation",
  "priority": 7,
  "ttlMinutes": 480
}
```

### `DELETE /api/query/memory/:slotId`

Remove a memory slot.

## WebSocket

Connect to `ws://127.0.0.1:3721/ws`

### Send Query
```json
{ "type": "query", "payload": { "query": "...", "contextTreeId": "..." } }
```

### Receive Chunks
```json
{ "type": "chunk", "data": "text fragment..." }
{ "type": "done" }
{ "type": "error", "error": "error message" }
```

## Error Responses

All errors follow this format:

```json
{ "error": "Human-readable error message" }
```

HTTP status codes:
- `400` — Bad request (missing/invalid parameters)
- `401` — Unauthorized (invalid/missing API token)
- `403` — Forbidden (remote access blocked)
- `404` — Resource not found
- `413` — File too large
- `500` — Internal server error
