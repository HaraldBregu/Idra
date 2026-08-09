import { directoryPermissionFor } from './permissions_directory';
import type { DirectoryPermissions } from './permissions_types';

export function directoryPermissionAllows(
	directories: DirectoryPermissions,
	toolName: string,
	targets: string[]
): boolean {
	return (
		targets.length > 0 &&
		targets.every((target) => directoryPermissionFor(directories, toolName, target) === 'allow')
	);
}
