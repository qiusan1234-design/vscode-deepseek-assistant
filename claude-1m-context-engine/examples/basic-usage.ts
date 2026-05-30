// ============================================================
// Basic Usage Example — Claude 1M Context Engine
// ============================================================

import { Claude1MContextEngine, formatTokens, formatBytes } from '@claude-1m/core';

async function main() {
  // 1. Initialize engine
  const engine = new Claude1MContextEngine({
    apiKey: process.env.ANTHROPIC_API_KEY || 'sk-ant-your-key',
    model: 'claude-sonnet-4-6',
    maxContextTokens: 900000,
  });

  await engine.initialize();
  console.log('Engine initialized');

  // 2. Ingest a document (no chunking — whole file loaded)
  const doc = await engine.ingestFile(
    './docs/research-paper.pdf',
    'Research Paper',
    ['ai', 'research', '2024'],
  );

  console.log(`\n=== Document Ingested ===`);
  console.log(`Name:    ${doc.filename}`);
  console.log(`Size:    ${formatBytes(doc.sizeBytes)}`);
  console.log(`Tokens:  ${formatTokens(doc.tokenCount)}`);
  console.log(`Lang:    ${doc.language}`);

  // 3. Create a context tree (hierarchical knowledge organization)
  const tree = engine.createContextTree('AI Research');
  console.log(`\n=== Context Tree Created ===`);
  console.log(`Name:  ${tree.name}`);
  console.log(`Max:   ${formatTokens(tree.maxTokens)} tokens`);

  // 4. Add document to tree
  const node = engine.addToTree(tree.id, doc);
  console.log(`\n=== Node Added ===`);
  console.log(`Title:  ${node.title}`);
  console.log(`Tokens: ${formatTokens(node.tokenCount)}`);

  // 5. Add some memory (cross-session knowledge)
  engine.addMemory(
    'AI field conventions',
    'Deep learning papers typically use LaTeX notation. Metrics are reported as mean ± std.',
    7,
    480, // 8 hours TTL
  );
  console.log(`\n=== Memory Added ===`);

  // 6. Query with full context
  console.log(`\n=== Query ===`);
  const result = await engine.query({
    query: 'What are the main contributions of this paper?',
    contextTreeId: tree.id,
    includeSources: true,
    maxTokens: 2048,
    temperature: 0.3,
  });

  console.log(result.answer);
  console.log(`\n--- Usage ---`);
  console.log(`Input:  ${formatTokens(result.usage.inputTokens)}`);
  console.log(`Output: ${formatTokens(result.usage.outputTokens)}`);
  console.log(`Cached: ${formatTokens(result.usage.cachedInputTokens)}`);
  console.log(`Time:   ${result.latencyMs}ms`);

  // 7. Streaming query example
  console.log(`\n=== Streaming Query ===`);
  const stream = engine.queryStream({
    query: 'List all the datasets used in the experiments.',
    contextTreeId: tree.id,
  });

  process.stdout.write('Answer: ');
  for await (const chunk of stream) {
    process.stdout.write(chunk);
  }
  console.log('\n');

  // 8. Check stats
  const stats = await engine.getCacheStats();
  console.log(`\n=== Engine Stats ===`);
  console.log(`Vector entries: ${stats.vectorEntries}`);
  console.log(`Local entries:  ${stats.localEntries}`);
  console.log(`Memory slots:   ${stats.memorySlots}`);

  // 9. Cleanup
  await engine.shutdown();
  console.log(`\nEngine shut down.`);
}

main().catch(console.error);
