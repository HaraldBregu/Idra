import fs from 'node:fs';
import { AccessError } from './error';
import { accessPath } from './path';
import type { AccessRecord } from './types';

export function readAccess(dataDirectory: string): AccessRecord | undefined {
	const filePath = accessPath(dataDirectory);
	if (!fs.existsSync(filePath)) return undefined;
	if (fs.lstatSync(filePath).isSymbolicLink()) {
		throw new AccessError(400, 'The access configuration cannot be a symbolic link.');
	}
	const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8')) as Partial<AccessRecord>;
	if (
		parsed.version !== 1 ||
		typeof parsed.salt !== 'string' ||
		!parsed.salt ||
		typeof parsed.digest !== 'string' ||
		!parsed.digest ||
		typeof parsed.sessionSecret !== 'string' ||
		!parsed.sessionSecret ||
		typeof parsed.createdAt !== 'string' ||
		!parsed.createdAt
	) {
		throw new AccessError(500, 'The access configuration is invalid.');
	}
	return parsed as AccessRecord;
}
