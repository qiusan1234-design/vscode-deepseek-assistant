<p align="center">
  <img src="media/deepseek-icon.svg" width="80" alt="DeepSeek Assistant Logo">
</p>

<h1 align="center">DeepSeek Assistant for VSCode</h1>

<p align="center">
  <strong>Your AI-powered coding companion — Chat, Refactor, Test, Commit, all within VSCode.</strong>
</p>

<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=deepseek-assistant.vscode-deepseek-assistant">
    <img src="https://img.shields.io/badge/VS%20Marketplace-Install-blue?logo=visualstudiocode" alt="Install">
  </a>
  <a href="https://github.com/qiusan1234-design/vscode-deepseek-assistant/stargazers">
    <img src="https://img.shields.io/github/stars/qiusan1234-design/vscode-deepseek-assistant?style=social" alt="Stars">
  </a>
  <img src="https://img.shields.io/github/license/qiusan1234-design/vscode-deepseek-assistant" alt="License">
  <img src="https://img.shields.io/badge/VSCode-%3E%3D1.82.0-007ACC" alt="VSCode">
</p>

<p align="center">
  <a href="#english">English</a> | <a href="#中文">中文</a>
</p>

<hr>

<h1 id="english">🚀 Features</h1>

<table>
<tr>
<td width="50%">

### 💬 Smart Chat Panel
- Sidebar chat with **streaming responses**
- Full conversation history
- Markdown + code syntax highlighting
- Quick action buttons

</td>
<td width="50%">

### 🤖 Multi-Model Support
- **DeepSeek-V4-Pro** — General purpose
- **DeepSeek-R1** — Deep reasoning
- **DeepSeek-Coder** — Code specialist
- One-click model switching

</td>
</tr>
<tr>
<td>

### ⚡ Code Actions
- **Explain Code** — Understand any code
- **Refactor** — Improve readability & performance
- **Fix Bugs** — Find & fix issues
- **Generate Comments** — Auto-documentation
- **Generate Unit Tests** — Full coverage

</td>
<td>

### 🔧 Developer Experience
- **Right-click** context menu
- **Command Palette** (Ctrl+Shift+P)
- **Keyboard Shortcuts**
- **SCM Integration** — Auto commit messages
- **Private API** endpoint support

</td>
</tr>
</table>

---

## 📦 Installation

### From VS Marketplace (Recommended)
1. Open **VSCode**
2. Go to Extensions (`Ctrl+Shift+X`)
3. Search `DeepSeek Assistant`
4. Click **Install**

### Manual Install
```bash
# Download the .vsix file
wget https://github.com/qiusan1234-design/vscode-deepseek-assistant/releases/latest/download/vscode-deepseek-assistant.vsix

# Install in VSCode
code --install-extension vscode-deepseek-assistant.vsix
```

---

## ⚙️ Configuration

