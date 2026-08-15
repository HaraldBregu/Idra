import path from 'node:path';

export function providerPath(dataDirectory: string): string {
	return path.join(path.resolve(dataDirectory), 'provider.json');
}
