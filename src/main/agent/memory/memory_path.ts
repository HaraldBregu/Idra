import path from 'node:path';
import { MEMORY_FILE, workspacePath } from '../system';
import type { Config } from '../types';

export function memoryPath(config: Config): string {
	return path.join(workspacePath(config), MEMORY_FILE);
}