Get your **free API key** at [platform.deepseek.com/api_keys](https://platform.deepseek.com/api_keys)

| Setting | Default | Description |
|---|---|---|
| `deepseek.apiKey` | `""` | Your DeepSeek API Key |
| `deepseek.baseUrl` | `https://api.deepseek.com` | Custom endpoint (supports private deployments) |
| `deepseek.defaultModel` | `deepseek-chat` | Default model: `deepseek-chat` / `deepseek-reasoner` / `deepseek-coder` |
| `deepseek.maxTokens` | `4096` | Maximum response tokens |
| `deepseek.temperature` | `0.7` | Creativity level (0-2) |

```jsonc
// settings.json
{
  "deepseek.apiKey": "sk-your-api-key-here",
  "deepseek.baseUrl": "https://api.deepseek.com",
  "deepseek.defaultModel": "deepseek-chat",
  "deepseek.maxTokens": 4096,
  "deepseek.temperature": 0.7
}
```

---

## 🎮 Usage

### Chat Panel
1. Click the **DeepSeek** icon <img src="media/deepseek-icon.svg" width="16"> in the Activity Bar
2. Select a model (V4-Pro / R1 / Coder)
3. Type your question and press **Enter**

### Code Actions
| Action | Shortcut | Command |
|---|---|---|
| Explain Code | `Ctrl+Shift+D Ctrl+E` | `DeepSeek: Explain Selected Code` |
| Refactor | — | `DeepSeek: Refactor Selected Code` |
| Fix Bugs | — | `DeepSeek: Find & Fix Bugs` |
| Comments | — | `DeepSeek: Generate Comments` |
| Unit Tests | — | `DeepSeek: Generate Unit Tests` |

**Right-click** selected code → choose any action from the context menu.

### Git Commit Message
1. Stage your changes (`git add .`)
2. Click the **DeepSeek icon** in the SCM (Source Control) title bar
3. The generated message is copied to your clipboard — paste into the commit box!

---

## 🛠️ Development

```bash
# Clone
git clone https://github.com/qiusan1234-design/vscode-deepseek-assistant.git
cd vscode-deepseek-assistant

# Install dependencies
npm install

# Compile
npm run compile

# Open in VSCode & press F5 to debug
code .
```

---

## 📁 Project Structure

```
vscode-deepseek-assistant/
├── .vscode/
│   ├── launch.json          # Debug configuration
│   └── tasks.json           # Build tasks
├── src/
│   ├── extension.ts          # Entry point
│   ├── webview/
│   │   └── chatPanel.ts      # Chat webview provider
│   ├── commands/
│   │   └── codeActions.ts    # Code action handlers
│   ├── services/
│   │   └── deepseekApi.ts    # DeepSeek API client
│   └── utils/
│       └── gitCommit.ts      # Git commit generator
├── media/
│   └── deepseek-icon.svg     # Extension icon
├── package.json              # Extension manifest
├── tsconfig.json             # TypeScript config
├── .vscodeignore
└── README.md
```

---

## ⭐ Star History

If this extension helps you code faster, **please give us a Star** ⭐ — it helps more developers discover it!

<a href="https://star-history.com/#qiusan1234-design/vscode-deepseek-assistant&Date">
  <img src="https://api.star-history.com/svg?repos=qiusan1234-design/vscode-deepseek-assistant&type=Date" alt="Star History Chart" width="600">
</a>

---

## 📄 License

MIT © [qiusan1234-design](https://github.com/qiusan1234-design)

---

<hr>

<h1 id="中文">🚀 功能特性</h1>

<table>
<tr>
<td width="50%">

### 💬 智能聊天面板
- 侧边栏聊天，支持**流式响应**
- 完整对话历史
- Markdown + 代码高亮
- 快捷操作按钮

</td>
<td width="50%">

### 🤖 多模型支持
- **DeepSeek-V4-Pro** — 通用对话
- **DeepSeek-R1** — 深度推理
- **DeepSeek-Coder** — 代码专家
- 一键切换模型

</td>
</tr>
<tr>
<td>

### ⚡ 代码操作
- **解释代码** — 快速理解任何代码
- **重构优化** — 提升可读性与性能
- **Bug 修复** — 查找并修复问题
- **生成注释** — 自动编写文档
- **生成单元测试** — 全覆盖测试

</td>
<td>

### 🔧 开发者体验
- **右键菜单**快捷调用
- **命令面板**（Ctrl+Shift+P）
- **键盘快捷键**
- **SCM 集成** — 一键生成 commit 信息
- **私有化部署** API 地址支持

</td>
</tr>
</table>

---

## 📦 安装

### 从 VS 插件市场安装（推荐）
1. 打开 **VSCode**
2. 进入扩展面板 (`Ctrl+Shift+X`)
3. 搜索 `DeepSeek Assistant`
4. 点击 **安装**

### 本地安装
```bash
# 下载 .vsix 文件
wget https://github.com/qiusan1234-design/vscode-deepseek-assistant/releases/latest/download/vscode-deepseek-assistant.vsix

# 在 VSCode 中安装
code --install-extension vscode-deepseek-assistant.vsix
```

---

## ⚙️ 配置

在 [platform.deepseek.com/api_keys](https://platform.deepseek.com/api_keys) 获取**免费 API Key**

| 配置项 | 默认值 | 说明 |
|---|---|---|
| `deepseek.apiKey` | `""` | DeepSeek API 密钥 |
| `deepseek.baseUrl` | `https://api.deepseek.com` | 自定义接口地址（支持私有化部署） |
| `deepseek.defaultModel` | `deepseek-chat` | 默认模型 |
| `deepseek.maxTokens` | `4096` | 最大返回 token 数 |
| `deepseek.temperature` | `0.7` | 生成温度 (0-2) |

---

## 🎮 使用方法

### 聊天面板
1. 点击活动栏的 **DeepSeek 图标** <img src="media/deepseek-icon.svg" width="16">
2. 选择模型（V4-Pro / R1 / Coder）
3. 输入问题，按 **Enter** 发送

### 代码操作
选中代码 → **右键菜单** 或 **命令面板** 选择操作：

| 操作 | 快捷键 | 命令 |
|---|---|---|
| 解释代码 | `Ctrl+Shift+D Ctrl+E` | `DeepSeek: Explain Selected Code` |
| 重构优化 | — | `DeepSeek: Refactor Selected Code` |
| 修复 Bug | — | `DeepSeek: Find & Fix Bugs` |
| 生成注释 | — | `DeepSeek: Generate Comments` |
| 单元测试 | — | `DeepSeek: Generate Unit Tests` |

### Git Commit 信息
1. `git add .` 暂存变更
2. 在 SCM 标题栏点击 **DeepSeek 图标**
3. 生成的 commit 信息已复制到剪贴板 → 粘贴即可！

---

