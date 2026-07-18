import path from 'node:path';
import { realPath } from '../../shared/real_path';
import { resolveUserPath } from '../../shared/user_path';
import { toolPermissionTargets } from './policy_targets';

export function directoryPermissionTargets(
	toolName: string,
	args: Record<string, unknown>,
	baseDir: string
): string[] {
	if (toolName !== 'exec') {
		const targets = toolPermissionTargets(toolName, args, baseDir);
		return toolName === 'read' ? targets.map((target) => path.dirname(target)) : targets;
	}
	if (typeof args.command !== 'string' || args.command.length === 0) return [];
	const workdir = typeof args.workdir === 'string' && args.workdir.length > 0 ? args.workdir : '.';
	return [realPath(resolveUserPath(workdir, baseDir))];
}
