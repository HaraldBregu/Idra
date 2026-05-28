import type { Permission } from '../../../../shared/policy';
import type { ToolContext } from '../core/types';

export interface FilePolicyCheck {
	path: string;
	permission: Permission;
}

export function hasFilePolicy(_ctx: ToolContext): boolean {
	return false;
}

export function filePolicyAllows(
	_ctx: ToolContext,
	_targetPath: string,
	_permission: Permission
): boolean {
	return true;
}

export function checkFilePolicy(
	_ctx: ToolContext,
	_toolName: string,
	_checks: readonly FilePolicyCheck[]
): string | null {
	return null;
}
