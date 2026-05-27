import os from 'node:os';
import path from 'node:path';
import type { Permission } from '../../../../shared/policy';
import type { ToolContext } from '../core/types';
import { filePolicyAllows, hasFilePolicy } from './policy';

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
	ctx: ToolContext,
	abs: string,
	toolName: string,
	isWrite: boolean
): string | null {
	if (isInsidePath(ctx.workspace, abs)) return null;
	if (isInsidePath(fridayToolRoot(ctx), abs)) return null;
	if (ctx.fsPolicy?.workspaceOnly) return `${toolName}: path is outside the workspace.`;
	if (!isWrite) return null;
	if (ctx.fsPolicy?.writeWorkspaceOnly) return `${toolName}: path is outside the workspace.`;
	if (!hasFilePolicy(ctx)) return `${toolName}: path is outside the workspace.`;
	return null;
}

export function outsidePathNeedsApproval(
	ctx: ToolContext,
	target: string,
	permissions: readonly Permission[],
	mode: 'all' | 'any' = 'all'
): boolean {
	const abs = resolveAbs(ctx.workspace, target);
	if (isInsidePath(fridayToolRoot(ctx), abs)) return false;
	if (!hasFilePolicy(ctx)) return true;
	const allowed = permissions.map((permission) => filePolicyAllows(ctx, abs, permission));
	return mode === 'any' ? !allowed.some(Boolean) : !allowed.every(Boolean);
}
