/**
 * Converts arbitrary tool output into transcript text.
 *
 * Model providers expect tool result content as text. Strings pass through,
 * undefined becomes an empty result, and structured values are serialized to
 * JSON when possible.
 */
export function formatToolOutput(output: unknown): string {
	if (typeof output === 'string') return output;
	if (output === undefined) return '';
	try {
		return JSON.stringify(output);
	} catch {
		return String(output);
	}
}
