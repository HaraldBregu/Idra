import { isPathWithin, resolveUserPath } from './policy_path';
import { getRestrictedDirectories } from './policy_store';

export function isDirRestricted(dir: string): boolean {
	return getRestrictedDirectories().some(({ path: restricted, recursive }) => {
		const root = resolveUserPath(restricted);
		return recursive ? isPathWithin(root, dir) : root === dir;
	});
}
