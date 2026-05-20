---
name: release-notes-drafter
description: Draft user-facing release notes from git commits, changelogs, issue lists, or pull request summaries when the user asks for an update announcement.
license: MIT
compatibility: Requires access to the change list, commit log, issue list, or pull request summary being converted into release notes.
metadata:
  author: friday-demo
  version: "1.0.0"
  domain: product
allowed-tools: Read Grep Bash(git:*)
user-invocable: true
---

# Release Notes Drafter

Use this skill when the user wants release notes, changelog copy, app update text, or a customer-facing launch summary.

## Workflow

1. Collect the change source: commits, pull requests, issues, or a draft changelog.
2. Group changes into user-facing themes.
3. Translate implementation details into outcomes users can understand.
4. Separate new features, improvements, fixes, and known issues.
5. Ask for audience or tone only when it materially changes the wording.

Read `references/tone-guide.md` when the user asks for a specific tone or channel.
Use `assets/release-notes-template.md` when the user wants a reusable template.

## Output Standard

- Lead with the most important user-visible change.
- Avoid internal ticket numbers unless the user asks to include them.
- Preserve technical detail for developer-facing releases.
- Call out breaking changes and required user action plainly.
