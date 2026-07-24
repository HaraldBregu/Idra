import fs from 'node:fs';
import path from 'node:path';
import { projects } from './projects_data';
import { INSTRUCTIONS_FILE, PROJECT_FILE } from './projects_read';
import { resolveProjectFolder } from './projects_resolve_folder';
import type { ProjectInfo } from './projects_types';

export function createProject(
	name: string,
	description: string,
	instructions?: string
): ProjectInfo {
	const folder = resolveProjectFolder(name);
	if (fs.existsSync(path.join(folder, PROJECT_FILE)))
		throw new Error(`Project "${name}" already exists.`);
	fs.mkdirSync(folder, { recursive: true });
	fs.writeFileSync(
		path.join(folder, PROJECT_FILE),
		JSON.stringify({ title: name, description }, null, '\t') + '\n'
	);
	fs.writeFileSync(
		path.join(folder, INSTRUCTIONS_FILE),
		instructions ?? `# ${name}\n\n${description}\n`
	);
	const info: ProjectInfo = {
		id: name,
		title: name,
		description,
		folderPath: folder,
		instructionsPath: path.join(folder, INSTRUCTIONS_FILE),
	};
	projects.set(info.id, info);
	return info;
}
