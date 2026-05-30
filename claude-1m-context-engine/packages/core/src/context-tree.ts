// ============================================================
// ContextTreeManager — Hierarchical context memory tree
// ============================================================

import { v4 as uuid } from 'uuid';
import { ContextTree, ContextNode, DocumentMeta } from './types';

export class ContextTreeManager {
  private trees: Map<string, ContextTree> = new Map();
  private maxTokens: number;

  constructor(maxTokens: number) {
    this.maxTokens = maxTokens;
  }

  create(name: string): ContextTree {
    const rootId = uuid();
    const tree: ContextTree = {
      id: uuid(),
      name,
      root: {
        id: rootId,
        parentId: null,
        docId: '',
        title: name,
        summary: `Root of "${name}"`,
        tokenCount: 0,
        priority: 0,
        children: [],
        metadata: {},
        pinned: false,
        lastAccessedAt: new Date().toISOString(),
      },
      totalTokens: 0,
      maxTokens: this.maxTokens,
      nodeCount: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.trees.set(tree.id, tree);
    return tree;
  }

  addNode(treeId: string, docMeta: DocumentMeta, parentId?: string): ContextNode {
    const tree = this.trees.get(treeId);
    if (!tree) throw new Error(`Tree "${treeId}" not found`);

    if (tree.totalTokens + docMeta.tokenCount > tree.maxTokens * 0.9) {
      this.evictLowestPriority(tree);
    }

    const node: ContextNode = {
      id: uuid(),
      parentId: parentId || tree.root.id,
      docId: docMeta.id,
      title: docMeta.filename,
      summary: `${docMeta.filename} (${docMeta.tokenCount} tokens)`,
      tokenCount: docMeta.tokenCount,
      priority: 5,
      children: [],
      metadata: { docMeta },
      pinned: false,
      lastAccessedAt: new Date().toISOString(),
    };

    this.insertIntoParent(tree.root, node);
    tree.totalTokens += docMeta.tokenCount;
    tree.nodeCount++;
    tree.updatedAt = new Date().toISOString();

    return node;
  }

  get(treeId: string): ContextTree | null {
    const tree = this.trees.get(treeId);
    if (tree) {
      tree.updatedAt = new Date().toISOString();
    }
    return tree || null;
  }

  list(): ContextTree[] {
    return Array.from(this.trees.values());
  }

  removeNode(treeId: string, nodeId: string): void {
    const tree = this.trees.get(treeId);
    if (!tree) return;

    const removed = this.removeFromParent(tree.root, nodeId);
    if (removed) {
      tree.totalTokens -= removed.tokenCount;
      tree.nodeCount--;
      tree.updatedAt = new Date().toISOString();
    }
  }

  pinNode(treeId: string, nodeId: string): void {
    const tree = this.trees.get(treeId);
    if (!tree) return;

    const node = this.findNode(tree.root, nodeId);
    if (node) {
      node.pinned = true;
      node.priority = 10;
    }
  }

  deleteTree(treeId: string): boolean {
    return this.trees.delete(treeId);
  }

  // ---- Internal ----

  private insertIntoParent(parent: ContextNode, node: ContextNode): void {
    if (parent.id === node.parentId) {
      parent.children.push(node);
      return;
    }
    for (const child of parent.children) {
      this.insertIntoParent(child, node);
    }
  }

  private removeFromParent(parent: ContextNode, nodeId: string): ContextNode | null {
    const idx = parent.children.findIndex(c => c.id === nodeId);
    if (idx >= 0) {
      const [removed] = parent.children.splice(idx, 1);
      return this.collectAll(removed);
    }
    for (const child of parent.children) {
      const result = this.removeFromParent(child, nodeId);
      if (result) return result;
    }
    return null;
  }

  private collectAll(node: ContextNode): ContextNode {
    const clone = { ...node };
    let totalTokens = node.tokenCount;
    for (const child of node.children) {
      totalTokens += child.tokenCount;
    }
    clone.tokenCount = totalTokens;
    return clone;
  }

  private findNode(parent: ContextNode, nodeId: string): ContextNode | null {
    if (parent.id === nodeId) return parent;
    for (const child of parent.children) {
      const found = this.findNode(child, nodeId);
      if (found) return found;
    }
    return null;
  }

  private evictLowestPriority(tree: ContextTree): void {
    const flat = this.flattenNodes(tree.root)
      .filter(n => !n.pinned && n.parentId !== null)
      .sort((a, b) => a.priority - b.priority || a.lastAccessedAt.localeCompare(b.lastAccessedAt));

    let freed = 0;
    const target = Math.floor(tree.maxTokens * 0.1);
    for (const node of flat) {
      if (freed >= target) break;
      this.removeNode(tree.id, node.id);
      freed += node.tokenCount;
    }
  }

  private flattenNodes(node: ContextNode): ContextNode[] {
    const result: ContextNode[] = [node];
    for (const child of node.children) {
      result.push(...this.flattenNodes(child));
    }
    return result;
  }
}
