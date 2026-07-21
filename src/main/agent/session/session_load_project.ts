import { existsSync, readFileSync } from 'node:fs';
import { projectFilePath } from './session_project_file_path';
import type { SessionState } from './session_types';

export function loadProject(state: SessionState): string | undefined {
	const filePath = projectFilePath(state);
	if (!existsSync(filePath)) return undefined;
	try {
		const project = JSON.parse(readFileSync(filePath, 'utf8')) as unknown;
		return typeof project === 'string' && project.trim() ? project : undefined;
	} catch {
		return undefined;
	}
}
