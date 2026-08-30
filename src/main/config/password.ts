import { scrypt } from 'node:crypto';

export function hashPassword(password: string, salt: string): Promise<string> {
	return new Promise((resolve, reject) => {
		scrypt(password, Buffer.from(salt, 'base64url'), 64, { N: 32_768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }, (error, key) => {
			if (error) reject(error);
			else resolve(key.toString('base64url'));
		});
	});
}
