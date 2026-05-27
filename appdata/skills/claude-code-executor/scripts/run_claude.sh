#!/usr/bin/env bash
# Run Claude Code non-interactively against a project path.
# Usage:
#   run_claude.sh <project_path> <prompt_or_file>
#
# If the second argument is a readable file, its content is used as the prompt.
# Otherwise the argument itself is treated as the prompt string.
#
# Optional env vars:
#   CLAUDE_MODEL          - model override (e.g. claude-opus-4-7)
#   CLAUDE_PERMISSION     - permission mode (default: dontAsk)
#   CLAUDE_OUTPUT_FORMAT  - output format: text | json | stream-json (default: text)
#   CLAUDE_MAX_BUDGET     - max spend in USD (e.g. 0.50); unset = no limit

set -euo pipefail

PROJECT_PATH="${1:?Usage: run_claude.sh <project_path> <prompt_or_file>}"
PROMPT_ARG="${2:?Usage: run_claude.sh <project_path> <prompt_or_file>}"

PERMISSION="${CLAUDE_PERMISSION:-dontAsk}"
OUTPUT_FORMAT="${CLAUDE_OUTPUT_FORMAT:-text}"

if [[ ! -d "$PROJECT_PATH" ]]; then
  echo "ERROR: project path does not exist: $PROJECT_PATH" >&2
  exit 1
fi

# Build the base command
CMD=(claude -p --permission-mode "$PERMISSION" --output-format "$OUTPUT_FORMAT")

[[ -n "${CLAUDE_MODEL:-}" ]]      && CMD+=(--model "$CLAUDE_MODEL")
[[ -n "${CLAUDE_MAX_BUDGET:-}" ]] && CMD+=(--max-budget-usd "$CLAUDE_MAX_BUDGET")

if [[ -f "$PROMPT_ARG" ]]; then
  # Prompt from file
  (cd "$PROJECT_PATH" && "${CMD[@]}" < "$PROMPT_ARG")
else
  # Inline prompt string
  (cd "$PROJECT_PATH" && "${CMD[@]}" "$PROMPT_ARG")
fi
