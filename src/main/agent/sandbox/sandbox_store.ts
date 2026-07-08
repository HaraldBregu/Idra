import os from 'node:os';
import path from 'node:path';
import { agentLocation } from '../../shared/agent_location';

let roots: string[] | undefined;

export function getSandboxRoots(): string[] {
	if (!roots) roots = [path.resolve(agentLocation()), path.resolve(os.tmpdir())];
	return roots;
}

export function addSandboxRoot(dir: string): void {
	const resolved = path.resolve(dir);
	const current = getSandboxRoots();
	if (!current.includes(resolved)) current.push(resolved);
}
