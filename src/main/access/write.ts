import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AccessError } from './error';
import { hashAccessKey } from './hash';
import { accessPath } from './path';
import type { AccessRecord } from './types';

export function writeAccess(dataDirectory: string, accessKey: string): AccessRecord {
	const resolvedDirectory = path.resolve(dataDirectory);
	const filePath = accessPath(resolvedDirectory);
	const salt = randomBytes(16).toString('base64url');
	const record: AccessRecord = {
		version: 1,
		salt,
		digest: hashAccessKey(accessKey, salt),
		sessionSecret: randomBytes(32).toString('base64url'),
		createdAt: new Date().toISOString(),
	};
	fs.mkdirSync(resolvedDirectory, { recursive: true });
	let descriptor: number | undefined;
	let completed = false;
	try {
		descriptor = fs.openSync(filePath, 'wx', 0o600);
		fs.writeFileSync(descriptor, `${JSON.stringify(record, null, 2)}\n`);
		fs.fsyncSync(descriptor);
		completed = true;
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
			throw new AccessError(409, 'Access has already been configured.');
		}
		throw error;
	} finally {
		if (descriptor !== undefined) fs.closeSync(descriptor);
		if (descriptor !== undefined && !completed) fs.rmSync(filePath, { force: true });
	}
	return record;
}
