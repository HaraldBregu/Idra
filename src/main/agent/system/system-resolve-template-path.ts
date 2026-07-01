import { existsSync } from 'node:fs';
import path from 'node:path';
import type { WorkspaceFile } from './system-types';

export function resolveTemplatePath(filePath: WorkspaceFile): string {
	const templatePath = path.join('resources', 'templates', filePath);
	const developmentPath = path.resolve(process.cwd(), templatePath);
	if (existsSync(developmentPath)) return developmentPath;
	return path.join(process.resourcesPath, templatePath);
}
