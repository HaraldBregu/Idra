import fs from 'node:fs/promises';
import path from 'node:path';
import type { LoggerService } from '../logger';
import { resolveDefaultUserDataPath } from '../user-data';

export const DEFAULT_AGENTS_FILENAME = 'AGENTS.md';
export const DEFAULT_SOUL_FILENAME = 'SOUL.md';
export const DEFAULT_IDENTITY_FILENAME = 'IDENTITY.md';
export const DEFAULT_USER_FILENAME = 'USER.md';
export const DEFAULT_HEARTBEAT_FILENAME = 'HEARTBEAT.md';
export const DEFAULT_BOOTSTRAP_FILENAME = 'BOOTSTRAP.md';
export const DEFAULT_MEMORY_FILENAME = 'MEMORY.md';

export const WORKSPACE_CONTEXT_FILE_NAMES = [
	DEFAULT_AGENTS_FILENAME,
	DEFAULT_SOUL_FILENAME,
	DEFAULT_IDENTITY_FILENAME,
	DEFAULT_USER_FILENAME,
	DEFAULT_HEARTBEAT_FILENAME,
	DEFAULT_BOOTSTRAP_FILENAME,
	DEFAULT_MEMORY_FILENAME,
] as const;

export const SEEDED_WORKSPACE_FILE_NAMES = [
	DEFAULT_AGENTS_FILENAME,
	DEFAULT_SOUL_FILENAME,
	DEFAULT_IDENTITY_FILENAME,
	DEFAULT_USER_FILENAME,
	DEFAULT_HEARTBEAT_FILENAME,
] as const;

export const DEFAULT_WORKSPACE_CONTEXT_MAX_CHARS = 12_000;
export const DEFAULT_WORKSPACE_CONTEXT_TOTAL_MAX_CHARS = 60_000;
export const MAX_WORKSPACE_CONTEXT_FILE_BYTES = 2 * 1024 * 1024;

export type WorkspaceFileName = (typeof WORKSPACE_CONTEXT_FILE_NAMES)[number];

export type WorkspaceContextFile = {
	name: WorkspaceFileName;
	path: string;
	content?: string;
	missing: boolean;
	error?: 'missing' | 'unsafe' | 'io';
	detail?: string;
};

export type WorkspaceFileSummary = {
	name: WorkspaceFileName;
	path: string;
	missing: boolean;
	size?: number;
};

export type BootstrapMode = 'none' | 'limited' | 'full';

const BUNDLED_TEMPLATES: Record<string, string> = Object.fromEntries(
	Object.entries(
		import.meta.glob('./templates/*.md', {
			query: '?raw',
			eager: true,
			import: 'default',
		}) as Record<string, string>
	).map(([templatePath, content]) => [path.basename(templatePath), stripFrontMatter(content)])
);

const workspaceFileNames = new Set<string>(WORKSPACE_CONTEXT_FILE_NAMES);

export interface AgentStartupFilesServiceOptions {
	rootPath?: string;
	logger?: Pick<LoggerService, 'debug' | 'warn'>;
}

export interface AgentStartupFilesServicePort {
	getRootPath(agentId: string): string;
	ensureReady(agentId: string): Promise<void>;
	isBootstrapPending(agentId: string): Promise<boolean>;
	loadContextFiles(agentId: string): Promise<WorkspaceContextFile[]>;
	listFiles(agentId: string): Promise<WorkspaceFileSummary[]>;
	readFile(agentId: string, name: string): Promise<WorkspaceContextFile>;
	writeFile(agentId: string, name: string, content: string): Promise<WorkspaceContextFile>;
	completeBootstrap(agentId: string): Promise<WorkspaceContextFile>;
}

const STATE_DIRNAME = '.friday';
const STATE_FILENAME = 'startup-state.json';
const STATE_VERSION = 1;

type StartupState = {
	version: typeof STATE_VERSION;
	bootstrapSeededAt?: string;
	setupCompletedAt?: string;
};

const PROFILE_FILE_NAMES = [
	DEFAULT_SOUL_FILENAME,
	DEFAULT_IDENTITY_FILENAME,
	DEFAULT_USER_FILENAME,
] as const satisfies readonly WorkspaceFileName[];

