import { existsSync, readdirSync, statSync } from 'node:fs';
import { sessionPath } from './session_session_path';
import { isUuid } from './session_is_uuid';

export function latestUuidSessionId(sessionsPath: string): string | undefined {
	if (!existsSync(sessionsPath)) return undefined;
	try {
		return readdirSync(sessionsPath, { withFileTypes: true })
			.filter((entry) => entry.isDirectory() && isUuid(entry.name))
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
