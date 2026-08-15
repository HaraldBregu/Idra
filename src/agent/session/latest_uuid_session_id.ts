import { existsSync, readdirSync, statSync } from 'node:fs';
import type { SessionCategory } from './types';
import { sessionPath } from './common';
import { sessionType } from './session_type';
import { isUuid } from './common';

export function latestUuidSessionId(
	sessionsPath: string,
	category: SessionCategory
): string | undefined {
	if (!existsSync(sessionsPath)) return undefined;
	try {
		return readdirSync(sessionsPath, { withFileTypes: true })
			.filter(
				(entry) =>
					entry.isDirectory() &&
					isUuid(entry.name) &&
					sessionType(sessionsPath, entry.name) === category
			)
			.map((entry) => {
				const stats = statSync(sessionPath(sessionsPath, entry.name));
				return {
					name: entry.name,
					createdAtMs: stats.birthtimeMs || stats.ctimeMs || stats.mtimeMs,
				};
			})
			.sort((a, b) => b.createdAtMs - a.createdAtMs || b.name.localeCompare(a.name))[0]?.name;
	} catch {
		return undefined;
	}
}
