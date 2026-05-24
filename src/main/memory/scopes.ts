import { createHash } from 'node:crypto';
import path from 'node:path';

export type MemoryCorpus = 'memory' | 'sessions' | 'rag' | 'wiki' | 'all';
export type MemoryFileCorpus = Exclude<MemoryCorpus, 'sessions' | 'all'>;
export type MemoryResultCorpus = Exclude<MemoryCorpus, 'all'>;
export type MemoryScopeKind = 'global' | 'chat' | 'task' | 'cron';

export interface MemoryScope {
	kind: MemoryScopeKind;
	id: string;
	relativeDir: string;
	displayName?: string;
}

export type MemoryScopeInput =
	| { kind: 'global'; displayName?: string }
	| { kind: 'chat'; id?: string; channel?: string; chatId?: string; threadId?: string; displayName?: string }
	| { kind: 'task'; id?: string; taskId?: string; displayName?: string }
	| { kind: 'cron'; id?: string; jobId?: string; displayName?: string };

export interface MemoryFileDescriptor {
	corpus: MemoryFileCorpus;
	scopeKind: MemoryScopeKind;
	scopeId: string;
	relativePath: string;
}

export interface MemoryCorpusFilter {
	corpora?: MemoryCorpus[];
	scopeKind?: MemoryScopeKind;
	scopeId?: string;
}

const MEMORY_ROOT = 'memory';
const ROOT_MEMORY_FILE = 'MEMORY.md';
const GLOBAL_SCOPE_ID = 'global';
const SAFE_SEGMENT_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const DATE_FILE_PATTERN = /^\d{4}-\d{2}-\d{2}\.md$/;

export function createMemoryScopeId(parts: readonly string[]): string {
	const raw = parts.map((part) => part.trim()).filter(Boolean).join(':');
	if (!raw) throw new Error('Memory scope id source is required.');
	const slug = raw
		.toLowerCase()
		.replace(/[^a-z0-9._-]+/g, '-')
		.replace(/^[._-]+|[._-]+$/g, '')
		.slice(0, 72) || 'scope';
	const hash = createHash('sha1').update(raw).digest('hex').slice(0, 8);
	return `${slug}-${hash}`;
}

export function normalizeMemoryScopeId(value: string): string {
	const trimmed = value.trim();
	if (!trimmed) throw new Error('Memory scope id is required.');
	return isSafeMemorySegment(trimmed) ? trimmed : createMemoryScopeId([trimmed]);
}

export function isSafeMemorySegment(value: string): boolean {
	return SAFE_SEGMENT_PATTERN.test(value) && value !== '.' && value !== '..';
}

export function resolveMemoryScope(input: MemoryScopeInput): MemoryScope {
	switch (input.kind) {
		case 'global':
			return {
				kind: 'global',
				id: GLOBAL_SCOPE_ID,
				relativeDir: MEMORY_ROOT,
				displayName: input.displayName,
			};
		case 'chat': {
			const id = input.id
				? normalizeMemoryScopeId(input.id)
				: createMemoryScopeId([
						input.channel ?? 'chat',
						input.chatId ?? '',
						input.threadId ?? '',
					]);
			return {
				kind: 'chat',
				id,
				relativeDir: path.join(MEMORY_ROOT, 'chats', id),
				displayName: input.displayName,
			};
		}
		case 'task': {
			const id = normalizeMemoryScopeId(input.id ?? input.taskId ?? '');
			return {
				kind: 'task',
				id,
				relativeDir: path.join(MEMORY_ROOT, 'tasks', id),
				displayName: input.displayName,
			};
		}
		case 'cron': {
			const id = normalizeMemoryScopeId(input.id ?? input.jobId ?? '');
			return {
				kind: 'cron',
				id,
				relativeDir: path.join(MEMORY_ROOT, 'cron', id),
				displayName: input.displayName,
			};
		}
	}
}

