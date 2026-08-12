import path from 'node:path';

export function recursivePermissionRule(target: string): string {
	return `${target.replace(/[\\/]+$/, '')}${path.sep}**`;
}
