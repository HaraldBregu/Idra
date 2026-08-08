import { createHash } from 'node:crypto';

export function inputFingerprint(input: Record<string, unknown>): string {
	return createHash('sha256').update(JSON.stringify(input)).digest('hex');
}
