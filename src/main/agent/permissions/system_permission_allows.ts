import { realPath } from '../../shared/real_path';
import { isPathWithin } from './permissions_path';

export function systemPermissionAllows(
	toolName: string,
	targets: string[],
	agentDirectory: string
): boolean {
	if (toolName !== 'read_file') return false;
	const root = realPath(agentDirectory);
	return targets.length > 0 && targets.every((target) => isPathWithin(root, target));
}
