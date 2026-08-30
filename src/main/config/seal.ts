import { createCipheriv, randomBytes } from 'node:crypto';
import type { SealedValue } from './types';

export function seal(value: unknown, key: Buffer, purpose: string): SealedValue {
	const iv = randomBytes(12);
	const cipher = createCipheriv('aes-256-gcm', key, iv);
	cipher.setAAD(Buffer.from(purpose));
	const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
	return {
		iv: iv.toString('base64url'),
		tag: cipher.getAuthTag().toString('base64url'),
		value: encrypted.toString('base64url'),
	};
}