const CONTEXT_FILE_PROMPT_ORDER = new Map<WorkspaceFileName, number>([
	[DEFAULT_AGENTS_FILENAME, 10],
	[DEFAULT_SOUL_FILENAME, 20],
	[DEFAULT_IDENTITY_FILENAME, 30],
	[DEFAULT_USER_FILENAME, 40],
	[DEFAULT_BOOTSTRAP_FILENAME, 60],
	[DEFAULT_MEMORY_FILENAME, 70],
	[DEFAULT_HEARTBEAT_FILENAME, 80],
]);

export class AgentStartupFilesService implements AgentStartupFilesServicePort {
	private readonly rootPath: string;
	private readonly logger?: Pick<LoggerService, 'debug' | 'warn'>;

	constructor(options: AgentStartupFilesServiceOptions = {}) {
		this.rootPath = options.rootPath ?? resolveDefaultUserDataPath('agent', 'workspaces');
		this.logger = options.logger;
	}

	getRootPath(agentId: string): string {
		const id = agentId.trim();
		if (!id) throw new Error('Agent id is required.');
		return path.join(this.rootPath, encodeURIComponent(id));
	}

	async ensureReady(agentId: string): Promise<void> {
		const root = this.getRootPath(agentId);
		await fs.mkdir(root, { recursive: true, mode: 0o700 });

		let state = await this.readState(root);
		let stateDirty = false;
		const markState = (patch: Partial<StartupState>): void => {
			state = { ...state, ...patch };
			stateDirty = true;
		};
		const now = (): string => new Date().toISOString();
		const bootstrapPath = path.join(root, DEFAULT_BOOTSTRAP_FILENAME);
		let bootstrapExists = await pathExists(bootstrapPath);

		for (const fileName of SEEDED_WORKSPACE_FILE_NAMES) {
			await writeFileIfMissing(path.join(root, fileName), await loadWorkspaceTemplate(fileName));
		}

		if (!state.bootstrapSeededAt && bootstrapExists) {
			markState({ bootstrapSeededAt: now() });
		}

		if (!state.setupCompletedAt && state.bootstrapSeededAt && !bootstrapExists) {
			markState({ setupCompletedAt: now() });
		}

		if (
			!state.setupCompletedAt &&
			bootstrapExists &&
			(await this.profileLooksConfigured(root))
		) {
			await fs.rm(bootstrapPath, { force: true });
			bootstrapExists = false;
			markState({
				bootstrapSeededAt: state.bootstrapSeededAt ?? now(),
				setupCompletedAt: now(),
			});
		}

		if (!state.bootstrapSeededAt && !state.setupCompletedAt && !bootstrapExists) {
			if (await this.profileLooksConfigured(root)) {
				markState({ setupCompletedAt: now() });
			} else {
				const wroteBootstrap = await writeFileIfMissing(
					bootstrapPath,
					await loadWorkspaceTemplate(DEFAULT_BOOTSTRAP_FILENAME)
				);
				bootstrapExists = wroteBootstrap || (await pathExists(bootstrapPath));
				if (bootstrapExists) {
					markState({ bootstrapSeededAt: now() });
				}
			}
		}

		if (stateDirty) {
			await this.writeState(root, state);
		}
		this.logger?.debug?.('AgentStartupFilesService', 'Startup files ready', {
			agentId,
			root,
			bootstrapPending: bootstrapExists && !state.setupCompletedAt,
		});
	}

	async isBootstrapPending(agentId: string): Promise<boolean> {
		await this.ensureReady(agentId);
		const root = this.getRootPath(agentId);
		const state = await this.readState(root);
		if (state.setupCompletedAt) return false;
		return pathExists(path.join(root, DEFAULT_BOOTSTRAP_FILENAME));
	}

	async loadContextFiles(agentId: string): Promise<WorkspaceContextFile[]> {
		await this.ensureReady(agentId);
		const root = this.getRootPath(agentId);
		const state = await this.readState(root);
		let files = await Promise.all(
			WORKSPACE_CONTEXT_FILE_NAMES.map((name) => safeReadWorkspaceFile(root, name))
		);
		if (state.setupCompletedAt) {
			files = files.filter((file) => file.name !== DEFAULT_BOOTSTRAP_FILENAME);
		}
		return files.filter((file) => file.name !== DEFAULT_MEMORY_FILENAME || !file.missing);
	}

