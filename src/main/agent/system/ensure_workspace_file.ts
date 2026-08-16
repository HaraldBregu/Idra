import { mkdirSync, writeFileSync } from 'node:fs';
import { resolveWorkspacePath } from './common';
import { AGENT_TEMPLATE } from './template';
import { AGENT_FILE } from './types';

export function ensureWorkspaceFile(workspacePath: string): void {
	mkdirSync(workspacePath, { recursive: true });
	try {
		writeFileSync(resolveWorkspacePath(workspacePath, AGENT_FILE), AGENT_TEMPLATE, {
			encoding: 'utf8',
			flag: 'wx',
			mode: 0o600,
		});
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
	}
}
