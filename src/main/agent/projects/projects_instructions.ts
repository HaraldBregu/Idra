import fs from 'node:fs';
import type { ProjectInfo } from './projects_types';

export function readInstructions(project: ProjectInfo): string {
	if (!fs.existsSync(project.instructionsPath)) return '';
	return fs.readFileSync(project.instructionsPath, 'utf8');
}
