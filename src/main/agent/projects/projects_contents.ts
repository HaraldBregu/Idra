import fs from 'node:fs';
import path from 'node:path';
import { findProject } from './projects_find';

export function projectContents(name: string): string | undefined {
	const project = findProject(name);
	if (!project) return undefined;
	let files: string[] = [];
	try {
		files = fs
			.readdirSync(project.folderPath, { recursive: true, withFileTypes: true })
			.filter((entry) => entry.isFile())
			.map((entry) => path.relative(project.folderPath, path.join(entry.parentPath, entry.name)))
			.sort();
	} catch {
		files = [];
	}
	const shown = files.slice(0, 100);
	return [
		`Project "${project.title}" — ${files.length} file${files.length === 1 ? '' : 's'}`,
		...(project.description ? [project.description] : []),
		'',
		...shown.map((file) => `• ${file}`),
		...(files.length > shown.length ? [`… ${files.length - shown.length} more`] : []),
	].join('\n');
}
