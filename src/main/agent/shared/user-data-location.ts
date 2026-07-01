import path from 'node:path';
import { app } from 'electron';

export function userDataLocation(): string {
	try {
		return app.getPath('userData');
	} catch {
		const base = process.env.APPDATA ?? process.env.XDG_CONFIG_HOME ?? process.env.HOME ?? process.cwd();
		return path.resolve(base, app?.getName?.() ?? 'Friday');
	}
}
