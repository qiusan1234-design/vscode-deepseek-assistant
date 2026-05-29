import * as vscode from 'vscode';
import {
  DeepSeekService,
  DeepSeekMessage,
  DeepSeekModel,
  getAvailableModels,
  getModelDisplayName
} from '../services/deepseekApi';

export class ChatPanelProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly _service: DeepSeekService
  ) {}

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri]
    };

    webviewView.webview.html = this._getHtml();

    // Handle messages from webview
    webviewView.webview.onDidReceiveMessage(async (msg) => {
      switch (msg.type) {
        case 'chat': {
          const { messages, model } = msg.payload as {
            messages: DeepSeekMessage[];
            model: DeepSeekModel;
          };
          try {
            await this._service.chat(messages, model, {
              stream: true,
              onToken: (token: string) => {
                webviewView.webview.postMessage({ type: 'token', payload: token });
              }
            });
            webviewView.webview.postMessage({ type: 'done' });
          } catch (err: any) {
            webviewView.webview.postMessage({ type: 'error', payload: err.message });
          }
          break;
        }
        case 'openSettings': {
          vscode.commands.executeCommand('workbench.action.openSettings', 'deepseek');
          break;
        }
      }
    });
  }

  sendPrompt(prompt: string) {
    if (this._view) {
      this._view.webview.postMessage({ type: 'sendPrompt', payload: prompt });
      this._view.show?.(true);
    }
  }

  private _getHtml(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    :root {
      --bg-primary: var(--vscode-sideBar-background);
      --bg-secondary: var(--vscode-input-background);
      --text-primary: var(--vscode-foreground);
      --text-secondary: var(--vscode-descriptionForeground);
      --border: var(--vscode-panel-border);
      --accent: var(--vscode-button-background);
      --accent-hover: var(--vscode-button-hoverBackground);
      --accent-fg: var(--vscode-button-foreground);
      --user-bubble: var(--vscode-textLink-foreground);
      --code-bg: var(--vscode-textCodeBlock-background);
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      background: var(--bg-primary);
      color: var(--text-primary);
      height: 100vh;
      display: flex;
      flex-direction: column;
    }

    .header {
      padding: 8px 12px;
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
    }
    .header h3 {
      font-size: 13px;
      font-weight: 600;
      margin: 0;
    }
    .header-actions {
      display: flex;
      gap: 4px;
    }
    .header-actions vscode-button {
      font-size: 11px;
    }

    .model-bar {
      display: flex;
      gap: 4px;
      padding: 6px 12px;
      border-bottom: 1px solid var(--border);
      flex-shrink: 0;
    }
    .model-chip {
      padding: 3px 10px;
      border-radius: 12px;
      border: 1px solid var(--border);
      background: transparent;
      color: var(--text-secondary);
      cursor: pointer;
      font-size: 11px;
      transition: all 0.15s;
    }
    .model-chip:hover { border-color: var(--accent); color: var(--text-primary); }
    .model-chip.active {
      background: var(--accent);
      color: var(--accent-fg);
      border-color: var(--accent);
    }

    .chat-area {
      flex: 1;
      overflow-y: auto;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .chat-area::-webkit-scrollbar { width: 6px; }
    .chat-area::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }

    .welcome {
      text-align: center;
      color: var(--text-secondary);
      padding: 24px 12px;
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
    .welcome .icon { font-size: 40px; margin-bottom: 8px; }
    .welcome h4 { font-size: 14px; }
    .welcome p { font-size: 12px; line-height: 1.6; }
    .welcome .quick-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      justify-content: center;
      margin-top: 8px;
    }
    .quick-btn {
      padding: 5px 12px;
      border-radius: 14px;
      border: 1px solid var(--border);
      background: var(--bg-secondary);
      color: var(--text-primary);
      cursor: pointer;
      font-size: 11px;
      transition: all 0.15s;
    }
    .quick-btn:hover { border-color: var(--accent); }

    .message {
      padding: 10px 12px;
      border-radius: 8px;
      max-width: 100%;
      word-wrap: break-word;
      font-size: 13px;
      line-height: 1.55;
    }
    .message.user {
      background: var(--user-bubble);
      color: #fff;
      align-self: flex-end;
    }
    .message.assistant {
      background: var(--bg-secondary);
      align-self: flex-start;
    }
    .message pre {
      background: var(--code-bg);
      padding: 10px;
      border-radius: 6px;
      overflow-x: auto;
      margin: 6px 0;
      font-size: 12px;
    }
    .message code {
      font-family: var(--vscode-editor-font-family);
      font-size: 12px;
    }

    .typing-indicator {
      color: var(--text-secondary);
      font-size: 12px;
      padding: 4px 12px;
    }

    .input-bar {
      display: flex;
      gap: 6px;
      padding: 8px 12px;
      border-top: 1px solid var(--border);
      flex-shrink: 0;
    }
    .input-bar textarea {
      flex: 1;
      background: var(--bg-secondary);
      color: var(--text-primary);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 8px 10px;
      resize: none;
      font-family: var(--vscode-font-family);
      font-size: 13px;
      min-height: 36px;
      max-height: 120px;
      outline: none;
    }
    .input-bar textarea:focus { border-color: var(--accent); }
    .input-bar vscode-button { align-self: flex-end; }

    .error-msg {
      color: var(--vscode-errorForeground);
      font-size: 12px;
      padding: 8px 12px;
      background: var(--vscode-inputValidation-errorBackground);
      border: 1px solid var(--vscode-inputValidation-errorBorder);
      border-radius: 6px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h3>DeepSeek Chat</h3>
    <div class="header-actions">
      <button class="quick-btn" onclick="clearChat()" title="Clear chat">Clear</button>
      <button class="quick-btn" onclick="openSettings()" title="Settings">⚙</button>
    </div>
  </div>

  <div class="model-bar" id="modelBar"></div>

  <div class="chat-area" id="chatArea">
    <div class="welcome" id="welcome">
      <div class="icon">🧠</div>
      <h4>DeepSeek Assistant</h4>
      <p>Ask questions, get code explanations, refactor, generate tests, and more.</p>
      <div class="quick-actions">
        <button class="quick-btn" onclick="quickAsk('Explain the selected code')">Explain Code</button>
        <button class="quick-btn" onclick="quickAsk('Refactor this code for better readability')">Refactor</button>
        <button class="quick-btn" onclick="quickAsk('Find bugs in this code')">Find Bugs</button>
        <button class="quick-btn" onclick="quickAsk('Write unit tests for this code')">Unit Tests</button>
      </div>
    </div>
  </div>

  <div class="input-bar">
    <textarea id="promptInput" rows="1" placeholder="Ask DeepSeek anything... (Shift+Enter for new line)" onkeydown="handleKey(event)"></textarea>
    <button class="quick-btn" onclick="sendMessage()" id="sendBtn">Send</button>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    const chatArea = document.getElementById('chatArea');
    const promptInput = document.getElementById('promptInput');
    const welcome = document.getElementById('welcome');
    const modelBar = document.getElementById('modelBar');

    let currentModel = 'deepseek-chat';
    let messages = [];
    let currentAssistantMsg = null;
    let currentCodeBlock = null;

    const models = [
      { id: 'deepseek-chat', name: 'V4-Pro' },
      { id: 'deepseek-reasoner', name: 'R1' },
      { id: 'deepseek-coder', name: 'Coder' }
    ];

    // Build model chips
    models.forEach(m => {
      const chip = document.createElement('button');
      chip.className = 'model-chip' + (m.id === currentModel ? ' active' : '');
      chip.textContent = m.name;
      chip.title = m.name;
      chip.onclick = () => switchModel(m.id, chip);
      chip.setAttribute('data-model', m.id);
      modelBar.appendChild(chip);
    });

    function switchModel(modelId, chip) {
      currentModel = modelId;
      document.querySelectorAll('.model-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
    }

    function handleKey(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    }

    function quickAsk(prompt) {
      promptInput.value = prompt;
      sendMessage();
    }

    function clearChat() {
      messages = [];
      chatArea.innerHTML = '';
      chatArea.appendChild(welcome);
      welcome.style.display = 'flex';
    }

    function openSettings() {
      vscode.postMessage({ type: 'openSettings' });
    }

    function sendMessage() {
      const text = promptInput.value.trim();
      if (!text) return;

      // Hide welcome
      welcome.style.display = 'none';

      // Add user message to UI
      const userDiv = document.createElement('div');
      userDiv.className = 'message user';
      userDiv.textContent = text;
      chatArea.appendChild(userDiv);

      // Add assistant placeholder
      const assistantDiv = document.createElement('div');
      assistantDiv.className = 'message assistant';
      assistantDiv.setAttribute('id', 'assistant-' + Date.now());
      assistantDiv.textContent = '...';
      chatArea.appendChild(assistantDiv);
      currentAssistantMsg = assistantDiv;
      currentCodeBlock = null;

      promptInput.value = '';
      chatArea.scrollTop = chatArea.scrollHeight;

      // Build messages
      messages.push({ role: 'user', content: text });

      vscode.postMessage({
        type: 'chat',
        payload: { messages: [...messages], model: currentModel }
      });
    }

    // Handle messages from extension
    window.addEventListener('message', event => {
      const msg = event.data;
      switch (msg.type) {
        case 'token':
          if (currentAssistantMsg) {
            if (currentAssistantMsg.textContent === '...') {
              currentAssistantMsg.textContent = '';
            }
            appendWithCodeHighlight(currentAssistantMsg, msg.payload);
            chatArea.scrollTop = chatArea.scrollHeight;
          }
          break;
        case 'done':
          if (currentAssistantMsg) {
            messages.push({ role: 'assistant', content: currentAssistantMsg.textContent });
            currentAssistantMsg = null;
            currentCodeBlock = null;
          }
          break;
        case 'error':
          if (currentAssistantMsg) {
            currentAssistantMsg.className = 'error-msg';
            currentAssistantMsg.textContent = 'Error: ' + msg.payload;
            currentAssistantMsg = null;
          }
          break;
        case 'sendPrompt':
          promptInput.value = msg.payload;
          sendMessage();
          break;
      }
    });

    function appendWithCodeHighlight(container, text) {
      // Simple code block detection
      if (!container._rawText) container._rawText = '';
      container._rawText += text;

      const raw = container._rawText;
      let html = '';
      let i = 0;

      // Escape HTML
      const escaped = raw.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

      // Simple markdown rendering: code blocks and inline code
      const parts = escaped.split(/(\x60{3}[\\s\\S]*?\x60{3}|\x60[^\x60]+\x60)/g);
      html = parts.map(p => {
        if (p.startsWith('\x60\x60\x60')) {
          const code = p.slice(3, -3);
          const langEnd = code.indexOf('\\n');
          const lang = langEnd > 0 ? code.substring(0, langEnd) : '';
          const content = langEnd > 0 ? code.substring(langEnd + 1) : code;
          return '<pre>' + (lang ? '<small>' + lang + '</small>\\n' : '') + content + '</pre>';
        }
        if (p.startsWith('\x60') && p.endsWith('\x60')) {
          return '<code>' + p.slice(1, -1) + '</code>';
        }
        return p.replace(/\\n/g, '<br>');
      }).join('');

      container.innerHTML = html;
    }
  </script>
</body>
</html>`;
  }
}
