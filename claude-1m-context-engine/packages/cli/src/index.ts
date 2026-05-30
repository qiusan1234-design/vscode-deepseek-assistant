#!/usr/bin/env node
// ============================================================
// c1m CLI — Command-line interface for Claude 1M Context Engine
// ============================================================

import 'dotenv/config';
import { Command } from 'commander';
import chalk from 'chalk';
import { Claude1MContextEngine, EngineConfig, TokenCounter, formatBytes, formatTokens } from '@claude-1m/core';

let engine: Claude1MContextEngine;

async function getEngine(): Promise<Claude1MContextEngine> {
  if (!engine) {
    const config: EngineConfig = {
      apiKey: process.env.ANTHROPIC_API_KEY || '',
      model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-6',
    };
    engine = new Claude1MContextEngine(config);
    await engine.initialize();
  }
  return engine;
}

const program = new Command();

program
  .name('c1m')
  .description('Claude 1M Context Engine CLI')
  .version('1.0.0');

// ---- ingest ----
program
  .command('ingest <path>')
  .description('Ingest a file or directory into the knowledge base')
  .option('-t, --title <title>', 'Document title')
  .option('--tags <tags>', 'Comma-separated tags')
  .action(async (filePath: string, options: { title?: string; tags?: string }) => {
    const eng = await getEngine();
    const tags = options.tags ? options.tags.split(',').map((t: string) => t.trim()) : [];

    try {
      const fs = require('fs');
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        console.log(chalk.blue(`Ingesting directory: ${filePath}`));
        const results = await eng.ingestDirectory(filePath);
        console.log(chalk.green(`Ingested ${results.length} files`));
        for (const doc of results) {
          console.log(`  ${chalk.cyan(doc.filename)} — ${formatTokens(doc.tokenCount)} tokens`);
        }
      } else {
        console.log(chalk.blue(`Ingesting: ${filePath}`));
        const doc = await eng.ingestFile(filePath, options.title, tags);
        console.log(chalk.green('Ingested successfully:'));
        console.log(`  File:    ${chalk.cyan(doc.filename)}`);
        console.log(`  Size:    ${formatBytes(doc.sizeBytes)}`);
        console.log(`  Tokens:  ${formatTokens(doc.tokenCount)}`);
        console.log(`  Lang:    ${doc.language}`);
      }
    } catch (err) {
      console.error(chalk.red(`Error: ${(err as Error).message}`));
      process.exit(1);
    }
  });

// ---- query ----
program
  .command('query <question>')
  .description('Query the knowledge base')
  .option('-t, --tree <id>', 'Context tree ID')
  .option('-m, --max-tokens <n>', 'Max output tokens', '4096')
  .option('--temperature <n>', 'Temperature', '0.3')
  .option('--stream', 'Stream the response', false)
  .action(async (question: string, options: { tree?: string; maxTokens: string; temperature: string; stream: boolean }) => {
    const eng = await getEngine();

    try {
      if (options.stream) {
        const stream = eng.queryStream({
          query: question,
          contextTreeId: options.tree,
          maxTokens: parseInt(options.maxTokens),
          temperature: parseFloat(options.temperature),
        });

        for await (const chunk of stream) {
          process.stdout.write(chunk);
        }
        process.stdout.write('\n');
      } else {
        const result = await eng.query({
          query: question,
          contextTreeId: options.tree,
          maxTokens: parseInt(options.maxTokens),
          temperature: parseFloat(options.temperature),
          includeSources: true,
        });

        console.log(chalk.bold('\n--- Answer ---'));
        console.log(result.answer);

        if (result.sources.length > 0) {
          console.log(chalk.bold('\n--- Sources ---'));
          for (const src of result.sources) {
            console.log(`  ${chalk.cyan(src.filename)} (score: ${src.relevanceScore.toFixed(2)})`);
          }
        }

        console.log(chalk.dim(`\nTokens: ${result.usage.inputTokens} in / ${result.usage.outputTokens} out | ${result.latencyMs}ms`));
      }
    } catch (err) {
      console.error(chalk.red(`Error: ${(err as Error).message}`));
      process.exit(1);
    }
  });

// ---- serve ----
program
  .command('serve')
  .description('Start the local API server')
  .option('-p, --port <port>', 'Port number', '3721')
  .action(async (options: { port: string }) => {
    process.env.PORT = options.port;
    require('../../server/dist/index');
  });

// ---- trees ----
program
  .command('trees')
  .description('List context trees')
  .action(async () => {
    const eng = await getEngine();
    const trees = eng.listContextTrees();
    if (trees.length === 0) {
      console.log(chalk.dim('No context trees. Create one with: c1m tree create <name>'));
    } else {
      for (const tree of trees) {
        console.log(chalk.bold(`\n${tree.name}`));
        console.log(`  ID:     ${chalk.dim(tree.id)}`);
        console.log(`  Nodes:  ${tree.nodeCount}`);
        console.log(`  Tokens: ${formatTokens(tree.totalTokens)} / ${formatTokens(tree.maxTokens)}`);
        console.log(`  Updated: ${tree.updatedAt}`);
      }
    }
  });

// ---- tree ----
const treeCmd = program.command('tree').description('Manage context trees');

treeCmd
  .command('create <name>')
  .description('Create a new context tree')
  .action(async (name: string) => {
    const eng = await getEngine();
    const tree = eng.createContextTree(name);
    console.log(chalk.green(`Created tree: ${tree.name}`));
    console.log(`  ID: ${chalk.dim(tree.id)}`);
  });

treeCmd
  .command('add <treeId> <filePath>')
  .description('Add a document to a tree')
  .action(async (treeId: string, filePath: string) => {
    const eng = await getEngine();
    const doc = await eng.ingestFile(filePath);
    eng.addToTree(treeId, doc);
    console.log(chalk.green(`Added "${doc.filename}" to tree`));
  });

// ---- memory ----
program
  .command('memory')
  .description('Show memory store')
  .action(async () => {
    const eng = await getEngine();
    const store = eng.getMemoryStore();
    console.log(chalk.bold(`Memory slots: ${store.slots.length} | Total tokens: ${formatTokens(store.totalTokens)}`));
    for (const slot of store.slots) {
      const expires = slot.expiresAt ? ` (expires: ${slot.expiresAt})` : '';
      console.log(`  ${chalk.cyan(slot.label)} [${formatTokens(slot.tokenCount)}] prio=${slot.priority}${expires}`);
    }
  });

// ---- stats ----
program
  .command('stats')
  .description('Show engine statistics')
  .action(async () => {
    const eng = await getEngine();
    const stats = await eng.getCacheStats();
    console.log(chalk.bold('\nEngine Statistics'));
    console.log(`  Vector cache entries: ${stats.vectorEntries}`);
    console.log(`  Local cache entries:  ${stats.localEntries}`);
    console.log(`  Context trees:        ${stats.contextTrees}`);
    console.log(`  Memory slots:         ${stats.memorySlots}`);
  });

program.parse(process.argv);
