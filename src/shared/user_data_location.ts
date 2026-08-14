import path from 'node:path';

export function userDataLocation(): string {
	return path.resolve(process.cwd(), 'data');
}
