# ============================================================
# Claude 1M Context Engine — Windows Deploy Script
# ============================================================

param(
    [switch]$SkipBuild,
    [switch]$Help
)

if ($Help) {
    Write-Host "Usage: .\deploy.ps1 [-SkipBuild] [-Help]"
    Write-Host "  -SkipBuild   Skip the build step"
    exit 0
}

Write-Host @"

  === Claude 1M Context Engine — Deployer ===
  100万 Token 上下文知识库引擎
"@ -ForegroundColor Cyan

# [1/6] Check prerequisites
Write-Host "[1/6] Checking prerequisites..." -ForegroundColor Yellow
try {
    $nodeVersion = node -v
    Write-Host "  Node.js: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "Node.js >= 20 is required. Install from https://nodejs.org" -ForegroundColor Red
    exit 1
}

# [2/6] Environment
Write-Host "[2/6] Checking environment..." -ForegroundColor Yellow
if (-not $env:ANTHROPIC_API_KEY) {
    Write-Host "  ANTHROPIC_API_KEY not set. Set it with: `$env:ANTHROPIC_API_KEY = 'sk-ant-...'" -ForegroundColor Yellow
}
if (-not (Test-Path .env)) {
    @"
ANTHROPIC_API_KEY=sk-ant-your-key-here
CLAUDE_MODEL=claude-sonnet-4-6
MAX_CONTEXT_TOKENS=900000
PORT=3721
HOST=127.0.0.1
CACHE_DIR=./data/cache
VECTOR_CACHE_DIR=./data/vector-cache
LOCAL_API_TOKEN=
"@ | Out-File -FilePath .env -Encoding utf8
    Write-Host "  Created .env — edit it with your API key" -ForegroundColor Green
}

# [3/6] Install
Write-Host "[3/6] Installing dependencies..." -ForegroundColor Yellow
npm install --legacy-peer-deps

# [4/6] Build
if (-not $SkipBuild) {
    Write-Host "[4/6] Building packages..." -ForegroundColor Yellow
    npm run build:core
    npm run build:server
    npm run build:cli
    Write-Host "  Build complete" -ForegroundColor Green
}

# [5/6] Create data dirs
Write-Host "[5/6] Creating data directories..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path data/cache, data/vector-cache, data/uploads | Out-Null

# [6/6] Start
Write-Host "[6/6] Starting server..." -ForegroundColor Yellow
npm run dev:server
