import { app } from 'electron';
import { promises as fs } from 'node:fs';
import path from 'node:path';

export const AGENT_APP_DATA_DIRECTORY_NAME = 'friday';
export const AGENT_DATA_DIRECTORY_NAME = 'agent';

export interface AgentDataDirectoryServiceOptions {
	appDataPath?: string;
	appDirectoryName?: string;
}

export interface AgentDataDirectoryServicePort {
	getRootPath(): string;
	ensureRoot(): Promise<string>;
	resolve(...segments: string[]): string;
	resolveExisting(...segments: string[]): Promise<string>;
}

function appDataPath(): string {
	try {
		return app.getPath('appData');
	} catch {
		return process.env.APPDATA ?? process.env.XDG_CONFIG_HOME ?? process.env.HOME ?? process.cwd();
	}
}

function assertRelative(segment: string): void {
	if (path.isAbsolute(segment) || segment.split(/[\\/]+/).includes('..')) {
		throw new Error(`Path segment must be relative and non-traversing: ${segment}`);
	}
}

export class AgentDataDirectoryService implements AgentDataDirectoryServicePort {
	private readonly rootPath: string;

	constructor(options: AgentDataDirectoryServiceOptions = {}) {
		this.rootPath = path.join(path.resolve(options.appDataPath ?? appDataPath()), options.appDirectoryName ?? AGENT_APP_DATA_DIRECTORY_NAME, AGENT_DATA_DIRECTORY_NAME);
	}

	getRootPath(): string {
		return this.rootPath;
	}

	async ensureRoot(): Promise<string> {
		await fs.mkdir(this.rootPath, { recursive: true, mode: 0o700 });
		return this.rootPath;
	}

	resolve(...segments: string[]): string {
		segments.forEach(assertRelative);
		return path.resolve(this.rootPath, ...segments);
	}

	async resolveExisting(...segments: string[]): Promise<string> {
		return fs.realpath(this.resolve(...segments));
	}
}

export function resolveDefaultAgentDataPath(...segments: string[]): string {
	return new AgentDataDirectoryService().resolve(...segments);
}

export function resolveDefaultAppDataPath(...segments: string[]): string {
	segments.forEach(assertRelative);
	return path.resolve(path.join(appDataPath(), AGENT_APP_DATA_DIRECTORY_NAME), ...segments);
}
