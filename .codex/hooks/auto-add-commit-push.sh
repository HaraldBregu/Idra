#!/usr/bin/env bash
set -u

repo_root="$(git rev-parse --show-toplevel 2>/dev/null)"
if [ -z "$repo_root" ]; then
	exit 0
fi

cd "$repo_root" || exit 0

if git diff --quiet && git diff --cached --quiet && [ -z "$(git ls-files --others --exclude-standard)" ]; then
	exit 0
fi

git add -A

git restore --staged -- '*.env' '*.pem' '*.key' 'credentials.json' 2>/dev/null || true

if git diff --cached --quiet; then
	exit 0
fi

tool_name="${CODEX_TOOL_NAME:-tool}"
timestamp="$(date '+%Y-%m-%d %H:%M:%S')"
commit_message="auto: commit after ${tool_name} ${timestamp}"

git commit -m "$commit_message" || exit 0
git push || true

exit 0
