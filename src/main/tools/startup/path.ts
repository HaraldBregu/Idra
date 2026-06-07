import { app } from 'electron';
import path from 'node:path';

const APP_DATA_DIRECTORY_NAME = 'friday';
const AGENT_DATA_DIRECTORY_NAME = 'agent';

export function resolveAgentDataPath(...segments: string[]): string {
	for (const segment of segments) {
		if (path.isAbsolute(segment) || path.win32.isAbsolute(segment)) {
			throw new Error(`Agent data path segment must be relative: ${segment}`);
		}
		if (segment.split(/[\\/]+/).includes('..')) {
			throw new Error(`Agent data path segment cannot traverse directories: ${segment}`);
		}
	}

	const rootPath = path.join(resolveAppDataPath(), APP_DATA_DIRECTORY_NAME, AGENT_DATA_DIRECTORY_NAME);
	return path.resolve(rootPath, ...segments);
}

function resolveAppDataPath(): string {
	try {
		return app.getPath('appData');
	} catch {
		return process.env.APPDATA ?? process.env.XDG_CONFIG_HOME ?? process.env.HOME ?? process.cwd();
	}
}
