import { semanticRunEntry } from './session_trace_entry';

export function stringifyRunEntry(entry: unknown): string | undefined {
	const timestamp = new Date().toISOString();
	const event = semanticRunEntry(entry);
	if (!event) return undefined;
	try {
		return JSON.stringify({ timestamp, event });
	} catch {
		return JSON.stringify({ timestamp, event: { type: 'unserializable' } });
	}
}
