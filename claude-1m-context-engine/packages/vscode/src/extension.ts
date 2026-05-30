// ============================================================
// VSCode Extension — Claude 1M Context Engine
// ============================================================

import * as vscode from 'vscode';
import { Claude1MContextEngine, EngineConfig, formatTokens } from '@claude-1m/core';
import { ContextTreeView } from './tree-view';
import { StatusBarManager } from './status-bar';

let engine: Claude1MContextEngine;
let statusBar: StatusBarManager;
let treeView: ContextTreeView;

export async function activate(context: vscode.ExtensionContext) {
  const config = vscode.workspace.getConfiguration('c1m');
  const apiKey = config.get<string>('apiKey') || process.env.ANTHROPIC_API_KEY || '';

  if (!apiKey) {
    vscode.window.showWarningMessage(
      'Claude 1M Context Engine: Set c1m.apiKey in settings or ANTHROPIC_API_KEY env var'
    );
  }

  const engineConfig: EngineConfig = {
    apiKey,
    model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-6',
    maxContextTokens: config.get<number>('maxContextTokens') || 900000,
  };

  engine = new Claude1MContextEngine(engineConfig);
  await engine.initialize();

  statusBar = new StatusBarManager(context);
  statusBar.update('ready');

  treeView = new ContextTreeView(context, engine);

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('c1m.ingestFile', ingestCurrentFile),
    vscode.commands.registerCommand('c1m.ingestDirectory', ingestDirectory),
    vscode.commands.registerCommand('c1m.query', queryEngine),
    vscode.commands.registerCommand('c1m.createTree', createTree),
    vscode.commands.registerCommand('c1m.addToTree', addToTree),
    vscode.commands.registerCommand('c1m.showContextPanel', showContextPanel),
    vscode.commands.registerCommand('c1m.clearMemory', clearMemory),
    vscode.commands.registerCommand('c1m.showStats', showStats),
    vscode.commands.registerCommand('c1m.startServer', startServer),
    vscode.commands.registerCommand('c1m.stopServer', stopServer),
  );

  // Auto-ingest on save if configured
  if (config.get<boolean>('autoIngestOnSave')) {
    context.subscriptions.push(
      vscode.workspace.onDidSaveTextDocument(async (doc) => {
        try {
          statusBar.update('ingesting');
          await engine.ingestFile(doc.fileName);
          treeView.refresh();
          statusBar.update('ready');
        } catch (err) {
          statusBar.update('error');
          console.error('Auto-ingest error:', err);
        }
      })
    );
  }

  console.log('Claude 1M Context Engine extension activated');
}

async function ingestCurrentFile(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage('No active editor');
    return;
  }

  try {
    statusBar.update('ingesting');
    const doc = await engine.ingestFile(editor.document.fileName);
    treeView.refresh();
    statusBar.update('ready');
    vscode.window.showInformationMessage(
      `Ingested: ${doc.filename} (${formatTokens(doc.tokenCount)} tokens, ${doc.language})`
    );
  } catch (err) {
    statusBar.update('error');
    vscode.window.showErrorMessage(`Ingest error: ${(err as Error).message}`);
  }
}

async function ingestDirectory(): Promise<void> {
  const result = await vscode.window.showOpenDialog({
    canSelectFolders: true,
    canSelectFiles: false,
    openLabel: 'Ingest Directory',
  });

  if (!result || result.length === 0) return;

  try {
    statusBar.update('ingesting');
    const docs = await engine.ingestDirectory(result[0].fsPath);
    treeView.refresh();
    statusBar.update('ready');
    vscode.window.showInformationMessage(`Ingested ${docs.length} documents`);
  } catch (err) {
    statusBar.update('error');
    vscode.window.showErrorMessage(`Ingest error: ${(err as Error).message}`);
  }
}

async function queryEngine(): Promise<void> {
  const query = await vscode.window.showInputBox({
    prompt: 'Enter your question',
    placeHolder: 'Ask anything about your ingested documents...',
  });

  if (!query) return;

  const trees = engine.listContextTrees();
  let treeId: string | undefined;

  if (trees.length > 0) {
    const pick = await vscode.window.showQuickPick(
      ['None (global query)', ...trees.map(t => t.name)],
      { placeHolder: 'Select a context tree (optional)' }
    );
    if (pick && pick !== 'None (global query)') {
      treeId = trees.find(t => t.name === pick)?.id;
    }
  }

  try {
    statusBar.update('querying');

    const panel = vscode.window.createWebviewPanel(
      'c1mQueryResult',
      'C1M Query Result',
      vscode.ViewColumn.Two,
      { enableScripts: true }
    );

    panel.webview.html = getLoadingHtml(query);

    const result = await engine.query({
      query,
      contextTreeId: treeId,
      includeSources: true,
    });

    panel.webview.html = getResultHtml(query, result.answer, result.sources, result.usage);
    statusBar.update('ready');
  } catch (err) {
    statusBar.update('error');
    vscode.window.showErrorMessage(`Query error: ${(err as Error).message}`);
  }
}

