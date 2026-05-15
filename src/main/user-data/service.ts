import { app } from 'electron';
import { promises as fs } from 'node:fs';
import path from 'node:path';

export const USER_DATA_DIRECTORY_NAME = '.friday';

export interface UserDataDirectoryServiceOptions {
	appPath?: string;
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
		const appPath = path.resolve(options.appPath ?? resolveDefaultApplicationPath());
		this.rootPath = path.join(path.dirname(appPath), options.directoryName ?? USER_DATA_DIRECTORY_NAME);
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

function resolveDefaultApplicationPath(): string {
	const candidates = [safeGetAppPath(), process.cwd()].filter((value): value is string => Boolean(value));

	for (const candidate of candidates) {
		const fridayRoot = findAncestorNamed(path.resolve(candidate), 'friday');
		if (fridayRoot) return fridayRoot;
	}

	return path.resolve(candidates[0] ?? process.cwd());
}

function safeGetAppPath(): string | undefined {
	try {
		return app.getAppPath();
	} catch {
		return undefined;
	}
}

function findAncestorNamed(startPath: string, name: string): string | undefined {
	let current = startPath;
	while (true) {
		if (path.basename(current).toLowerCase() === name) {
			return current;
		}

		const parent = path.dirname(current);
		if (parent === current) {
			return undefined;
		}
		current = parent;
	}
}

function isPathInside(rootPath: string, targetPath: string): boolean {
	const relativePath = path.relative(path.resolve(rootPath), path.resolve(targetPath));
	return relativePath === '' || (!relativePath.startsWith('..') && !path.isAbsolute(relativePath));
}
