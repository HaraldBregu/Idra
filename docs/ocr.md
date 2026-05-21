# OCR

This document describes the OCR module contract for Friday document and image
text extraction.

## Module Contract

OCR is a separated module. It can be exposed as a service and as an LLM tool,
and it can be invoked through background tasks or scheduled work.

Current runtime status:

- `ocr.run` is implemented as a background task handler.
- The current handler reads the configured root `ocr` settings from
  `StoreService`.
- A dedicated OCR module and provider/model picker are still future work.

Module surfaces:

- Service API: future main-process OCR module.
- Background task: `ocr.run`.
- LLM tool: allowed as a thin wrapper when the module service exists.
- Scheduler use: task scheduler can dispatch `ocr.run`.

Dependencies:

- `StoreService` for saved root `ocr` settings.
- Provider records and OCR adapters when the module becomes provider-backed.
- Background task module for immediate OCR jobs.
- Task scheduler for scheduled OCR jobs.

## Settings

The `ocr` root key can store endpoint-backed settings now and provider/model
settings later.

Treat those as storage keys. The module name is OCR.

Credentials are not stored on OCR task input or schedule payloads. API keys,
base URLs, and provider configuration must resolve from `StoreService` or a
secret-backed provider record.

## Runtime Flow

Current `ocr.run` flow:

1. The background task module starts a task of type `ocr.run`.
2. `OcrTaskHandler` validates `imageBase64`, optional `mimeType`, and optional
   `language`.
3. The handler reads the configured OCR endpoint.
4. The handler posts the OCR input as JSON to that endpoint.
5. The handler extracts text from a string response or from JSON keys `text`,
   `result`, or `output`.

Target module flow:

1. UI, task, schedule, or tool code passes document/image input to the OCR
   module service.
2. The OCR module resolves `ocr` from `StoreService`.
3. The OCR module resolves endpoint/provider credentials from the configured
   provider record.
4. The OCR adapter extracts text and returns a normalized OCR result.

## Task And Scheduler Use

Immediate OCR work should use `ocr.run`.

Scheduled OCR work should use the task scheduler only for timing. The schedule
stores sanitized task input and dispatches `ocr.run`; the OCR module resolves
endpoint, provider, and credentials at execution time.

Recommended task input:

```json
{
	"imageBase64": "base64-encoded-image",
	"mimeType": "image/png",
	"language": "en"
}
```

## Failure Cases

Common startup failures:

- OCR endpoint or module settings are not configured.
- Saved provider or endpoint is missing.
- Provider credentials are missing.
- No OCR adapter exists for the selected provider/model pair.
- The OCR endpoint fails or returns no usable text.
