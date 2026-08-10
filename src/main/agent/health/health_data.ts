import type { Config } from '../types';
import { HEALTH_FILE, readTextFile, resolveWorkspacePath, workspacePath } from '../system';
import { atomicWrite } from '../../shared/atomic_write';

export function getHealthData(config: Config): Promise<string> {
	return readTextFile(workspacePath(config), HEALTH_FILE);
}

export async function saveHealthData(config: Config, content: string): Promise<string> {
	await atomicWrite(resolveWorkspacePath(workspacePath(config), HEALTH_FILE), content);
	return content;
}
