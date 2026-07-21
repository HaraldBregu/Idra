import fs from 'node:fs';
import path from 'node:path';
import type { ProjectInfo, ProjectMetadata } from './projects_types';

export const PROJECT_FILE = 'project.json';
export const INSTRUCTIONS_FILE = 'AGENTS.md';

export function readProject(folder: string, id: string): ProjectInfo | undefined {
	const metadataPath = path.join(folder, PROJECT_FILE);
	if (!fs.existsSync(metadataPath)) return undefined;
	let metadata: Partial<ProjectMetadata> = {};
	try {
		metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8')) as Partial<ProjectMetadata>;
	} catch {
		metadata = {};
	}
	return {
		id,
		title: typeof metadata.title === 'string' && metadata.title.trim() ? metadata.title : id,
		description: typeof metadata.description === 'string' ? metadata.description : '',
		folderPath: folder,
		instructionsPath: path.join(folder, INSTRUCTIONS_FILE),
	};
}
