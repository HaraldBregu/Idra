import { promises as fs } from 'node:fs';
import path from 'node:path';

export async function walkFiles(dir: string): Promise<string[]> {
	const entries = await fs.readdir(dir, { withFileTypes: true });
	const nested = await Promise.all(
		entries.map((entry) => {
			const full = path.join(dir, entry.name);
			return entry.isDirectory() ? walkFiles(full) : Promise.resolve([full]);
		})
	);
	return nested.flat();
}
