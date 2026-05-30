import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Claude1MContextEngine } from '../../packages/core/src/engine';

describe('Claude1MContextEngine (Integration)', () => {
  let engine: Claude1MContextEngine;
  let tmpDir: string;

  beforeAll(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'c1m-test-'));

    // Create test files
    fs.writeFileSync(path.join(tmpDir, 'test.md'), `# Test Document\n\nThis is a test markdown file.\n\n## Section 1\n\nContent for section one.\n\n## Section 2\n\nContent for section two.`);

    fs.writeFileSync(path.join(tmpDir, 'chinese.txt'), '这是一个中文测试文档。\n\n包含多个段落。\n\n用于测试中文文档加载和处理能力。');

    fs.writeFileSync(path.join(tmpDir, 'data.json'), JSON.stringify({ key: 'value', items: [1, 2, 3] }, null, 2));

    fs.mkdirSync(path.join(tmpDir, 'subdir'));
    fs.writeFileSync(path.join(tmpDir, 'subdir', 'nested.md'), '# Nested\n\nNested markdown file.');

    engine = new Claude1MContextEngine({
      apiKey: 'test-key-not-real',
      cacheDir: path.join(tmpDir, '.cache'),
      vectorCacheDir: path.join(tmpDir, '.vector-cache'),
      enablePromptCaching: false,
      enableVectorCache: true,
    });

    await engine.initialize();
  });

  afterAll(async () => {
    await engine.shutdown();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('ingests a markdown file', async () => {
    const doc = await engine.ingestFile(path.join(tmpDir, 'test.md'));
    expect(doc.filename).toBe('test.md');
    expect(doc.language).toBe('en');
    expect(doc.tokenCount).toBeGreaterThan(0);
    expect(doc.checksum).toBeTruthy();
  });

  test('ingests a Chinese text file', async () => {
    const doc = await engine.ingestFile(path.join(tmpDir, 'chinese.txt'));
    expect(doc.filename).toBe('chinese.txt');
    expect(doc.language).toBe('zh');
    expect(doc.tokenCount).toBeGreaterThan(0);
  });

  test('ingests a JSON file', async () => {
    const doc = await engine.ingestFile(path.join(tmpDir, 'data.json'));
    expect(doc.filename).toBe('data.json');
  });

  test('ingests a directory', async () => {
    const docs = await engine.ingestDirectory(tmpDir);
    expect(docs.length).toBeGreaterThanOrEqual(3);
  });

  test('creates and manages context trees', () => {
    const tree = engine.createContextTree('Integration Test');
    expect(tree.name).toBe('Integration Test');
    expect(tree.maxTokens).toBeGreaterThan(0);

    const trees = engine.listContextTrees();
    expect(trees.find(t => t.id === tree.id)).toBeTruthy();

    const retrieved = engine.getContextTree(tree.id);
    expect(retrieved?.name).toBe('Integration Test');
  });

  test('adds document to context tree', async () => {
    const tree = engine.createContextTree('Doc Test Tree');
    const doc = await engine.ingestFile(path.join(tmpDir, 'test.md'));
    const node = engine.addToTree(tree.id, doc);

    expect(node.title).toBe('test.md');
    expect(node.parentId).toBe(tree.root.id);
  });

  test('pin and memory operations', () => {
    const tree = engine.createContextTree('Pin Test');
    const node = engine.addToTree(tree.id, {
      id: 'fake-doc-1',
      path: '/fake/test.md',
      filename: 'test.md',
      mimeType: 'text/plain',
      sizeBytes: 100,
      charCount: 100,
      tokenCount: 50,
      checksum: 'abc',
      language: 'en',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: [],
    });

    engine.pinNode(tree.id, node.id);
    engine.addMemory('test-key', 'test-value', 8);

    const memory = engine.getMemoryStore();
    expect(memory.slots.length).toBeGreaterThan(0);
  });

  test('caches document content', () => {
    const stats = engine.getCacheStats();
    expect(stats).toBeDefined();
  });
});
