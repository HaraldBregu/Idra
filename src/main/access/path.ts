import path from 'node:path';

export function accessPath(dataDirectory: string): string {
	return path.join(path.resolve(dataDirectory), 'access.json');
}
