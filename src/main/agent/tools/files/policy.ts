export type Permission = 'read' | 'write' | 'create' | 'delete';

export interface FilePolicyCheck {
	path: string;
	permission: Permission;
}

export function hasFilePolicy(): boolean {
	return false;
}

export function filePolicyAllows(): boolean {
	return false;
}

export function checkFilePolicy(): string | null {
	return null;
}
