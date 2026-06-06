/**
 * Parses accumulated streamed tool-call JSON into an object for execution.
 *
 * Providers stream tool arguments as text chunks. This helper accepts the final
 * accumulated text and returns an object for valid JSON objects, or a diagnostic
 * wrapper when the model produced invalid JSON or a non-object value.
 */
export function parseToolArgs(argsText: string): Record<string, unknown> {
	if (!argsText.trim()) return {};
	try {
		const parsed = JSON.parse(argsText);
		if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
			return parsed as Record<string, unknown>;
		}
		return { __parsed: parsed };
	} catch {
		return { __unparsed: argsText };
	}
}
