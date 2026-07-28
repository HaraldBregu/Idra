import path from 'node:path';
import type { WorkspaceFile } from './system_types';

export function resolveTemplatePath(filePath: WorkspaceFile): string {
	const templatePath = path.join('resources', 'templates', filePath);
	if (process.defaultApp || !process.resourcesPath)
		return path.resolve(process.cwd(), templatePath);
	return path.join(process.resourcesPath, templatePath);
}
