<p align="center">
  <h1 align="center">Claude 1M Context Engine</h1>
  <p align="center">
    <strong>超长100万token上下文知识库引擎 — 不切片，整文档直读，真正发挥Claude极限上下文</strong>
  </p>
  <p align="center">
    <a href="https://github.com/qiusan1234-design/claude-1m-context-engine/stargazers">
      <img src="https://img.shields.io/github/stars/qiusan1234-design/claude-1m-context-engine?style=social" alt="Stars">
    </a>
    <a href="https://github.com/qiusan1234-design/claude-1m-context-engine/blob/main/LICENSE">
      <img src="https://img.shields.io/github/license/qiusan1234-design/claude-1m-context-engine" alt="License">
    </a>
    <img src="https://img.shields.io/badge/TypeScript-5.7-blue" alt="TypeScript">
    <img src="https://img.shields.io/badge/Node.js-%3E%3D20-green" alt="Node.js">
    <img src="https://img.shields.io/badge/Claude-100万%20上下文-orange" alt="Claude">
  </p>
</p>

<p align="center">
  <a href="README.md">English</a> ·
  <a href="#快速开始">快速开始</a> ·
  <a href="#核心功能">核心功能</a> ·
  <a href="docs/architecture.md">架构设计</a> ·
  <a href="docs/api.md">API 文档</a>
</p>

---

## 为什么做这个项目

市面上所有 RAG 方案都在**切片**——把文档切成 500 token 的小块，然后用向量检索拼凑答案。但 Claude 的**100 万 token 上下文窗口**已经彻底改变了游戏规则。

一本书、一整本代码库、几百篇论文——全都可以**整文档直接塞进上下文**，Claude 能通读所有内容，不需要检索碎片、不需要拼接幻觉、不需要丢失交叉引用。

这个项目是**第一个真正发挥 100 万上下文潜力**的不切片本地知识库引擎。

---

## 核心功能

### 🔥 不切片直接读
- **整文档加载**——保留原始结构、章节逻辑、交叉引用，彻底告别碎片化
- **上下文内存树**——层级化知识组织，LRU+优先级双向淘汰策略
- **本地向量缓存**——轻量级 TF-IDF 倒排检索，无需外部向量数据库

### 🔒 本地私有化部署
- **100% 本地运行**——所有数据存储在本地，仅 Claude API 调用出站
- **无云依赖**——不需要 Pinecone、Weaviate、Chroma 等外部向量库
- **Token 鉴权**——可选 API Token，安全开放给局域网内使用

### 🧩 VSCode 深度集成
- 侧边栏上下文树可视化
- 文件保存时自动入库
- 内嵌查询面板，支持流式响应
- 状态栏引擎状态指示

### 🇨🇳 中文文档专项优化
- **GBK/GB2312/UTF-8** 自动检测编码
- **中文分词感知**的 Token 计数（中文 token 消耗约为英文的 1/3）
- 中/英/混合文档语言自动识别
- 中文优化 System Prompt

### ⚡ CLI 命令行工具
```bash
c1m ingest ./论文.pdf          # 直接吃进整篇论文
c1m query "核心结论是什么" --stream  # 流式提问
c1m serve --port 3721           # 一键启动本地服务
```

---

## 快速开始

