import * as vscode from 'vscode';
import * as cp from 'child_process';
import { DeepSeekService, DeepSeekMessage } from '../services/deepseekApi';

function getGitDiff(): Promise<string> {
  return new Promise((resolve, reject) => {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      reject(new Error('No workspace folder found. Open a git repository first.'));
      return;
    }

    const cwd = workspaceFolders[0].uri.fsPath;

    cp.exec(
      'git diff --staged -- . ":(exclude,top)package-lock.json" ":(exclude,top)yarn.lock" ":(exclude,top)pnpm-lock.yaml"',
      { cwd, maxBuffer: 50 * 1024 * 1024 },
      (err, stdout) => {
        if (err) {
          reject(new Error(`Git diff failed: ${err.message}. Make sure this is a git repository.`));
          return;
        }
        if (!stdout.trim()) {
          reject(new Error('No staged changes found. Run "git add" to stage files first.'));
          return;
        }
        resolve(stdout.trim());
      }
    );
  });
}

const COMMIT_SYSTEM_PROMPT = `You are an expert commit message writer following the Conventional Commits specification.

Rules:
1. Format: <type>(<scope>): <description>
2. Types: feat, fix, refactor, perf, docs, style, test, chore, ci, build
3. Description should be concise (under 72 chars), imperative mood
4. Include a body explaining WHAT and WHY (not HOW) if needed
5. Output ONLY the commit message, no markdown wrapping, no explanation.

Examples:
feat(auth): add JWT token refresh mechanism
fix(api): resolve race condition in user endpoint
refactor(db): extract connection pool to shared module`;

export async function generateCommitMessage(service: DeepSeekService): Promise<string | null> {
  const diff = await getGitDiff();

  // Truncate large diffs
  const truncatedDiff = diff.length > 10000
    ? diff.substring(0, 10000) + '\n... (diff truncated)'
    : diff;

  const messages: DeepSeekMessage[] = [
    { role: 'system', content: COMMIT_SYSTEM_PROMPT },
    { role: 'user', content: `Generate a conventional commit message for these staged changes:\n\n${truncatedDiff}` }
  ];

  const commitMsg = await service.chat(messages);
  return commitMsg.trim();
}
