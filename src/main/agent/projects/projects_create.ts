import fs from 'node:fs';
import path from 'node:path';
import type { ProjectInfo } from './projects_types';
import { INSTRUCTIONS_FILE, PROJECT_FILE } from './projects_read';
import { resolveProjectFolder } from './projects_resolve_folder';
import { setProject } from './projects_store';

export function createProject(
	name: string,
	description: string,
	instructions?: string
): ProjectInfo {
	const folder = resolveProjectFolder(name);
	if (fs.existsSync(folder)) throw new Error(`Project "${name}" already exists.`);
	fs.mkdirSync(folder, { recursive: true });
	fs.writeFileSync(
		path.join(folder, PROJECT_FILE),
		JSON.stringify({ title: name, description }, null, '\t') + '\n'
	);
	fs.writeFileSync(
		path.join(folder, INSTRUCTIONS_FILE),
		instructions ?? `# ${name}\n\n${description}\n`
	);
	setProject(name, { title: name, description });
	return {
		id: name,
		title: name,
		description,
		folderPath: folder,
		instructionsPath: path.join(folder, INSTRUCTIONS_FILE),
	};
}
