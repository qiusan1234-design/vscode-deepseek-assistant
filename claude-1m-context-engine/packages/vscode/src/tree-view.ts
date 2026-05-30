import * as vscode from 'vscode';
import type { Claude1MContextEngine, ContextTree, ContextNode } from '@claude-1m/core';

export class ContextTreeView implements vscode.TreeDataProvider<TreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<TreeItem | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(
    private context: vscode.ExtensionContext,
    private engine: Claude1MContextEngine,
  ) {
    vscode.window.registerTreeDataProvider('c1m.contextTree', this);
  }

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: TreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: TreeItem): Promise<TreeItem[]> {
    if (!element) {
      // Root level: show context trees
      const trees = this.engine.listContextTrees();
      if (trees.length === 0) {
        const placeholder = new vscode.TreeItem(
          'No context trees. Create one via command palette.',
          vscode.TreeItemCollapsibleState.None
        );
        placeholder.iconPath = new vscode.ThemeIcon('info');
        return [placeholder];
      }
      return trees.map(tree => this.treeToItem(tree));
    }

    // Children: nodes of the tree
    if (element.context instanceof Object && 'children' in (element.context as any)) {
      const node = element.context as ContextNode;
      return node.children.map(child => this.nodeToItem(child));
    }

    return [];
  }

  private treeToItem(tree: ContextTree): TreeItem {
    const item = new TreeItem(
      `${tree.name}`,
      vscode.TreeItemCollapsibleState.Collapsed
    );
    item.contextValue = 'contextTree';
    item.id = tree.id;
    item.iconPath = new vscode.ThemeIcon('database');
    item.description = `${tree.nodeCount} nodes, ${Math.round(tree.totalTokens / 1000)}K tokens`;
    item.tooltip = `ID: ${tree.id}\nCreated: ${tree.createdAt}`;
    item.context = tree.root;
    return item;
  }

  private nodeToItem(node: ContextNode): TreeItem {
    const collapsible = node.children.length > 0
      ? vscode.TreeItemCollapsibleState.Collapsed
      : vscode.TreeItemCollapsibleState.None;

    const item = new TreeItem(node.title, collapsible);
    item.contextValue = 'contextNode';
    item.id = node.id;
    item.iconPath = new vscode.ThemeIcon(node.pinned ? 'pinned' : 'file-text');
    item.description = `${Math.round(node.tokenCount / 1000)}K tokens`;
    item.tooltip = `Summary: ${node.summary}\nPriority: ${node.priority}`;
    item.context = node;
    return item;
  }
}

class TreeItem extends vscode.TreeItem {
  context: unknown;
}
