import { app } from 'electron';
import { promises as fs } from 'node:fs';
import path from 'node:path';

export const USER_DATA_DIRECTORY_NAME = '.friday';

export interface UserDataDirectoryServiceOptions {
	homePath?: string;
	directoryName?: string;
}

export interface UserDataDirectoryServicePort {
	getRootPath(): string;
	ensureRoot(): Promise<string>;
	resolve(...segments: string[]): string;
	resolveExisting(...segments: string[]): Promise<string>;
}

export class UserDataDirectoryService implements UserDataDirectoryServicePort {
	private readonly rootPath: string;

	constructor(options: UserDataDirectoryServiceOptions = {}) {
		const homePath = path.resolve(options.homePath ?? resolveHomePath());
		this.rootPath = path.join(homePath, options.directoryName ?? USER_DATA_DIRECTORY_NAME);
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
				throw new Error(`User data path segment must be relative: ${segment}`);
			}
			if (segment.split(/[\\/]+/).includes('..')) {
				throw new Error(`User data path segment cannot traverse directories: ${segment}`);
			}
		}

		const targetPath = path.resolve(this.rootPath, ...segments);
		if (!isPathInside(this.rootPath, targetPath)) {
			throw new Error(`User data path is outside root: ${segments.join(path.sep)}`);
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
			throw new Error(`User data path resolves outside root: ${segments.join(path.sep)}`);
		}

		return targetRealPath;
	}
}

export function resolveDefaultUserDataPath(...segments: string[]): string {
	return new UserDataDirectoryService().resolve(...segments);
}

function resolveHomePath(): string {
	try {
		return app.getPath('home');
	} catch {
		return process.env.HOME ?? process.cwd();
	}
}

function isPathInside(rootPath: string, targetPath: string): boolean {
	const relativePath = path.relative(path.resolve(rootPath), path.resolve(targetPath));
	return relativePath === '' || (!relativePath.startsWith('..') && !path.isAbsolute(relativePath));
}
