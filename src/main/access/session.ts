import { createHmac } from 'node:crypto';
import { AccessError } from './error';
import { readAccess } from './read';

export function createAccessSession(dataDirectory: string): string {
	const record = readAccess(dataDirectory);
	if (!record) throw new AccessError(401, 'Access is not configured.');
	const expiresAt = Date.now() + 365 * 24 * 60 * 60 * 1000;
	const payload = `v1.${expiresAt}`;
	const signature = createHmac('sha256', record.sessionSecret)
		.update(payload)
		.digest('base64url');
	return `${payload}.${signature}`;
}
