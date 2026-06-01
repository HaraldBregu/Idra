import fs from 'node:fs/promises';
import path from 'node:path';
import { isPathInside, type WorkspaceFileName } from '../../../modules/workspace/files';
import type { StartupSetupState } from './types';

const STARTUP_STATE_VERSION = 1;

export async function fileContentDiffersFromTemplate(
	filePath: string,
	template: string
): Promise<boolean> {
	try {
		return (await fs.readFile(filePath, 'utf8')) !== template;
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
		return false;
	}
}

export async function pathExists(filePath: string): Promise<boolean> {
	try {
		await fs.access(filePath);
		return true;
	} catch {
		return false;
	}
}

export async function assertSafeWritableStartupFile(
	root: string,
	name: WorkspaceFileName,
	filePath: string
): Promise<void> {
	const rootPath = path.resolve(root);
	if (!isPathInside(rootPath, filePath)) {
		throw new Error(`Startup file resolves outside root: ${name}`);
	}
	try {
		const stat = await fs.lstat(filePath);
		if (stat.isSymbolicLink()) throw new Error(`Refusing to write symlink: ${name}`);
		if (!stat.isFile()) throw new Error(`Refusing to write non-file: ${name}`);
		if (stat.nlink > 1) throw new Error(`Refusing to write hard-linked file: ${name}`);
		const [rootRealPath, fileRealPath] = await Promise.all([
			fs.realpath(root),
			fs.realpath(filePath),
		]);
		if (!isPathInside(rootRealPath, fileRealPath)) {
			throw new Error(`Startup file resolves outside root: ${name}`);
		}
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
	}
}

export async function readStartupSetupState(statePath: string): Promise<StartupSetupState> {
	try {
		const raw = await fs.readFile(statePath, 'utf8');
		const parsed = JSON.parse(raw) as Partial<StartupSetupState>;
		return {
			version: STARTUP_STATE_VERSION,
			bootstrapSeededAt:
				typeof parsed.bootstrapSeededAt === 'string' ? parsed.bootstrapSeededAt : undefined,
			setupCompletedAt:
				typeof parsed.setupCompletedAt === 'string' ? parsed.setupCompletedAt : undefined,
		};
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
			return { version: STARTUP_STATE_VERSION };
		}
		if (error instanceof SyntaxError) {
			return { version: STARTUP_STATE_VERSION };
		}
		throw error;
	}
}

export async function writeStartupSetupState(
	statePath: string,
	state: StartupSetupState
): Promise<void> {
	await fs.mkdir(path.dirname(statePath), { recursive: true, mode: 0o700 });
	await fs.writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`, {
		encoding: 'utf8',
		mode: 0o600,
	});
}
