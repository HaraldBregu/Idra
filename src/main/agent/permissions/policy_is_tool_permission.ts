import type { ToolPermission } from './policy_types';

export function isToolPermission(value: unknown): value is ToolPermission {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
	const entry = value as Record<string, unknown>;
	return entry.default === 'allow' || entry.default === 'ask' || entry.default === 'deny';
}
