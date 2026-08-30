import { createDecipheriv } from 'node:crypto';
import type { SealedValue } from './types';

export function unseal(value: SealedValue, key: Buffer, purpose: string): unknown {
	const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(value.iv, 'base64url'));
	decipher.setAAD(Buffer.from(purpose));
	decipher.setAuthTag(Buffer.from(value.tag, 'base64url'));
	const cleartext = Buffer.concat([
		decipher.update(Buffer.from(value.value, 'base64url')),
		decipher.final(),
	]);
	return JSON.parse(cleartext.toString('utf8')) as unknown;
}
