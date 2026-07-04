import fs from 'node:fs/promises';
import type { Config } from '../types';
import { HEALTH_FILE, readTextFile, resolveWorkspacePath, workspacePath } from '../system';

export function getHealthData(config: Config): Promise<string> {
	return readTextFile(workspacePath(config), HEALTH_FILE);
}

export async function saveHealthData(config: Config, content: string): Promise<string> {
	await fs.writeFile(resolveWorkspacePath(workspacePath(config), HEALTH_FILE), content, 'utf8');
	return content;
}
