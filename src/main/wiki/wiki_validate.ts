import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';

export async function validateWiki(targetPath: string): Promise<string[]> {
	const errors: string[] = [];
	const ids = new Map<string, string>();
	const entries = await readdir(targetPath, { recursive: true }).catch(() => []);
	for (const entry of entries) {
		const relativePath = entry.split(path.sep).join('/');
		if (path.posix.extname(relativePath).toLowerCase() !== '.md') continue;
		if (['index.md', 'log.md', 'AGENTS.md'].includes(relativePath)) continue;
		try {
			const parsed = matter(await readFile(path.resolve(targetPath, entry), 'utf8'));
			if (!String(parsed.data.title ?? '').trim()) errors.push(`Missing title: ${relativePath}`);
			if (!String(parsed.data.summary ?? '').trim()) errors.push(`Missing summary: ${relativePath}`);
			const id = String(parsed.data.id ?? '').trim();
			if (id) {
				const duplicate = ids.get(id);
				if (duplicate) errors.push(`Duplicate page id '${id}': ${duplicate}, ${relativePath}`);
				else ids.set(id, relativePath);
			}
			const sourceIds = parsed.data.source_ids;
			if (sourceIds !== undefined && !Array.isArray(sourceIds)) {
				errors.push(`Invalid source_ids metadata: ${relativePath}`);
			}
		} catch (error) {
			errors.push(`Invalid Markdown frontmatter in ${relativePath}: ${error instanceof Error ? error.message : String(error)}`);
		}
	}
	return errors;
}
