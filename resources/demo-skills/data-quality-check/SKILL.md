---
name: data-quality-check
description: Inspect CSV, JSON, or spreadsheet-like datasets for schema mismatches, missing values, duplicates, and suspicious records when the user asks for data validation or cleanup.
license: MIT
compatibility: Works with local files that Friday is allowed to read; scripts require Node.js.
metadata:
  author: friday-demo
  version: "1.0.0"
  domain: analytics
allowed-tools: Read Bash(node:*)
user-invocable: true
---

# Data Quality Check

Use this skill when the user asks whether a dataset is clean, valid, ready to import, or safe to analyze.

## Workflow

1. Confirm the file path, expected schema, and target use case.
2. Inspect headers, record count, types, missing values, duplicate keys, and outliers.
3. Report issues by severity: blocker, warning, or note.
4. Recommend the smallest cleanup action that makes the dataset usable.

For CSV header checks, run `scripts/check_csv_headers.mjs <file.csv>`.
For a broader review, read `references/data-quality-checklist.md`.
Use `assets/data-quality-report-template.md` when the user wants a formal report.

## Output Standard

- Include the checked file path.
- Show exact column names for schema issues.
- Include example rows only when they help diagnose the issue.
- Do not modify the source file unless the user explicitly asks.
