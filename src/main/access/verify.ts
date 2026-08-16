import { timingSafeEqual } from 'node:crypto';
import { hashAccessKey } from './hash';
import { readAccess } from './read';

export function verifyAccessKey(dataDirectory: string, accessKey: string): boolean {
	const record = readAccess(dataDirectory);
	if (!record) return false;
	const actual = Buffer.from(hashAccessKey(accessKey, record.salt));
	const expected = Buffer.from(record.digest);
	return actual.length === expected.length && timingSafeEqual(actual, expected);
}
