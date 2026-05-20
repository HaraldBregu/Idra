---
name: research-brief
description: Produce concise research briefs from provided documents, links, or notes when the user asks for a sourced summary, market scan, or decision memo.
license: MIT
compatibility: Requires access to the source documents, files, or links the user asks to summarize.
metadata:
  author: friday-demo
  version: "1.0.0"
  domain: research
allowed-tools: Read Grep WebSearch WebFetch
user-invocable: true
---

# Research Brief

Use this skill when the user needs a short, source-grounded brief rather than a long report.

## Workflow

1. Identify the decision or question the brief must answer.
2. Gather only the sources the user provided or approved.
3. Extract facts, claims, dates, figures, and uncertainties.
4. Separate direct evidence from inference.
5. Write a compact brief with an executive summary, key findings, risks, and next steps.

Use `references/brief-outline.md` when the user asks for a full decision memo or market scan.
Use `assets/brief-template.md` when the user asks for a reusable Markdown template.

## Output Standard

- Keep the first summary under five bullets.
- Cite local file paths, document titles, or URLs when available.
- Mark unresolved claims as `Needs verification`.
- Do not invent sources or certainty.
