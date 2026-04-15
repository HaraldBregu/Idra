#!/usr/bin/env bash
set -euo pipefail

cd "${CLAUDE_PROJECT_DIR:-$(pwd)}"

git rev-parse --is-inside-work-tree >/dev/null 2>&1 || exit 0

git add -A

if git diff --cached --quiet; then
  exit 0
fi

TS="$(date '+%Y-%m-%d %H:%M:%S')"
BRANCH="$(git rev-parse --abbrev-ref HEAD)"

git commit -m "auto: Claude Code changes ${TS}" >/dev/null

git push origin "$BRANCH"