export function resolveDailyMemoryTarget(
	workspaceDir: string,
	scopeInput: MemoryScopeInput | undefined,
	date: string
): { scope: MemoryScope; relativePath: string; targetPath: string } {
	if (!DATE_FILE_PATTERN.test(`${date}.md`)) throw new Error('Memory date must be YYYY-MM-DD.');
	const workspace = path.resolve(workspaceDir);
	const scope = resolveMemoryScope(scopeInput ?? { kind: 'global' });
	const relativePath = path.join(scope.relativeDir, `${date}.md`);
	return {
		scope,
		relativePath,
		targetPath: path.resolve(workspace, relativePath),
	};
}

export function describeMemoryFile(workspaceDir: string, filePath: string): MemoryFileDescriptor | undefined {
	const workspace = path.resolve(workspaceDir);
	const absolute = path.resolve(filePath);
	const relativePath = path.relative(workspace, absolute);
	if (isUnsafeRelativePath(relativePath)) return undefined;
	if (relativePath === ROOT_MEMORY_FILE) {
		return {
			corpus: 'memory',
			scopeKind: 'global',
			scopeId: GLOBAL_SCOPE_ID,
			relativePath,
		};
	}

	const parts = splitRelativePath(relativePath);
	if (parts[0] !== MEMORY_ROOT || parts.length < 2) return undefined;
	const second = parts[1];
	if (second === 'rag') {
		return {
			corpus: 'rag',
			scopeKind: 'global',
			scopeId: 'rag',
			relativePath,
		};
	}
	if (second === 'wiki') {
		return {
			corpus: 'wiki',
			scopeKind: 'global',
			scopeId: 'wiki',
			relativePath,
		};
	}
	if (second === 'chats' && parts[2] && isSafeMemorySegment(parts[2])) {
		return {
			corpus: 'memory',
			scopeKind: 'chat',
			scopeId: parts[2],
			relativePath,
		};
	}
	if (second === 'tasks' && parts[2] && isSafeMemorySegment(parts[2])) {
		return {
			corpus: 'memory',
			scopeKind: 'task',
			scopeId: parts[2],
			relativePath,
		};
	}
	if (second === 'cron' && parts[2] && isSafeMemorySegment(parts[2])) {
		return {
			corpus: 'memory',
			scopeKind: 'cron',
			scopeId: parts[2],
			relativePath,
		};
	}

	return {
		corpus: 'memory',
		scopeKind: 'global',
		scopeId: GLOBAL_SCOPE_ID,
		relativePath,
	};
}

export function matchesMemoryCorpusFilter(
	result: { corpus: MemoryResultCorpus; scopeKind?: MemoryScopeKind; scopeId?: string },
	filter: MemoryCorpusFilter
): boolean {
	const corpora = filter.corpora?.filter((corpus) => corpus !== 'all') as MemoryResultCorpus[] | undefined;
	if (corpora && corpora.length > 0 && !corpora.includes(result.corpus)) return false;
	if (filter.scopeKind && result.scopeKind !== filter.scopeKind) return false;
	if (filter.scopeId && result.scopeId !== normalizeMemoryScopeId(filter.scopeId)) return false;
	return true;
}

export function validateDailyMemoryRelativePath(relativePath: string): void {
	if (isUnsafeRelativePath(relativePath)) {
		throw new Error('Memory flush target must stay inside the workspace.');
	}
	const parts = splitRelativePath(relativePath);
	if (parts[0] !== MEMORY_ROOT || !DATE_FILE_PATTERN.test(parts[parts.length - 1] ?? '')) {
		throw new Error('Memory flush target must be a scoped memory daily Markdown file.');
	}
}

function splitRelativePath(relativePath: string): string[] {
	return relativePath.split(/[\\/]+/).filter(Boolean);
}

function isUnsafeRelativePath(relativePath: string): boolean {
	if (!relativePath || path.isAbsolute(relativePath)) return true;
	const parts = splitRelativePath(relativePath);
	return parts.length === 0 || parts.includes('..');
}
