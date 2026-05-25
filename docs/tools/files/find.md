# find

`find` locates files by name, path, or pattern.

## Tool Search Description

Use `find` to locate relevant files or paths before reading, editing, or answering from workspace content.

## Use For

- Discovering where relevant files live.
- Narrowing work before reading or editing.

## Do Not Use For

- Aimless scanning.
- Reading file contents.

## Pattern Syntax

Patterns follow glob conventions:

| Wildcard | Matches |
| --- | --- |
| `*` | Any characters within a single path segment |
| `**` | Any characters across path segments (recursive) |
| `?` | Any single character |
| `[abc]` | One of the listed characters |

Examples:

| Pattern | What it finds |
| --- | --- |
| `*.ts` | TypeScript files in the current folder |
| `src/**/*.ts` | TypeScript files anywhere under `src/` |
| `**/*.test.*` | All test files in any folder |
| `config.?s` | `config.js`, `config.ts`, etc. |

## When It Fails

If no files match, report the pattern used. Do not proceed as if the file exists or guess at a path.

## Keep In Mind

Search narrowly first. A pattern that matches hundreds of files is usually too broad. Use the result to decide which files deserve deeper inspection.
