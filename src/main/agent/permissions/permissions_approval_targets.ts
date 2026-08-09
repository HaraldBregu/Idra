import path from 'node:path';
import { toolPermissionTargets } from './permissions_targets';

export function toolApprovalTargets(
	toolName: string,
	args: Record<string, unknown>,
	baseDir: string
): string[] {
	const targets = toolPermissionTargets(toolName, args, baseDir);
	return toolName === 'read' ? targets.map((target) => path.dirname(target)) : targets;
}
