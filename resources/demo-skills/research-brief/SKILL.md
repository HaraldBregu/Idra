---
name: research-brief
description: Produce concise research briefs from provided documents, links, or notes when the user asks for a sourced summary, market scan, decision memo, or saved brief file.
license: MIT
compatibility: Requires access to the source documents, files, or links the user asks to summarize, plus write access when saving to a file.
metadata:
  author: friday-demo
  version: "1.0.0"
  domain: research
allowed-tools: Read Grep WebSearch WebFetch Write
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
6. If the user asks for a saved file, analysis document, or output path, complete the analysis first, then write a standalone Markdown brief to the requested file path.

Use `references/brief-outline.md` when the user asks for a full decision memo or market scan.
Use `assets/brief-template.md` when the user asks for a reusable Markdown template.

## File Output

- Default to replying in chat unless the user asks for a file or provides an output path.
- When saving, use the available `write` tool to create a Markdown analysis document after the source analysis is complete.
- The saved Markdown document must include: title, executive summary, key findings, risks or unknowns, and next steps.
- If the destination file already exists, read it before overwriting.
- After writing, reply with the saved path and a short summary of what was included.

## Output Standard

- Keep the first summary under five bullets.
- Cite local file paths, document titles, or URLs when available.
- Mark unresolved claims as `Needs verification`.
- Do not invent sources or certainty.
