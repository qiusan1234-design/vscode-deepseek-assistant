// ============================================================
// Chinese Document Demo — 中文长文档处理示例
// ============================================================

import { Claude1MContextEngine, formatTokens } from '@claude-1m/core';

async function demo() {
  const engine = new Claude1MContextEngine({
    apiKey: process.env.ANTHROPIC_API_KEY || 'sk-ant-your-key',
    model: 'claude-sonnet-4-6',
    maxContextTokens: 900000,
  });

  await engine.initialize();

  // Ingest Chinese documents — auto GBK/UTF-8 detection
  console.log('=== 导入中文文档 ===');

  const files = [
    './docs/需求文档.md',
    './docs/技术方案.pdf',
    './docs/会议纪要.txt',
  ];

  for (const file of files) {
    try {
      const doc = await engine.ingestFile(file);
      console.log(`✅ ${doc.filename}`);
      console.log(`   编码: ${doc.language === 'zh' ? '中文' : doc.language}`);
      console.log(`   Token: ${formatTokens(doc.tokenCount)}`);
      console.log(`   大小: ${doc.sizeBytes} bytes`);
    } catch {
      console.log(`⚠️ 跳过: ${file}`);
    }
  }

  // Create a Chinese-optimized context tree
  const tree = engine.createContextTree('项目知识库');
  console.log(`\n=== 上下文树: ${tree.name} ===`);

  // Query in Chinese
  console.log('\n=== 中文查询 ===');
  const result = await engine.query({
    query: '需求文档中提到的核心功能有哪些？请用中文回答。',
    contextTreeId: tree.id,
    language: 'zh',
    includeSources: true,
    temperature: 0.3,
  });

  console.log(`回答:\n${result.answer}`);
  console.log(`\nToken 用量: 输入 ${result.usage.inputTokens} / 输出 ${result.usage.outputTokens}`);

  await engine.shutdown();
}

demo().catch(console.error);
