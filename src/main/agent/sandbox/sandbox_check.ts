import { isPathWithin } from '../policy/policy_path';
import { getSandboxRoots } from './sandbox_store';

export function isWithinSandbox(dir: string): boolean {
	return getSandboxRoots().some((root) => isPathWithin(root, dir));
}