async function createTree(): Promise<void> {
  const name = await vscode.window.showInputBox({
    prompt: 'Context tree name',
    placeHolder: 'my-project-knowledge',
  });

  if (!name) return;

  try {
    engine.createContextTree(name);
    treeView.refresh();
    vscode.window.showInformationMessage(`Context tree "${name}" created`);
  } catch (err) {
    vscode.window.showErrorMessage(`Error: ${(err as Error).message}`);
  }
}

async function addToTree(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage('No active editor');
    return;
  }

  const trees = engine.listContextTrees();
  if (trees.length === 0) {
    vscode.window.showInformationMessage('Create a context tree first');
    return;
  }

  const treePick = await vscode.window.showQuickPick(
    trees.map(t => ({ label: t.name, id: t.id })),
    { placeHolder: 'Select a context tree' }
  );

  if (!treePick) return;

  try {
    const doc = await engine.ingestFile(editor.document.fileName);
    engine.addToTree(treePick.id, doc);
    treeView.refresh();
    vscode.window.showInformationMessage(`Added "${doc.filename}" to "${treePick.label}"`);
  } catch (err) {
    vscode.window.showErrorMessage(`Error: ${(err as Error).message}`);
  }
}

function showContextPanel(): void {
  vscode.commands.executeCommand('workbench.view.extension.c1m-context-panel');
}

function clearMemory(): void {
  engine.clearMemory();
  treeView.refresh();
  vscode.window.showInformationMessage('Memory cleared');
}

async function showStats(): Promise<void> {
  const stats = await engine.getCacheStats();
  const trees = engine.listContextTrees();
  const memory = engine.getMemoryStore();

  const lines = [
    '=== Claude 1M Context Engine Stats ===',
    `Vector cache entries: ${stats.vectorEntries}`,
    `Local cache entries:  ${stats.localEntries}`,
    `Context trees:        ${stats.contextTrees}`,
    `Memory slots:         ${stats.memorySlots}`,
    '',
  ];

  if (trees.length > 0) {
    lines.push('--- Context Trees ---');
    for (const tree of trees) {
      lines.push(`${tree.name}: ${tree.nodeCount} nodes, ${formatTokens(tree.totalTokens)} tokens`);
    }
  }

  const panel = vscode.window.createWebviewPanel(
    'c1mStats',
    'C1M Statistics',
    vscode.ViewColumn.Beside,
    {}
  );

  panel.webview.html = `<pre>${lines.join('\n')}</pre>`;
}

async function startServer(): Promise<void> {
  const port = vscode.workspace.getConfiguration('c1m').get<number>('serverPort') || 3721;
  try {
    const { spawn } = require('child_process');
    const serverProcess = spawn('npx', ['c1m', 'serve', '-p', String(port)], {
      cwd: vscode.extensions.getExtension('qiusan1234-design.claude-1m-context-engine-vscode')?.extensionPath,
      shell: true,
    });

    serverProcess.stdout?.on('data', (data: Buffer) => {
      console.log(`[C1M Server] ${data.toString()}`);
    });

    statusBar.update('server-on');
    vscode.window.showInformationMessage(`Server started on http://127.0.0.1:${port}`);
  } catch (err) {
    vscode.window.showErrorMessage(`Failed to start server: ${(err as Error).message}`);
  }
}

function stopServer(): void {
  statusBar.update('ready');
  vscode.window.showInformationMessage('Server stopped (close the terminal manually)');
}

export function deactivate() {
  engine?.shutdown();
}

// ---- Webview HTML Helpers ----

function getLoadingHtml(query: string): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head><body style="font-family:system-ui;padding:20px;color:#ccc;background:#1e1e1e">
<h2>Querying...</h2><p>${escapeHtml(query)}</p>
</body></html>`;
}

function getResultHtml(
  query: string,
  answer: string,
  sources: Array<{ filename: string; relevanceScore: number }>,
  usage: { inputTokens: number; outputTokens: number }
): string {
  const sourcesHtml = sources.length > 0
    ? `<h3>Sources</h3><ul>${sources.map(s => `<li>${escapeHtml(s.filename)} (${(s.relevanceScore * 100).toFixed(0)}%)</li>`).join('')}</ul>`
    : '';
  const rendered = answer
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
    .replace(/\n/g, '<br>');

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head><body style="font-family:system-ui;padding:20px;color:#d4d4d4;background:#1e1e1e;max-width:900px">
<h2>Query</h2><p style="color:#888">${escapeHtml(query)}</p>
<h2>Answer</h2><div>${rendered}</div>
${sourcesHtml}
<hr><p style="color:#666;font-size:12px">Input: ${formatTokens(usage.inputTokens)} | Output: ${formatTokens(usage.outputTokens)}</p>
</body></html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
