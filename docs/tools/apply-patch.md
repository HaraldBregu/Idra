# apply_patch

`apply_patch` applies a planned set of related file changes inside the current workspace.

## Dependencies

Depends on the [policy module](../policy/index.md). Before applying, the policy module resolves every path in the patch and checks the required permission for each change: `write` for modified files, `create` for new files, `delete` for removed files. If any path in the patch is denied, the entire patch is rejected and no files are changed.

## Tool Search Description

Use `apply_patch` to apply a focused patch containing several related current-workspace file changes.

## Use For

- Multiple edits that should land together.
- Changes that are easier to review as one patch.
- Removing or updating related code or docs.

## Do Not Use For

- Broad cleanup the user did not ask for.
- Changes to files the agent has not inspected.
- Changes outside the current workspace.

## Format

A patch uses unified diff format. Each changed file begins with `---` and `+++` headers, followed by one or more hunks. Each hunk starts with a `@@` range line and lists context, removed (`-`), and added (`+`) lines.

```diff
--- a/src/config.ts
+++ b/src/config.ts
@@ -12,7 +12,7 @@
 const defaults = {
   timeout: 5000,
-  retries: 3,
+  retries: 5,
   logLevel: 'info',
 };
```

- Use paths relative to the workspace root.
- Do not include paths outside the current workspace.
- Include at least three lines of unchanged context around each change so the patch applies cleanly even if nearby lines have shifted.
- One patch can span multiple files. Each file gets its own `---`/`+++` block.

Do not apply a patch to a file the agent has not read. Read the file first to ensure the context lines match exactly.

## Keep In Mind

A patch should be focused. Every changed line should trace back to the user's request. Never use a patch to create, modify, move, or delete files outside the current workspace.
