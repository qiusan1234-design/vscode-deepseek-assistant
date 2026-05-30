#!/usr/bin/env bash
# ============================================================
# Claude 1M Context Engine — One-click Deploy Script
# ============================================================
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

banner() {
  echo -e "${BLUE}"
  echo "  ╔══════════════════════════════════════════════════╗"
  echo "  ║     Claude 1M Context Engine — Deployer          ║"
  echo "  ║     100万 Token 上下文知识库引擎                    ║"
  echo "  ╚══════════════════════════════════════════════════╝"
  echo -e "${NC}"
}

check_prerequisites() {
  echo -e "${YELLOW}[1/6] Checking prerequisites...${NC}"

  if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js >= 20 is required. Install from https://nodejs.org${NC}"
    exit 1
  fi

  NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
  if [ "$NODE_VERSION" -lt 20 ]; then
    echo -e "${RED}Node.js >= 20 required. Current: $(node -v)${NC}"
    exit 1
  fi

  echo -e "  Node.js: ${GREEN}$(node -v)${NC}"
  echo -e "  npm:     ${GREEN}$(npm -v)${NC}"
}

check_env() {
  echo -e "${YELLOW}[2/6] Checking environment...${NC}"

  if [ -z "${ANTHROPIC_API_KEY:-}" ]; then
    echo -e "  ${YELLOW}ANTHROPIC_API_KEY not set. Set it with:${NC}"
    echo -e "  export ANTHROPIC_API_KEY=sk-ant-..."
    echo -e "  ${YELLOW}Continuing without API key (server won't query).${NC}"
  else
    echo -e "  ANTHROPIC_API_KEY: ${GREEN}Set${NC}"
  fi

  if [ ! -f .env ]; then
    cat > .env << 'EOF'
# Claude 1M Context Engine Configuration
ANTHROPIC_API_KEY=sk-ant-your-key-here
CLAUDE_MODEL=claude-sonnet-4-6
MAX_CONTEXT_TOKENS=900000
PORT=3721
HOST=127.0.0.1
CACHE_DIR=./data/cache
VECTOR_CACHE_DIR=./data/vector-cache
LOCAL_API_TOKEN=
EOF
    echo -e "  Created ${GREEN}.env${NC} — edit it with your API key"
  fi
}

install_deps() {
  echo -e "${YELLOW}[3/6] Installing dependencies...${NC}"
  npm install --legacy-peer-deps
  echo -e "  Dependencies: ${GREEN}Installed${NC}"
}

build_all() {
  echo -e "${YELLOW}[4/6] Building packages...${NC}"
  npm run build:core
  npm run build:server
  npm run build:cli
  echo -e "  Build: ${GREEN}Complete${NC}"
}

create_directories() {
  echo -e "${YELLOW}[5/6] Creating data directories...${NC}"
  mkdir -p data/cache data/vector-cache data/uploads
  echo -e "  Directories: ${GREEN}Created${NC}"
}

run_server() {
  echo -e "${YELLOW}[6/6] Starting server...${NC}"
  echo ""
  npm run dev:server
}

main() {
  banner
  check_prerequisites
  check_env
  install_deps
  build_all
  create_directories
  run_server
}

case "${1:-}" in
  --skip-build) install_deps; create_directories; run_server ;;
  --help|-h)
    echo "Usage: ./deploy.sh [--skip-build] [--help]"
    echo "  --skip-build   Skip the build step"
    exit 0
    ;;
  *) main ;;
esac
