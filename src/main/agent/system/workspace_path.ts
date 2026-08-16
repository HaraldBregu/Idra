import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import type { Config } from '../types';

export function workspacePath(config: Config): string {
	const resolvedPath = path.resolve(config.location);
	if (!existsSync(resolvedPath)) {
		mkdirSync(resolvedPath, { recursive: true });
	}
	return resolvedPath;
}
