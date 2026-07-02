export function formatToolOutput(output: unknown): string {
	if (typeof output === 'string') return output;
	if (output === undefined) return '';
	try {
		return JSON.stringify(output);
	} catch {
		return String(output);
	}
}
