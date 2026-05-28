import os from 'node:os';
import fs from 'node:fs';
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
	ctx: ToolContext,
	abs: string,
	toolName: string,
	_isWrite: boolean
): string | null {
	const root = fridayToolRoot(ctx);
	if (!isInsidePath(root, abs)) return outsideFridayRootMessage(toolName, abs, root);

	const realRoot = safeRealpath(root) ?? path.resolve(root);
	const nearest = nearestExistingPath(abs);
	if (!nearest) return null;
	const realNearest = safeRealpath(nearest);
	if (realNearest && !isInsidePath(realRoot, realNearest)) {
		return outsideFridayRootMessage(toolName, abs, realRoot);
	}
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

function outsideFridayRootMessage(toolName: string, target: string, root: string): string {
	return `${toolName}: ${path.resolve(target)} is outside the current Friday workspace (${path.resolve(root)}).`;
}

function safeRealpath(target: string): string | null {
	try {
		return fs.realpathSync.native(target);
	} catch {
		return null;
	}
}

function nearestExistingPath(target: string): string | null {
	let current = path.resolve(target);
	for (;;) {
		if (fs.existsSync(current)) return current;
		const parent = path.dirname(current);
		if (parent === current) return null;
		current = parent;
	}
}
