# Embedding

This document describes the embedding module contract for Friday semantic
indexing and retrieval work.

## Module Contract

Embedding is a separated module. It can be exposed as a service and as an LLM
tool, and it can be invoked through background tasks or scheduled work.

Current runtime status:

- A dedicated embedding module is not implemented yet.
- `EMBEDDING_MODELS_BY_PROVIDER` is empty, so there are no default selectable
  embedding provider/model entries yet.
- Provider tests ensure embedding models are not selectable as main agent chat
  models.

Module surfaces:

- Service API: future main-process embedding module.
- Background tasks: future task types such as `embedding.index`,
  `embedding.search`, or `embedding.delete`.
- LLM tool: allowed as a thin wrapper when the module service exists.
- Scheduler use: task scheduler can dispatch embedding tasks for recurring
  indexing.

Dependencies:

- `StoreService` for saved root `embedding` settings.
- Provider records and embedding adapters for hosted embedding models.
- Local vector storage or an external vector backend.
- Background task module for indexing and maintenance jobs.
- Task scheduler for recurring indexing.

## Settings

The module should store only provider/model ids and non-secret index
configuration in `embedding`. Credentials, base URLs, and API keys must stay on
configured provider records or secret-backed connector records.

Do not expose a Settings model picker for embedding until the provider catalog,
index behavior, and runtime adapters are implemented.

## Runtime Flow

Target embedding flow:

1. UI, task, schedule, or tool code passes text, file references, or query input
   to the embedding module service.
2. The embedding module validates and chunks input where needed.
3. The module resolves `embedding` settings from `StoreService`.
4. The module creates an embedding adapter or local runtime.
5. The module writes vectors to the selected index or returns normalized search
   results.

## Task And Scheduler Use

Future immediate embedding work should use registered background task handlers.

Scheduled embedding work should use the task scheduler only for timing. The
schedule stores sanitized task input and dispatches an embedding task; the
embedding module resolves provider, index, and credentials at execution time.

Example future indexing task input:

```json
{
	"source": "workspace",
	"path": "docs",
	"mode": "incremental"
}
```

## Failure Cases

Common startup failures:

- Embedding module settings are not configured.
- Saved provider or local runtime is missing.
- Saved model does not support embeddings.
- Provider credentials are missing.
- Vector index storage is unavailable.
- Input is too large and cannot be chunked within configured bounds.
