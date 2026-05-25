import { evaluate } from '../../policy';
import type { Permission, PolicyConfig } from '../../../shared/policy';
import type { FridayServices, ToolContext } from '../core/types';

export interface FilePolicyCheck {
	path: string;
	permission: Permission;
}

export function checkFilePolicy(
	ctx: ToolContext,
	toolName: string,
	checks: readonly FilePolicyCheck[]
): string | null {
	const store = (ctx.services as Partial<FridayServices> | undefined)?.store as
		| { getPolicy?: () => PolicyConfig }
		| undefined;
	if (typeof store?.getPolicy !== 'function') return null;

	let policy: PolicyConfig;
	try {
		policy = store.getPolicy();
	} catch (err) {
		return `${toolName}: file policy unavailable: ${(err as Error).message}`;
	}

	for (const check of checks) {
		const decision = evaluate(policy, check.path, check.permission);
		if (decision.outcome === 'allow') continue;
		return `${toolName}: denied by file policy for '${check.permission}' on ${decision.path}: ${decision.reason}`;
	}
	return null;
}
