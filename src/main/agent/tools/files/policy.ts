export type Permission = 'read' | 'write' | 'create' | 'delete';

export interface FilePolicyCheck {
	path: string;
	permission: Permission;
}

export function hasFilePolicy(_ctx?: unknown): boolean {
	return false;
}

export function filePolicyAllows(_ctx?: unknown, _targetPath?: string, _permission?: Permission): boolean {
	return false;
}

export function checkFilePolicy(
	_ctx?: unknown,
	_toolName?: string,
	_checks?: readonly FilePolicyCheck[]
): string | null {
	return null;
}
