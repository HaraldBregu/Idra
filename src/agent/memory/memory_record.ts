import { createHash } from 'node:crypto';
import { MAX_MEMORY_FACT_LENGTH, type MemoryFact } from './memory_types';

const PRIVATE_KEY = /-----BEGIN [A-Z ]*PRIVATE KEY-----/;
const ASSIGNED_SECRET =
	/(?:api[_-]?key|access[_-]?token|client[_-]?secret|password)\s*[:=]\s*["']?[A-Za-z0-9_\-/.+=]{20,}/i;
const TOKEN = /\b(?:sk-[A-Za-z0-9_-]{20,}|AKIA[0-9A-Z]{16}|gh[pousr]_[A-Za-z0-9]{20,})\b/;

export function memoryRecord(fact: string): MemoryFact {
	const normalized = fact.trim().replace(/\s+/gu, ' ');
	if (!normalized) throw new Error('Memory fact is required.');
	if (normalized.length > MAX_MEMORY_FACT_LENGTH) {
		throw new Error(`Memory fact must be ${MAX_MEMORY_FACT_LENGTH} characters or fewer.`);
	}
	if (PRIVATE_KEY.test(normalized) || ASSIGNED_SECRET.test(normalized) || TOKEN.test(normalized)) {
		throw new Error('Refusing to save credential-like content to memory.');
	}
	const digest = createHash('sha256').update(normalized).digest('hex').slice(0, 16);
	return { id: `memory-${digest}`, fact: normalized };
}
