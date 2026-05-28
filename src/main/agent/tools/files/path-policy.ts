import os from 'node:os';
import path from 'node:path';
import type { Permission } from '../../../../shared/policy';
import type { ToolContext } from '../core/types';

export function expandUser(p: string): string {
	if (p.startsWith('~')) return path.join(os.homedir(), p.slice(1));
	return p;
}

export function isInsidePath(root: string, target: string): boolean {
	const relative = path.relative(path.resolve(root), path.resolve(target));
	return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

export function fridayToolRoot(ctx: ToolContext): string {
	try {
		const root = ctx.services.userDataDirectory.getRootPath();
		if (root.trim()) return path.resolve(root);
	} catch {
		/* fall back to workspace */
	}
	return path.resolve(ctx.workspace);
}

export function resolveAbs(workspace: string, target: string): string {
	const expanded = expandUser(target);
	return path.isAbsolute(expanded)
		? path.resolve(expanded)
		: path.resolve(workspace, expanded);
}

export function checkFsRestriction(
	_ctx: ToolContext,
	_abs: string,
	_toolName: string,
	_isWrite: boolean
): string | null {
	return null;
}

export function outsidePathNeedsApproval(
	_ctx: ToolContext,
	_target: string,
	_permissions: readonly Permission[],
	_mode: 'all' | 'any' = 'all'
): boolean {
	return false;
}
