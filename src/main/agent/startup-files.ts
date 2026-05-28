import fs from 'node:fs/promises';
import path from 'node:path';

import { resolveDefaultUserDataPath, type UserDataDirectoryServicePort } from '../user-data';

export const DEFAULT_AGENTS_FILENAME = 'AGENTS.md';
export const DEFAULT_SOUL_FILENAME = 'SOUL.md';
export const DEFAULT_TOOLS_FILENAME = 'TOOLS.md';
export const DEFAULT_IDENTITY_FILENAME = 'IDENTITY.md';
export const DEFAULT_USER_FILENAME = 'USER.md';
export const DEFAULT_HEARTBEAT_FILENAME = 'HEARTBEAT.md';
export const DEFAULT_BOOTSTRAP_FILENAME = 'BOOTSTRAP.md';
export const DEFAULT_MEMORY_FILENAME = 'MEMORY.md';

export const AGENT_STARTUP_FILE_NAMES = [
	DEFAULT_AGENTS_FILENAME,
	DEFAULT_SOUL_FILENAME,
	DEFAULT_TOOLS_FILENAME,
	DEFAULT_IDENTITY_FILENAME,
	DEFAULT_USER_FILENAME,
	DEFAULT_HEARTBEAT_FILENAME,
	DEFAULT_BOOTSTRAP_FILENAME,
	DEFAULT_MEMORY_FILENAME,
] as const;

export const SEEDED_AGENT_STARTUP_FILE_NAMES = [
	DEFAULT_AGENTS_FILENAME,
	DEFAULT_SOUL_FILENAME,
	DEFAULT_TOOLS_FILENAME,
	DEFAULT_IDENTITY_FILENAME,
	DEFAULT_USER_FILENAME,
	DEFAULT_HEARTBEAT_FILENAME,
] as const;

const AGENT_STARTUP_PROFILE_FILE_NAMES = [
	DEFAULT_SOUL_FILENAME,
	DEFAULT_IDENTITY_FILENAME,
	DEFAULT_USER_FILENAME,
] as const;

export const DEFAULT_STARTUP_CONTEXT_MAX_CHARS = 12_000;
export const DEFAULT_STARTUP_CONTEXT_TOTAL_MAX_CHARS = 60_000;
export const MAX_AGENT_STARTUP_FILE_BYTES = 2 * 1024 * 1024;

const STARTUP_STATE_DIRNAME = '.friday';
const STARTUP_STATE_FILENAME = 'startup-state.json';
const STARTUP_STATE_VERSION = 1;

type StartupSetupState = {
	version: typeof STARTUP_STATE_VERSION;
	bootstrapSeededAt?: string;
	setupCompletedAt?: string;
};

export type AgentStartupFileName = (typeof AGENT_STARTUP_FILE_NAMES)[number];

export type AgentStartupFile = {
	name: AgentStartupFileName;
	path: string;
	content?: string;
	missing: boolean;
	error?: 'missing' | 'unsafe' | 'io';
	detail?: string;
};

export type AgentStartupFileSummary = {
	name: AgentStartupFileName;
	path: string;
	missing: boolean;
	size?: number;
};

export interface AgentStartupFilesServiceOptions {
	rootPath?: string;
	userDataDirectory?: UserDataDirectoryServicePort;
}

export interface AgentStartupFilesServicePort {
	getRootPath(agentId: string): string;
	ensureReady(agentId: string): Promise<void>;
	isBootstrapPending(agentId: string): Promise<boolean>;
	loadContextFiles(agentId: string): Promise<AgentStartupFile[]>;
	listFiles(agentId: string): Promise<AgentStartupFileSummary[]>;
	readFile(agentId: string, name: string): Promise<AgentStartupFile>;
	writeFile(agentId: string, name: string, content: string): Promise<AgentStartupFile>;
	completeBootstrap(agentId: string): Promise<AgentStartupFile>;
}

const BUNDLED_TEMPLATES: Record<string, string> = Object.fromEntries(
	Object.entries(
		import.meta.glob('../templates/*.md', {
			query: '?raw',
			eager: true,
			import: 'default',
		}) as Record<string, string>
	).map(([templatePath, content]) => [path.basename(templatePath), stripFrontMatter(content)])
);

const startupFileNames = new Set<string>(AGENT_STARTUP_FILE_NAMES);

export function isAgentStartupFileName(name: string): name is AgentStartupFileName {
	return startupFileNames.has(name);
}

export function assertAgentStartupFileName(name: string): asserts name is AgentStartupFileName {
	if (!isAgentStartupFileName(name)) {
		throw new Error(`Unsupported agent startup file: ${name}`);
	}
}

