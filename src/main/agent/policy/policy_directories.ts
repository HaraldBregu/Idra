import { directoryPermissionFor } from './policy_directory';
import type { DirectoryPermissions } from './policy_types';

export function directoryPolicyAllows(
	directories: DirectoryPermissions,
	toolName: string,
	targets: string[]
): boolean {
	return (
		targets.length > 0 &&
		targets.every((target) => directoryPermissionFor(directories, toolName, target) === 'allow')
	);
}
