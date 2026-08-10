import type { ToolPermission } from './permissions_types';

export function normalizeToolPermission(value: unknown, fallback: ToolPermission): ToolPermission {
	if (!value || typeof value !== 'object' || Array.isArray(value))
		return {
			default: fallback.default,
			allow: [...fallback.allow],
			deny: [...fallback.deny],
			ask: [...fallback.ask],
		};
	const entry = value as Partial<ToolPermission>;
	const mode =
		entry.default === 'allow' || entry.default === 'deny' || entry.default === 'ask'
			? entry.default
			: fallback.default;
	const list = (candidate: unknown, otherwise: string[]): string[] =>
		Array.isArray(candidate)
			? [
					...new Set(
						candidate
							.filter((item): item is string => typeof item === 'string')
							.map((item) => item.trim())
							.filter(Boolean)
					),
				]
			: [...otherwise];
	return {
		default: mode,
		allow: list(entry.allow, fallback.allow),
		deny: list(entry.deny, fallback.deny),
		ask: list(entry.ask, fallback.ask),
	};
}
