import path from 'node:path';
import type { PolicyConfig, PolicyDecision, Permission } from '../../../shared/policy';
import { match } from './match';

export function evaluate(
	config: PolicyConfig,
	targetPath: string,
	permission: Permission
): PolicyDecision {
	const resolved = path.resolve(targetPath);
	const entry = match(config, resolved);

	if (!entry) {
		return {
			path: resolved,
			outcome: config.defaultPolicy,
			matched: null,
			reason: `no matching path entry; default policy '${config.defaultPolicy}' applied`,
		};
	}

	const allowed = entry.permissions.includes(permission);
	return {
		path: resolved,
		outcome: allowed ? 'allow' : 'deny',
		matched: entry,
		reason: allowed
			? `'${permission}' granted by ${entry.path}`
			: `'${permission}' not in grants for ${entry.path}`,
	};
}
