import * as vscode from 'vscode';
import { DeepSeekService, DeepSeekMessage } from '../services/deepseekApi';

export type CodeActionType = 'explain' | 'refactor' | 'fix' | 'comments' | 'tests';

const SYSTEM_PROMPTS: Record<CodeActionType, string> = {
  explain: `You are an expert programming tutor. Explain the following code clearly and concisely.
Cover:
1. What the code does (high-level overview)
2. Key logic and algorithms
3. Important functions/variables and their roles
4. Any potential issues or edge cases

Respond in the same language as the code comments, or in English if none.`,

  refactor: `You are a senior software engineer. Refactor the following code to improve:
- Readability and maintainability
- Performance where applicable
- Adherence to best practices and design patterns
- Error handling

Return ONLY the refactored code wrapped in a markdown code block with the appropriate language tag.
Briefly explain the key changes made after the code block.`,

  fix: `You are an expert debugger. Analyze the following code for bugs, logical errors, and potential runtime issues.
For each issue found:
1. Explain the bug
2. Show the problematic code
3. Provide the fix

Finally, return the complete corrected code in a markdown code block.`,

  comments: `You are a code documentation expert. Add comprehensive, professional comments to the following code.
Include:
- File/Module-level description
- Function/method JSDoc/Docstring comments
- Inline comments for complex logic
- TODO markers for potential improvements

Return the fully commented code in a markdown code block. Keep all original code unchanged, only add comments.`,

  tests: `You are a QA engineer. Generate comprehensive unit tests for the following code.
Include:
- Tests for normal/expected inputs
- Edge cases and boundary conditions
- Error handling tests
- Mocking of external dependencies where needed

Match the testing framework to the language (Jest for JS/TS, pytest for Python, etc.).
Return ONLY the test code in a markdown code block.`
};

export async function handleCodeAction(
  service: DeepSeekService,
  actionType: CodeActionType,
  selectedText: string,
  language: string
): Promise<void> {
  const actionNames: Record<CodeActionType, string> = {
    explain: 'Explaining Code',
    refactor: 'Refactoring Code',
    fix: 'Finding & Fixing Bugs',
    comments: 'Generating Comments',
    tests: 'Generating Unit Tests'
  };

  const channelName = `DeepSeek - ${actionNames[actionType]}`;
  const channel = vscode.window.createOutputChannel(channelName);
  channel.show(true);
  channel.appendLine(`--- ${actionNames[actionType]} ---\n`);

  const messages: DeepSeekMessage[] = [
    { role: 'system', content: SYSTEM_PROMPTS[actionType] },
    { role: 'user', content: `Language: ${language}\n\nCode:\n\`\`\`${language}\n${selectedText}\n\`\`\`` }
  ];

  try {
    channel.appendLine('Processing...\n');

    const result = await service.chat(messages, undefined, {
      stream: true,
      onToken: (token: string) => {
        channel.append(token);
      }
    });

    channel.appendLine('\n\n--- Done ---');
  } catch (err: any) {
    channel.appendLine(`\nError: ${err.message}`);
    vscode.window.showErrorMessage(`DeepSeek: ${err.message}`);
  }
}
