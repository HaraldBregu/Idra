import path from 'node:path';

export function userDataLocation(): string {
	return path.resolve(process.env.IDRA_DATA_DIR?.trim() || path.join(process.cwd(), 'data'));
}
