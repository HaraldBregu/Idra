import path from 'node:path';
import type { WorkspaceFile } from './system_types';

export function resolveTemplatePath(filePath: WorkspaceFile): string {
	return path.resolve(process.cwd(), 'resources', 'templates', filePath);
}
