import { resolve } from 'node:path';
import type { AgentContext } from '../agent/context';
import type { PermissionDecision } from './context';

export function checkFilePath(path: string, context: AgentContext): PermissionDecision {
	const resolved = resolve(path);
	const roots = [process.cwd(), ...context.permissionContext.additionalWorkingDirectories].map((root) => resolve(root));
	if (!roots.some((root) => resolved === root || resolved.startsWith(`${root}/`))) {
		return { behavior: 'deny', message: `Path is outside allowed working directories: ${resolved}` };
	}
	return { behavior: 'allow' };
}
