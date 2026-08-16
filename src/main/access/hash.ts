import { scryptSync } from 'node:crypto';

export function hashAccessKey(accessKey: string, salt: string): string {
	return scryptSync(accessKey, salt, 32).toString('base64url');
}
