import * as vscode from 'vscode';
import { ChatPanelProvider } from './webview/chatPanel';
import { DeepSeekService } from './services/deepseekApi';
import { handleCodeAction, CodeActionType } from './commands/codeActions';
import { generateCommitMessage } from './utils/gitCommit';

let deepseekService: DeepSeekService;

export function activate(context: vscode.ExtensionContext) {
  deepseekService = new DeepSeekService();

  // ---- Webview Sidebar Chat Panel ----
  const chatProvider = new ChatPanelProvider(context.extensionUri, deepseekService);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('deepseekChatPanel', chatProvider)
  );

  // ---- Command: Open Chat Panel ----
  context.subscriptions.push(
    vscode.commands.registerCommand('deepseek.openChat', () => {
      vscode.commands.executeCommand('workbench.view.extension.deepseek-assistant');
    })
  );

  // ---- Code Action Commands ----
  registerCodeActionCommand(context, 'deepseek.explainCode', 'explain');
  registerCodeActionCommand(context, 'deepseek.refactorCode', 'refactor');
  registerCodeActionCommand(context, 'deepseek.fixBug', 'fix');
  registerCodeActionCommand(context, 'deepseek.generateComments', 'comments');
  registerCodeActionCommand(context, 'deepseek.generateTests', 'tests');

  // ---- Git Commit Message Command ----
  context.subscriptions.push(
    vscode.commands.registerCommand('deepseek.generateCommitMessage', async () => {
      try {
        const commitMsg = await generateCommitMessage(deepseekService);
        if (commitMsg) {
          const scmInput = vscode.window.createOutputChannel('DeepSeek Commit');
          // Fill the SCM input box
          await vscode.commands.executeCommand('workbench.view.scm');
          await vscode.env.clipboard.writeText(commitMsg);
          vscode.window.showInformationMessage(
            'DeepSeek: Commit message copied to clipboard! Paste it into the SCM input box.'
          );
        }
      } catch (err: any) {
        vscode.window.showErrorMessage(`DeepSeek: ${err.message}`);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('deepseek.sendToChat', (prompt: string) => {
      chatProvider.sendPrompt(prompt);
    })
  );

  vscode.window.showInformationMessage('DeepSeek Assistant activated!');
}

function registerCodeActionCommand(
  context: vscode.ExtensionContext,
  command: string,
  actionType: CodeActionType
) {
  context.subscriptions.push(
    vscode.commands.registerCommand(command, async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) { return; }

      const selection = editor.selection;
      if (selection.isEmpty) {
        vscode.window.showWarningMessage('Please select some code first.');
        return;
      }

      const selectedText = editor.document.getText(selection);
      const language = editor.document.languageId;

      await handleCodeAction(deepseekService, actionType, selectedText, language);
    })
  );
}

export function deactivate() {}
