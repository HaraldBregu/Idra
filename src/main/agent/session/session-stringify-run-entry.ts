export function stringifyRunEntry(entry: unknown): string {
	const timestamp = new Date().toISOString();
	try {
		return JSON.stringify({ timestamp, event: entry });
	} catch {
		return JSON.stringify({ timestamp, event: { type: 'unserializable' } });
	}
}