### 环境要求
- Node.js >= 20
- [Anthropic API Key](https://console.anthropic.com/)

### 一键部署

```bash
# Linux/macOS
git clone https://github.com/qiusan1234-design/claude-1m-context-engine.git
cd claude-1m-context-engine
bash deploy.sh

# Windows (PowerShell)
.\deploy.ps1
```

### Docker 部署

```bash
export ANTHROPIC_API_KEY=sk-ant-your-key
docker compose up -d
```

### 手动安装

```bash
npm install
npm run build:core
npm run build:server
npm run build:cli

# 设置 API Key
export ANTHROPIC_API_KEY=sk-ant-your-key

# 启动服务
npm run dev:server
# 访问 http://127.0.0.1:3721
```

---

## 使用方式

### CLI 命令行

```bash
# 导入文档
npx c1m ingest ./docs/研究报告.pdf

# 导入整个目录
npx c1m ingest ./我的资料库/

# 流式查询
npx c1m query "这份报告的核心发现是什么？" --stream

# 创建上下文树
npx c1m tree create 我的项目

# 将文档加入树
npx c1m tree add <tree-id> ./docs/架构设计.md

# 查看统计
npx c1m stats

# 启动 API 服务
npx c1m serve --port 3721
```

### API 接口

```bash
# 健康检查
curl http://127.0.0.1:3721/health

# 本地文件入库
curl -X POST http://127.0.0.1:3721/api/documents/ingest-path \
  -H "Content-Type: application/json" \
  -d '{"filePath": "/data/论文.pdf", "tags": ["深度学习"]}'

# 查询
curl -X POST http://127.0.0.1:3721/api/query \
  -H "Content-Type: application/json" \
  -d '{"query": "总结关键发现", "language": "zh"}'

# 流式查询 (SSE)
curl -X POST http://127.0.0.1:3721/api/query \
  -H "Content-Type: application/json" \
  -d '{"query": "解释架构设计", "stream": true}'
```

### TypeScript 开发

```typescript
import { Claude1MContextEngine } from '@claude-1m/core';

const engine = new Claude1MContextEngine({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  model: 'claude-sonnet-4-6',
  maxContextTokens: 900000,
});

await engine.initialize();

// 导入文档
const doc = await engine.ingestFile('./docs/论文.pdf');
console.log(`已加载: ${doc.filename} (${doc.tokenCount} tokens)`);

// 创建上下文知识树
const tree = engine.createContextTree('研究项目');
engine.addToTree(tree.id, doc);

// 查询
const result = await engine.query({
  query: '这项研究的主要贡献是什么？',
  contextTreeId: tree.id,
  language: 'zh',
});

console.log(result.answer);
// 输入: ${result.usage.inputTokens} tokens, 输出: ${result.usage.outputTokens} tokens
```

---

## 为什么不用传统 RAG？

| 传统 RAG | Claude 1M Context Engine |
|:---|:---|
| 文档切成 ~500 token 碎片 | **整文档**保持原始结构 |
| 切片边界破坏语义完整性 | **自然文档边界**，逻辑不被打断 |
| 检索可能遗漏跨章节引用 | **Claude 通读全文**，不遗漏任何关联 |
| 复杂的 Embedding 流水线 | **直接 API 调用**，极简架构 |
| 必须引入向量数据库 | **本地文件缓存**，零外部依赖 |
| 从碎片拼接答案 | **整体理解推理** |

当上下文窗口达到 **100 万 token** 时，切片不是优化，而是退化。

---

## 架构总览

```
┌─────────────────────────────────────────────────────┐
│                  Claude 1M Context Engine             │
├─────────────┬─────────────┬──────────────┬───────────┤
│   VSCode    │    CLI      │  HTTP API    │ WebSocket │
│  扩展插件    │   命令行     │  接口服务     │  实时推送  │
├─────────────┴─────────────┴──────────────┴───────────┤
│                    核心引擎                           │
│  ┌───────────┐ ┌───────────┐ ┌───────────────────┐   │
│  │ 文档加载器 │ │ 上下文树   │ │ 记忆管理器         │   │
│  │ (不切片)   │ │ 管理器     │ │ (持久化 Slot)     │   │
│  └───────────┘ └───────────┘ └───────────────────┘   │
│  ┌───────────┐ ┌───────────────────────────────────┐ │
│  │ 向量缓存   │ │ 本地缓存  │ │ Claude API 客户端  │ │
│  │ (TF-IDF)  │ │ (文件系统)│ │ (带缓存优化)       │ │
│  └───────────┘ └──────────┘ └────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

---

## 项目结构

```
claude-1m-context-engine/
├── packages/
│   ├── core/         # 核心引擎（不切片、上下文树、向量缓存）
│   ├── server/       # 本地 REST + WebSocket API 服务
│   ├── cli/          # 命令行工具（c1m）
│   └── vscode/       # VSCode 扩展插件
├── tests/            # 单元测试 + 集成测试
├── examples/         # 使用示例
├── docs/             # 架构文档 + API 文档
├── deploy.sh         # 一键部署 (Linux/macOS)
├── deploy.ps1        # 一键部署 (Windows)
├── Dockerfile
├── docker-compose.yml
└── README.md
```

---

## 路线图

- [x] 核心不切片摄入引擎
- [x] 上下文内存树 + LRU 淘汰
- [x] 本地向量缓存 (TF-IDF)
- [x] VSCode 扩展 + 树形视图
- [x] CLI 工具 + 流式响应
- [x] Docker 一键部署
- [ ] 本地语义 Embedding 模型 (ONNX)
- [ ] 多模态文档支持 (图片、图表)
- [ ] 并发文档导入
- [ ] 上下文树 Diff/Merge
- [ ] Obsidian 插件
- [ ] Electron 桌面应用

---

## 贡献指南

欢迎 PR！流程：

1. Fork 本仓库
2. 创建 feature 分支
3. 提交修改
4. 运行测试: `npm test`
5. 发起 Pull Request

---

## 开源协议

Apache 2.0 © [qiusan1234-design](https://github.com/qiusan1234-design)

---

<p align="center">
  <strong>用 Claude 打造，献给所有被文档海洋淹没的人。</strong><br>
  如果这个项目帮到你，请给一个 <a href="https://github.com/qiusan1234-design/claude-1m-context-engine">⭐ Star</a>
</p>
