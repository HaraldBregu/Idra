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
	if (isInsidePath(ctx.workspace, abs)) return false;
	const allowed =
		mode === 'all'
			? permissions.every((permission) => filePolicyAllows(ctx, abs, permission))
			: permissions.some((permission) => filePolicyAllows(ctx, abs, permission));
	return !allowed;
}
