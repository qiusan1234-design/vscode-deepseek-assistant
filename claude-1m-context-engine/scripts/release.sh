#!/usr/bin/env bash
# ============================================================
# Release script for Claude 1M Context Engine
# ============================================================
set -euo pipefail

VERSION=${1:-}
if [ -z "$VERSION" ]; then
  echo "Usage: ./scripts/release.sh <version>"
  echo "Example: ./scripts/release.sh 1.0.0"
  exit 1
fi

echo "=== Releasing version $VERSION ==="

# Ensure clean working directory
if [ -n "$(git status --porcelain)" ]; then
  echo "Error: Working directory is not clean. Commit or stash changes first."
  exit 1
fi

# Run tests
echo "[1/5] Running tests..."
npm test || { echo "Tests failed"; exit 1; }

# Build all packages
echo "[2/5] Building packages..."
npm run build:core
npm run build:server
npm run build:cli

# Update version across all packages
echo "[3/5] Updating version to $VERSION..."
npm version "$VERSION" --no-git-tag-version
cd packages/core && npm version "$VERSION" --no-git-tag-version && cd ../..
cd packages/server && npm version "$VERSION" --no-git-tag-version && cd ../..
cd packages/cli && npm version "$VERSION" --no-git-tag-version && cd ../..
cd packages/vscode && npm version "$VERSION" --no-git-tag-version && cd ../..

# Commit and tag
echo "[4/5] Creating release commit..."
git add -A
git commit -m "release: v$VERSION"
git tag "v$VERSION"

# Push
echo "[5/5] Pushing..."
git push origin main
git push origin "v$VERSION"

echo "=== Released v$VERSION ==="
echo "Don't forget to create the GitHub Release:"
echo "  https://github.com/qiusan1234-design/claude-1m-context-engine/releases/new?tag=v$VERSION"