export async function loadAgentStartupTemplate(name: AgentStartupFileName): Promise<string> {
	const bundled = BUNDLED_TEMPLATES[name];
	if (bundled !== undefined) return bundled;

	const sourcePath = path.resolve(process.cwd(), 'src', 'main', 'templates', name);
	try {
		return stripFrontMatter(await fs.readFile(sourcePath, 'utf8'));
	} catch {
		throw new Error(`Missing agent startup template: ${name}`);
	}
}

export class AgentStartupFilesService implements AgentStartupFilesServicePort {
	private readonly basePath: string;

	constructor(options: AgentStartupFilesServiceOptions = {}) {
		this.basePath =
			options.rootPath ??
			options.userDataDirectory?.resolve('agent', 'workspaces') ??
			resolveDefaultUserDataPath('agent', 'workspaces');
	}

	getRootPath(agentId: string): string {
		return path.join(this.basePath, agentPathSegment(agentId));
	}

	async ensureReady(agentId: string): Promise<void> {
		const rootPath = this.getRootPath(agentId);
		await fs.mkdir(rootPath, { recursive: true, mode: 0o700 });
		await this.seedStartupFiles(agentId);
		await this.reconcileBootstrapState(agentId);
	}

	async isBootstrapPending(agentId: string): Promise<boolean> {
		await this.ensureReady(agentId);
		const state = await this.readSetupState(agentId);
		if (state.setupCompletedAt) return false;
		return this.pathExists(path.join(this.getRootPath(agentId), DEFAULT_BOOTSTRAP_FILENAME));
	}

	async loadContextFiles(agentId: string): Promise<AgentStartupFile[]> {
		await this.ensureReady(agentId);
		const rootPath = this.getRootPath(agentId);
		let files = await Promise.all(
			AGENT_STARTUP_FILE_NAMES.map((name) => safeReadAgentStartupFile(rootPath, name))
		);
		const state = await this.readSetupState(agentId);
		if (state.setupCompletedAt) {
			files = files.filter((file) => file.name !== DEFAULT_BOOTSTRAP_FILENAME);
		}
		return files.filter((file) => file.name !== DEFAULT_MEMORY_FILENAME || !file.missing);
	}

	async listFiles(agentId: string): Promise<AgentStartupFileSummary[]> {
		await this.ensureReady(agentId);
		const rootPath = this.getRootPath(agentId);
		return Promise.all(
			AGENT_STARTUP_FILE_NAMES.map(async (name) => {
				const filePath = path.join(rootPath, name);
				try {
					const stat = await fs.lstat(filePath);
					return { name, path: filePath, missing: false, size: stat.size };
				} catch (error) {
					if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
					return { name, path: filePath, missing: true };
				}
			})
		);
	}

	async readFile(agentId: string, name: string): Promise<AgentStartupFile> {
		assertAgentStartupFileName(name);
		await this.ensureReady(agentId);
		return safeReadAgentStartupFile(this.getRootPath(agentId), name);
	}

	async writeFile(agentId: string, name: string, content: string): Promise<AgentStartupFile> {
		assertAgentStartupFileName(name);
		if (Buffer.byteLength(content, 'utf8') > MAX_AGENT_STARTUP_FILE_BYTES) {
			throw new Error(`Agent startup file exceeds ${MAX_AGENT_STARTUP_FILE_BYTES} bytes: ${name}`);
		}
		await this.ensureReady(agentId);
		const filePath = path.join(this.getRootPath(agentId), name);
		await this.assertSafeWritableStartupFile(agentId, name, filePath);
		await fs.writeFile(filePath, content, { encoding: 'utf8', mode: 0o600 });
		return this.readFile(agentId, name);
	}

	async completeBootstrap(agentId: string): Promise<AgentStartupFile> {
		await this.ensureReady(agentId);
		await fs.rm(path.join(this.getRootPath(agentId), DEFAULT_BOOTSTRAP_FILENAME), { force: true });
		await this.markSetupCompleted(agentId);
		return this.readFile(agentId, DEFAULT_BOOTSTRAP_FILENAME);
	}

	private async seedStartupFiles(agentId: string): Promise<void> {
		const rootPath = this.getRootPath(agentId);
		for (const name of SEEDED_AGENT_STARTUP_FILE_NAMES) {
			await writeFileIfMissing(
				path.join(rootPath, name),
				await loadAgentStartupTemplate(name as AgentStartupFileName)
			);
		}
	}

