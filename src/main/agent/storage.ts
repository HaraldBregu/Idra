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

export class AgentDataDirectoryService implements AgentDataDirectoryServicePort {
	private readonly rootPath: string;

	constructor(options: AgentDataDirectoryServiceOptions = {}) {
		const appDataPath = path.resolve(options.appDataPath ?? resolveAppDataPath());
		this.rootPath = path.join(
			appDataPath,
			options.appDirectoryName ?? AGENT_APP_DATA_DIRECTORY_NAME,
			AGENT_DATA_DIRECTORY_NAME
		);
	}

	getRootPath(): string {
		return this.rootPath;
	}

	async ensureRoot(): Promise<string> {
		await fs.mkdir(this.rootPath, { recursive: true, mode: 0o700 });
		if (process.platform !== 'win32') {
			await fs.chmod(this.rootPath, 0o700).catch(() => undefined);
		}
		return this.rootPath;
	}

	resolve(...segments: string[]): string {
		for (const segment of segments) {
			if (path.isAbsolute(segment) || path.win32.isAbsolute(segment)) {
				throw new Error(`Agent data path segment must be relative: ${segment}`);
			}
			if (segment.split(/[\\/]+/).includes('..')) {
				throw new Error(`Agent data path segment cannot traverse directories: ${segment}`);
			}
		}

		const targetPath = path.resolve(this.rootPath, ...segments);
		if (!isPathInside(this.rootPath, targetPath)) {
			throw new Error(`Agent data path is outside root: ${segments.join(path.sep)}`);
		}

		return targetPath;
	}

	async resolveExisting(...segments: string[]): Promise<string> {
		const targetPath = this.resolve(...segments);
		const [rootRealPath, targetRealPath] = await Promise.all([
			fs.realpath(this.rootPath),
			fs.realpath(targetPath),
		]);

		if (!isPathInside(rootRealPath, targetRealPath)) {
			throw new Error(`Agent data path resolves outside root: ${segments.join(path.sep)}`);
		}

		return targetRealPath;
	}
}

export function resolveDefaultAgentDataPath(...segments: string[]): string {
	return new AgentDataDirectoryService().resolve(...segments);
}

export function resolveDefaultAppDataPath(...segments: string[]): string {
	const rootPath = path.join(path.resolve(resolveAppDataPath()), AGENT_APP_DATA_DIRECTORY_NAME);
	for (const segment of segments) {
		if (path.isAbsolute(segment) || path.win32.isAbsolute(segment)) {
			throw new Error(`App data path segment must be relative: ${segment}`);
		}
		if (segment.split(/[\\/]+/).includes('..')) {
			throw new Error(`App data path segment cannot traverse directories: ${segment}`);
		}
	}

	const targetPath = path.resolve(rootPath, ...segments);
	if (!isPathInside(rootPath, targetPath)) {
		throw new Error(`App data path is outside root: ${segments.join(path.sep)}`);
	}
	return targetPath;
}

function resolveAppDataPath(): string {
	try {
		return app.getPath('appData');
	} catch {
		return process.env.APPDATA ?? process.env.XDG_CONFIG_HOME ?? process.env.HOME ?? process.cwd();
	}
}

function isPathInside(rootPath: string, targetPath: string): boolean {
	const relativePath = path.relative(path.resolve(rootPath), path.resolve(targetPath));
	return relativePath === '' || (!relativePath.startsWith('..') && !path.isAbsolute(relativePath));
}