	async listFiles(agentId: string): Promise<WorkspaceFileSummary[]> {
		await this.ensureReady(agentId);
		const root = this.getRootPath(agentId);
		return Promise.all(
			WORKSPACE_CONTEXT_FILE_NAMES.map(async (name) => {
				const filePath = path.join(root, name);
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

	async readFile(agentId: string, name: string): Promise<WorkspaceContextFile> {
		assertWorkspaceFileName(name);
		await this.ensureReady(agentId);
		return safeReadWorkspaceFile(this.getRootPath(agentId), name);
	}

	async writeFile(agentId: string, name: string, content: string): Promise<WorkspaceContextFile> {
		assertWorkspaceFileName(name);
		if (Buffer.byteLength(content, 'utf8') > MAX_WORKSPACE_CONTEXT_FILE_BYTES) {
			throw new Error(`Startup file exceeds ${MAX_WORKSPACE_CONTEXT_FILE_BYTES} bytes: ${name}`);
		}
		await this.ensureReady(agentId);
		const root = this.getRootPath(agentId);
		const filePath = path.join(root, name);
		await assertSafeWritableStartupFile(root, name, filePath);
		await fs.writeFile(filePath, content, { encoding: 'utf8', mode: 0o600 });
		return safeReadWorkspaceFile(root, name);
	}

	async completeBootstrap(agentId: string): Promise<WorkspaceContextFile> {
		await this.ensureReady(agentId);
		const root = this.getRootPath(agentId);
		await fs.rm(path.join(root, DEFAULT_BOOTSTRAP_FILENAME), { force: true });
		const state = await this.readState(root);
		await this.writeState(root, {
			...state,
			setupCompletedAt: state.setupCompletedAt ?? new Date().toISOString(),
		});
		return safeReadWorkspaceFile(root, DEFAULT_BOOTSTRAP_FILENAME);
	}

	private async profileLooksConfigured(root: string): Promise<boolean> {
		const diffs = await Promise.all(
			PROFILE_FILE_NAMES.map(async (fileName) =>
				fileContentDiffersFromTemplate(path.join(root, fileName), await loadWorkspaceTemplate(fileName))
			)
		);
		return diffs.some(Boolean) || (await this.hasExistingUserEvidence(root));
	}

	private async hasExistingUserEvidence(root: string): Promise<boolean> {
		for (const candidate of [
			path.join(root, 'memory'),
			path.join(root, '.git'),
			path.join(root, DEFAULT_MEMORY_FILENAME),
		]) {
			if (await pathExists(candidate)) return true;
		}
		return false;
	}

	private async readState(root: string): Promise<StartupState> {
		try {
			const raw = await fs.readFile(this.statePath(root), 'utf8');
			const parsed = JSON.parse(raw) as Partial<StartupState>;
			return {
				version: STATE_VERSION,
				bootstrapSeededAt:
					typeof parsed.bootstrapSeededAt === 'string' ? parsed.bootstrapSeededAt : undefined,
				setupCompletedAt:
					typeof parsed.setupCompletedAt === 'string' ? parsed.setupCompletedAt : undefined,
			};
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === 'ENOENT' || error instanceof SyntaxError) {
				return { version: STATE_VERSION };
			}
			throw error;
		}
	}

	private async writeState(root: string, state: StartupState): Promise<void> {
		const statePath = this.statePath(root);
		await fs.mkdir(path.dirname(statePath), { recursive: true, mode: 0o700 });
		await fs.writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`, {
			encoding: 'utf8',
			mode: 0o600,
		});
	}

	private statePath(root: string): string {
		return path.join(root, STATE_DIRNAME, STATE_FILENAME);
	}
}

async function fileContentDiffersFromTemplate(filePath: string, template: string): Promise<boolean> {
	try {
		return (await fs.readFile(filePath, 'utf8')) !== template;
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
		return false;
	}
}

async function pathExists(filePath: string): Promise<boolean> {
	try {
		await fs.access(filePath);
		return true;
	} catch {
		return false;
	}
}

async function assertSafeWritableStartupFile(
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

export function isWorkspaceFileName(name: string): name is WorkspaceFileName {
	return workspaceFileNames.has(name);
}

export function assertWorkspaceFileName(name: string): asserts name is WorkspaceFileName {
	if (!isWorkspaceFileName(name)) {
		throw new Error(`Unsupported workspace file: ${name}`);
	}
}

export async function loadWorkspaceTemplate(name: WorkspaceFileName): Promise<string> {
	const bundled = BUNDLED_TEMPLATES[name];
	if (bundled !== undefined) return bundled;

	const sourcePath = path.resolve(process.cwd(), 'src', 'main', 'agent', 'templates', name);
	try {
		return stripFrontMatter(await fs.readFile(sourcePath, 'utf8'));
	} catch {
		throw new Error(`Missing workspace template: ${name}`);
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

export function isPathInside(rootPath: string, targetPath: string): boolean {
	const relativePath = path.relative(path.resolve(rootPath), path.resolve(targetPath));
	return relativePath === '' || (!relativePath.startsWith('..') && !path.isAbsolute(relativePath));
}

export async function safeReadWorkspaceFile(
	workspaceRoot: string,
	name: WorkspaceFileName
): Promise<WorkspaceContextFile> {
	const filePath = path.join(workspaceRoot, name);
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
		if (stat.size > MAX_WORKSPACE_CONTEXT_FILE_BYTES) {
			return unsafeFile(name, filePath, `file exceeds ${MAX_WORKSPACE_CONTEXT_FILE_BYTES} bytes`);
		}

		return {
			name,
			path: filePath,
			content: await fs.readFile(filePath, 'utf8'),
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

export function resolveBootstrapMode(params: {
	bootstrapPending: boolean;
	isInteractiveUserFacing: boolean;
	isPrimaryRun: boolean;
	hasBootstrapFileAccess: boolean;
	runKind?: 'default' | 'heartbeat' | 'cron';
}): BootstrapMode {
	if (!params.bootstrapPending) return 'none';
	if (params.runKind === 'heartbeat' || params.runKind === 'cron') return 'none';
	if (!params.isInteractiveUserFacing || !params.isPrimaryRun) return 'none';
	return params.hasBootstrapFileAccess ? 'full' : 'limited';
}

export function renderWorkspaceContextFiles(
	files: WorkspaceContextFile[],
	options: { maxChars?: number; totalMaxChars?: number } = {}
): string {
	const maxChars = options.maxChars ?? DEFAULT_WORKSPACE_CONTEXT_MAX_CHARS;
	let remaining = options.totalMaxChars ?? DEFAULT_WORKSPACE_CONTEXT_TOTAL_MAX_CHARS;
	const blocks: string[] = [];

	for (const file of [...files].sort(compareContextFilesForPrompt)) {
		if (remaining <= 0) break;
		const content = file.missing
			? `[MISSING] Expected at: ${file.path}${file.detail ? ` (${file.detail})` : ''}`
			: file.content ?? '';
		const trimmed = trimWithMarker(content.trimEnd(), file.name, Math.min(maxChars, remaining));
		remaining -= trimmed.length;
		const note =
			file.name === 'SOUL.md'
				? '\nNote: persona/tone guidance only; higher-priority instructions override it.'
				: '';
		blocks.push(
			[`<workspace_file name="${file.name}" path="${file.path}">`, trimmed, `${note}</workspace_file>`].join('\n')
		);
	}

	return blocks.join('\n\n');
}

function compareContextFilesForPrompt(a: WorkspaceContextFile, b: WorkspaceContextFile): number {
	const aOrder = CONTEXT_FILE_PROMPT_ORDER.get(a.name) ?? Number.MAX_SAFE_INTEGER;
	const bOrder = CONTEXT_FILE_PROMPT_ORDER.get(b.name) ?? Number.MAX_SAFE_INTEGER;
	if (aOrder !== bOrder) return aOrder - bOrder;
	return a.path.localeCompare(b.path);
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

function unsafeFile(name: WorkspaceFileName, filePath: string, detail: string): WorkspaceContextFile {
	return { name, path: filePath, missing: true, error: 'unsafe', detail };
}
