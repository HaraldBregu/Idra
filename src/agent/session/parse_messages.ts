import type { Message } from '../types';
import { isMessage } from './is_message';
import { isRecord } from './is_record';

export function parseMessages(content: string): Message[] | undefined {
	try {
		const raw = JSON.parse(content) as unknown;
		if (Array.isArray(raw)) return raw.filter(isMessage);
		if (isRecord(raw) && Array.isArray(raw.content)) return raw.content.filter(isMessage);
		return undefined;
	} catch {
		return undefined;
	}
}