	private async reconcileBootstrapState(agentId: string): Promise<void> {
		let state = await this.readSetupState(agentId);
		let dirty = false;
		const rootPath = this.getRootPath(agentId);
		const bootstrapPath = path.join(rootPath, DEFAULT_BOOTSTRAP_FILENAME);
		let bootstrapExists = await this.pathExists(bootstrapPath);
		const now = (): string => new Date().toISOString();
		const markState = (next: Partial<StartupSetupState>): void => {
			state = { ...state, ...next };
			dirty = true;
		};

		if (state.setupCompletedAt) {
			if (bootstrapExists) await fs.rm(bootstrapPath, { force: true });
			return;
		}

		if (state.bootstrapSeededAt && !bootstrapExists) {
			markState({ setupCompletedAt: now() });
		}

		if (!state.bootstrapSeededAt && bootstrapExists) {
			markState({ bootstrapSeededAt: now() });
		}

		if (
			!state.setupCompletedAt &&
			bootstrapExists &&
			(await this.startupProfileLooksConfigured(agentId, { includeGitEvidence: false }))
		) {
			await fs.rm(bootstrapPath, { force: true });
			bootstrapExists = false;
			markState({
				bootstrapSeededAt: state.bootstrapSeededAt ?? now(),
				setupCompletedAt: now(),
			});
		}

		if (!state.bootstrapSeededAt && !state.setupCompletedAt && !bootstrapExists) {
			if (await this.startupProfileLooksConfigured(agentId, { includeGitEvidence: true })) {
				markState({ setupCompletedAt: now() });
			} else {
				const wrote = await writeFileIfMissing(
					bootstrapPath,
					await loadAgentStartupTemplate(DEFAULT_BOOTSTRAP_FILENAME)
				);
				bootstrapExists = wrote || (await this.pathExists(bootstrapPath));
				if (bootstrapExists) markState({ bootstrapSeededAt: now() });
			}
		}

		if (dirty) await this.writeSetupState(agentId, state);
	}

	private async startupProfileLooksConfigured(
		agentId: string,
		options: { includeGitEvidence: boolean }
	): Promise<boolean> {
		const rootPath = this.getRootPath(agentId);
		for (const name of AGENT_STARTUP_PROFILE_FILE_NAMES) {
			if (
				await this.fileContentDiffersFromTemplate(
					path.join(rootPath, name),
					await loadAgentStartupTemplate(name)
				)
			) {
				return true;
			}
		}

		if (await this.pathExists(path.join(rootPath, 'memory'))) return true;
		if (await this.exactRootEntryExists(agentId, DEFAULT_MEMORY_FILENAME)) return true;
		return options.includeGitEvidence && (await this.pathExists(path.join(rootPath, '.git')));
	}

	private async fileContentDiffersFromTemplate(filePath: string, template: string): Promise<boolean> {
		try {
			return (await fs.readFile(filePath, 'utf8')) !== template;
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
			return false;
		}
	}

	private async exactRootEntryExists(agentId: string, name: string): Promise<boolean> {
		try {
			return (await fs.readdir(this.getRootPath(agentId))).includes(name);
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
			throw error;
		}
	}

	private async markSetupCompleted(agentId: string): Promise<void> {
		const state = await this.readSetupState(agentId);
		await this.writeSetupState(agentId, {
			...state,
			setupCompletedAt: state.setupCompletedAt ?? new Date().toISOString(),
		});
	}

	private async readSetupState(agentId: string): Promise<StartupSetupState> {
		try {
			const raw = await fs.readFile(this.statePath(agentId), 'utf8');
			const parsed = JSON.parse(raw) as Partial<StartupSetupState>;
			return {
				version: STARTUP_STATE_VERSION,
				bootstrapSeededAt:
					typeof parsed.bootstrapSeededAt === 'string' ? parsed.bootstrapSeededAt : undefined,
				setupCompletedAt:
					typeof parsed.setupCompletedAt === 'string' ? parsed.setupCompletedAt : undefined,
			};
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
			return { version: STARTUP_STATE_VERSION };
		}
	}

