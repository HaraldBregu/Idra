import path from 'node:path';
import { realPath } from '../../shared/real_path';
import { resolveUserPath } from '../../shared/user_path';

export function permissionRuleRoot(rule: string): string {
	const resolved = resolveUserPath(rule, process.cwd());
	const parsedRoot = path.parse(resolved).root;
	const rootRule = `${parsedRoot}**`;
	return realPath(resolved === rootRule ? parsedRoot : resolved.replace(/[\\/]\*\*$/, ''));
}
