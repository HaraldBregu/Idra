import type { PolicyServicePort } from '../../policy';
import type { Permission, PolicyDecision } from '../../../shared/policy';
import type { ToolContext } from '../core/types';

export interface FilePolicyCheck {
	path: string;
	permission: Permission;
}

function filePolicy(ctx: ToolContext): PolicyServicePort | undefined {
	return (ctx.services as { policy?: PolicyServicePort } | undefined)?.policy;
}

export function hasFilePolicy(ctx: ToolContext): boolean {
	return Boolean(filePolicy(ctx));
}

export function filePolicyAllows(
	ctx: ToolContext,
	targetPath: string,
	permission: Permission
): boolean {
	const policy = filePolicy(ctx);
	if (!policy) return false;

	try {
		return policy.evaluate(targetPath, permission).outcome === 'allow';
	} catch {
		return false;
	}
}

export function checkFilePolicy(
	ctx: ToolContext,
	toolName: string,
	checks: readonly FilePolicyCheck[]
): string | null {
	const policy = filePolicy(ctx);
	if (!policy) return null;

	for (const check of checks) {
		let decision: PolicyDecision;
		try {
			decision = policy.evaluate(check.path, check.permission);
		} catch (err) {
			return `${toolName}: file policy unavailable: ${(err as Error).message}`;
		}
		if (decision.outcome === 'allow') continue;
		return `${toolName}: denied by file policy for '${check.permission}' on ${decision.path}: ${decision.reason}`;
	}
	return null;
}