	private async writeSetupState(agentId: string, state: StartupSetupState): Promise<void> {
		const statePath = this.statePath(agentId);
		await fs.mkdir(path.dirname(statePath), { recursive: true, mode: 0o700 });
		await fs.writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`, {
			encoding: 'utf8',
			mode: 0o600,
		});
	}

	private statePath(agentId: string): string {
		return path.join(this.getRootPath(agentId), STARTUP_STATE_DIRNAME, STARTUP_STATE_FILENAME);
	}

	private async assertSafeWritableStartupFile(
		agentId: string,
		name: AgentStartupFileName,
		filePath: string
	): Promise<void> {
		const rootPath = path.resolve(this.getRootPath(agentId));
		if (!isPathInside(rootPath, filePath)) {
			throw new Error(`Agent startup file resolves outside root: ${name}`);
		}
		try {
			const stat = await fs.lstat(filePath);
			if (stat.isSymbolicLink()) throw new Error(`Refusing to write symlink: ${name}`);
			if (!stat.isFile()) throw new Error(`Refusing to write non-file: ${name}`);
			if (stat.nlink > 1) throw new Error(`Refusing to write hard-linked file: ${name}`);
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
		}
	}

	private async pathExists(filePath: string): Promise<boolean> {
		try {
			await fs.access(filePath);
			return true;
		} catch {
			return false;
		}
	}
}

export async function safeReadAgentStartupFile(
	rootPath: string,
	name: AgentStartupFileName
): Promise<AgentStartupFile> {
	const filePath = path.join(rootPath, name);
	try {
		const stat = await fs.lstat(filePath);
		if (stat.isSymbolicLink()) {
			return unsafeFile(name, filePath, 'symbolic links are not allowed');
		}
		if (!stat.isFile()) {
			return unsafeFile(name, filePath, 'not a regular file');
		}
		if (stat.nlink > 1) {
			return unsafeFile(name, filePath, 'hard-linked files are not allowed');
		}
		if (stat.size > MAX_AGENT_STARTUP_FILE_BYTES) {
			return unsafeFile(name, filePath, `file exceeds ${MAX_AGENT_STARTUP_FILE_BYTES} bytes`);
		}

		const [rootRealPath, fileRealPath] = await Promise.all([
			fs.realpath(rootPath),
			fs.realpath(filePath),
		]);
		if (!isPathInside(rootRealPath, fileRealPath)) {
			return unsafeFile(name, filePath, 'file resolves outside the agent startup root');
		}

		return {
			name,
			path: filePath,
			content: await fs.readFile(fileRealPath, 'utf8'),
			missing: false,
		};
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
			return { name, path: filePath, missing: true, error: 'missing' };
		}
		return {
			name,
			path: filePath,
			missing: true,
			error: 'io',
			detail: error instanceof Error ? error.message : String(error),
		};
	}
}

export async function writeFileIfMissing(filePath: string, content: string): Promise<boolean> {
	try {
		await fs.writeFile(filePath, content, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
		return true;
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'EEXIST') return false;
		throw error;
	}
}

export function renderAgentStartupFiles(
	files: AgentStartupFile[],
	options: { maxChars?: number; totalMaxChars?: number } = {}
): string {
	const maxChars = options.maxChars ?? DEFAULT_STARTUP_CONTEXT_MAX_CHARS;
	let remaining = options.totalMaxChars ?? DEFAULT_STARTUP_CONTEXT_TOTAL_MAX_CHARS;
	const blocks: string[] = [];

	for (const file of files) {
		if (remaining <= 0) break;
		const content = file.missing
			? `[MISSING] Expected at: ${file.path}${file.detail ? ` (${file.detail})` : ''}`
			: file.content ?? '';
		const trimmed = trimWithMarker(content.trimEnd(), file.name, Math.min(maxChars, remaining));
		remaining -= trimmed.length;
		const note =
			file.name === DEFAULT_SOUL_FILENAME
				? '\nNote: persona/tone guidance only; higher-priority instructions override it.'
				: '';
		blocks.push(
			[`<startup_file name="${file.name}" path="${file.path}">`, trimmed, `${note}</startup_file>`].join('\n')
		);
	}

	return blocks.join('\n\n');
}

export function isPathInside(rootPath: string, targetPath: string): boolean {
	const relativePath = path.relative(path.resolve(rootPath), path.resolve(targetPath));
	return relativePath === '' || (!relativePath.startsWith('..') && !path.isAbsolute(relativePath));
}

function agentPathSegment(agentId: string): string {
	const trimmed = agentId.trim();
	if (!trimmed) throw new Error('Agent id is required.');
	return encodeURIComponent(trimmed);
}

function stripFrontMatter(content: string): string {
	if (!content.startsWith('---')) return content;
	const endIndex = content.indexOf('\n---', 3);
	if (endIndex === -1) return content;
	return content.slice(endIndex + '\n---'.length).replace(/^\s+/, '');
}

function trimWithMarker(content: string, fileName: string, maxChars: number): string {
	if (content.length <= maxChars) return content;
	const marker = `\n[...truncated ${fileName}; read the file for full content...]\n`;
	const budget = Math.max(0, maxChars - marker.length);
	const head = Math.floor(budget * 0.75);
	const tail = budget - head;
	return `${content.slice(0, head)}${marker}${tail > 0 ? content.slice(-tail) : ''}`;
}

function unsafeFile(name: AgentStartupFileName, filePath: string, detail: string): AgentStartupFile {
	return { name, path: filePath, missing: true, error: 'unsafe', detail };
}
