import { realPath } from '../../shared/real_path';
import { isPathWithin } from './policy_path';

export function systemPolicyAllows(targets: string[], agentDirectory: string): boolean {
	const root = realPath(agentDirectory);
	return targets.length > 0 && targets.every((target) => isPathWithin(root, target));
}
