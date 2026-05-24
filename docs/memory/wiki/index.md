# Wiki Memory Plan

## Purpose

Wiki memory stores curated workspace knowledge that should be stable,
inspectable, and editable as Markdown. It is separate from chat memories,
background task notes, cron run summaries, and imported RAG documents.

## Corpus Root

Use `memory/wiki/` in the agent workspace.

Suggested layout:

```text
memory/wiki/
  index.md
  projects/
    <project>.md
  people/
    <person>.md
  decisions/
    <decision>.md
```

The wiki should favor human-readable pages over generated chunk files. Runtime
indexes can be rebuilt from the Markdown pages.

## Page Format

Use Markdown with optional frontmatter:

```md
---
title: Example Page
tags: [project, decision]
owner: user
updated: 2026-05-24T00:00:00.000Z
---

# Example Page

Curated knowledge goes here.
```

## Search Rules

- Wiki can be searched by default for workspace knowledge questions.
- Wiki results must identify page path and line range.
- Wiki writes should require explicit page-edit intent or a dedicated wiki tool.
- Automatic chat/task/cron flush should not rewrite wiki pages directly.

## Implementation Phases

1. Add corpus routing for `wiki`.
2. Add guarded reads and writes under `memory/wiki/`.
3. Add wiki page search through the existing memory manager.
4. Add page frontmatter validation.
5. Add optional promotion from chat/task/cron memory after policy is defined.

## Verification

- Wiki search is separate from chat, task, cron, and RAG results.
- Wiki path guards reject symlink escapes and `..` traversal.
- Page edits preserve Markdown readability.
