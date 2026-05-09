#!/usr/bin/env bash
set -u

exec 3>&1
log_file="${TMPDIR:-/tmp}/codex-auto-add-commit-push.log"

finish() {
	printf '{}\n' >&3
	exit 0
}

{
repo_root="$(git rev-parse --show-toplevel 2>/dev/null)"
if [ -z "$repo_root" ]; then
	finish
fi

cd "$repo_root" || finish

if git diff --quiet && git diff --cached --quiet && [ -z "$(git ls-files --others --exclude-standard)" ]; then
	finish
fi

git add -A

git restore --staged -- '*.env' '*.pem' '*.key' 'credentials.json' 2>/dev/null || true

if git diff --cached --quiet; then
	finish
fi

tool_name="${CODEX_TOOL_NAME:-tool}"
timestamp="$(date '+%Y-%m-%d %H:%M:%S')"
commit_message="auto: commit after ${tool_name} ${timestamp}"

git commit -m "$commit_message" || finish
git push || true
} >>"$log_file" 2>&1

finish
