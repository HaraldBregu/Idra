import { createHmac, timingSafeEqual } from 'node:crypto';
import { readAccess } from './read';

export function verifyAccessSession(dataDirectory: string, session: string | undefined): boolean {
	if (!session) return false;
	const [version, expiresAtValue, signature, ...extra] = session.split('.');
	if (version !== 'v1' || !expiresAtValue || !signature || extra.length > 0) return false;
	const expiresAt = Number(expiresAtValue);
	if (!Number.isSafeInteger(expiresAt) || expiresAt <= Date.now()) return false;
	const record = readAccess(dataDirectory);
	if (!record) return false;
	const expected = Buffer.from(
		createHmac('sha256', record.sessionSecret)
			.update(`${version}.${expiresAtValue}`)
			.digest('base64url')
	);
	const actual = Buffer.from(signature);
	return actual.length === expected.length && timingSafeEqual(actual, expected);
}
