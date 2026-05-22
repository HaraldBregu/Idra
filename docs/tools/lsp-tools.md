# LSP Tools

LSP tools come from a language service that understands a code workspace.

## How They Are Used

- Used when code-aware help needs language intelligence, such as symbols or
  references.
- Can make code navigation more accurate than plain text search alone.
- Appear only when the runtime has language-service capabilities available.

## Boundaries

- They are for code understanding and navigation, not general file mutation.
- Friday should still verify important changes through normal project checks.
