import path from 'node:path';
import { app } from 'electron';

export class Workspace {
	private readonly workspacePath: string;

	constructor(workspacePath = resolveAppDataPath()) {
		this.workspacePath = path.resolve(workspacePath);
	}

	getWorkspace(): string {
		return this.workspacePath;
	}
}

function resolveAppDataPath(): string {
	try {
		return app.getPath('appData');
	} catch {
		return path.resolve(process.env.APPDATA ?? process.env.XDG_CONFIG_HOME ?? process.env.HOME ?? process.cwd());
	}
}
