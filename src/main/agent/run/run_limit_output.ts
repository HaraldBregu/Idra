export function limitToolOutput(output: unknown, maxBytes: number): unknown {
	const text = typeof output === 'string' ? output : JSON.stringify(output);
	if (Buffer.byteLength(text, 'utf8') <= maxBytes) return output;
	return `${Buffer.from(text).subarray(0, maxBytes).toString('utf8')}\n[tool output truncated]`;
}
