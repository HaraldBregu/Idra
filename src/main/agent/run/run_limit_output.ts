export function limitToolOutput(output: unknown, maxBytes: number): unknown {
	let text: string;
	if (typeof output === 'string') text = output;
	else {
		try {
			text = JSON.stringify(output) ?? String(output);
		} catch {
			text = String(output);
		}
	}
	if (Buffer.byteLength(text, 'utf8') <= maxBytes) return output;
	return `${Buffer.from(text).subarray(0, maxBytes).toString('utf8')}\n[tool output truncated]`;
}
