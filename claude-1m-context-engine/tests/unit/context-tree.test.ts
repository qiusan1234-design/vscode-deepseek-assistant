import { ContextTreeManager } from '../../packages/core/src/context-tree';
import { DocumentMeta } from '../../packages/core/src/types';

describe('ContextTreeManager', () => {
  let manager: ContextTreeManager;

  beforeEach(() => {
    manager = new ContextTreeManager(100000);
  });

  test('creates a tree with root node', () => {
    const tree = manager.create('Test Tree');
    expect(tree.name).toBe('Test Tree');
    expect(tree.root.title).toBe('Test Tree');
    expect(tree.nodeCount).toBe(1);
    expect(tree.totalTokens).toBe(0);
  });

  test('adds a document node to tree', () => {
    const tree = manager.create('Test');
    const docMeta: DocumentMeta = createMockDoc('test.md', 5000);

    const node = manager.addNode(tree.id, docMeta);

    expect(node.title).toBe('test.md');
    expect(node.tokenCount).toBe(5000);
    expect(node.priority).toBe(5);

    const updated = manager.get(tree.id)!;
    expect(updated.totalTokens).toBe(5000);
    expect(updated.nodeCount).toBe(2);
  });

  test('pins a node and raises priority', () => {
    const tree = manager.create('Test');
    const doc = createMockDoc('important.md', 3000);
    const node = manager.addNode(tree.id, doc);

    manager.pinNode(tree.id, node.id);
    const updated = manager.get(tree.id)!;

    // Root + pinned node
    const flat = flattenTree(updated.root);
    const pinned = flat.find(n => n.id === node.id);
    expect(pinned?.pinned).toBe(true);
    expect(pinned?.priority).toBe(10);
  });

  test('removes a node from tree', () => {
    const tree = manager.create('Test');
    const doc = createMockDoc('temp.md', 2000);
    const node = manager.addNode(tree.id, doc);

    manager.removeNode(tree.id, node.id);
    const updated = manager.get(tree.id)!;

    expect(updated.totalTokens).toBe(0);
    expect(updated.nodeCount).toBe(1);
  });

  test('lists all trees', () => {
    manager.create('Tree A');
    manager.create('Tree B');
    expect(manager.list()).toHaveLength(2);
  });

  test('deletes a tree', () => {
    const tree = manager.create('To Delete');
    expect(manager.deleteTree(tree.id)).toBe(true);
    expect(manager.get(tree.id)).toBeNull();
  });

  test('evicts low-priority nodes when approaching limit', () => {
    const manager = new ContextTreeManager(10000);
    const tree = manager.create('Small');

    // Add a large document
    const bigDoc = createMockDoc('big.md', 8000);
    const bigNode = manager.addNode(tree.id, bigDoc);

    // Add another doc that would exceed 90%
    const smallDoc = createMockDoc('small.md', 3000);
    manager.addNode(tree.id, smallDoc);

    // Low-priority unpinned node should be evicted
    const updated = manager.get(tree.id)!;
    expect(updated.totalTokens).toBeLessThan(10000);
  });
});

function createMockDoc(filename: string, tokenCount: number): DocumentMeta {
  return {
    id: `doc-${Math.random().toString(36).slice(2)}`,
    path: `/fake/${filename}`,
    filename,
    mimeType: 'text/plain',
    sizeBytes: tokenCount * 4,
    charCount: tokenCount * 4,
    tokenCount,
    language: 'en',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    checksum: 'abc123',
    tags: [],
  };
}

function flattenTree(node: any): any[] {
  const result = [node];
  for (const child of node.children) {
    result.push(...flattenTree(child));
  }
  return result;
}
