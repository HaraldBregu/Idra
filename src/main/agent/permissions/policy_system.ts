import { realPath } from '../../shared/real_path';
import { isPathWithin } from './policy_path';

export function systemPolicyAllows(
	toolName: string,
	targets: string[],
	agentDirectory: string
): boolean {
	if (toolName !== 'read') return false;
	const root = realPath(agentDirectory);
	return (
		targets.length > 0 &&
		targets.every((target) => isPathWithin(root, target))
	);
}
