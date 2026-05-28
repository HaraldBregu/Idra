import path from 'node:path';
import {
	WORKSPACE_MEMORY_DIR,
	createSafeMemoryId,
	isSafeMemoryPathSegment,
	isUnsafeRelativePath,
	normalizeMemoryPathSegment,
	relativeWorkspacePath,
	splitRelativeMemoryPath,
} from './path';

export type ChatMemoryScopeKind = 'global' | 'chat';

export interface ChatMemoryScope {
	kind: ChatMemoryScopeKind;
	id: string;
	relativeDir: string;
	displayName?: string;
}

export type ChatMemoryScopeInput =
	| { kind: 'global'; displayName?: string }
	| { kind: 'chat'; id?: string; channel?: string; chatId?: string; threadId?: string; displayName?: string };

export interface ChatMemoryFileDescriptor {
	corpus: 'memory';
	scopeKind: ChatMemoryScopeKind;
	scopeId: string;
	relativePath: string;
}

const ROOT_MEMORY_FILE = 'MEMORY.md';
const GLOBAL_SCOPE_ID = 'global';
const CHATS_DIRNAME = 'chats';
const DATE_FILE_PATTERN = /^\d{4}-\d{2}-\d{2}\.md$/;

export function resolveChatMemoryScope(input: ChatMemoryScopeInput): ChatMemoryScope {
	if (input.kind === 'global') {
		return {
			kind: 'global',
			id: GLOBAL_SCOPE_ID,
			relativeDir: WORKSPACE_MEMORY_DIR,
			displayName: input.displayName,
		};
	}

	const id = input.id
		? normalizeMemoryPathSegment(input.id, 'Chat memory scope id')
		: createSafeMemoryId([input.channel ?? 'chat', input.chatId ?? '', input.threadId ?? '']);
	return {
		kind: 'chat',
		id,
		relativeDir: path.join(WORKSPACE_MEMORY_DIR, CHATS_DIRNAME, id),
		displayName: input.displayName,
	};
}

export function resolveChatDailyMemoryTarget(
	workspaceDir: string,
	scopeInput: ChatMemoryScopeInput | undefined,
	date: string
): { scope: ChatMemoryScope; relativePath: string; targetPath: string } {
	if (!DATE_FILE_PATTERN.test(`${date}.md`)) throw new Error('Memory date must be YYYY-MM-DD.');
	const workspace = path.resolve(workspaceDir);
	const scope = resolveChatMemoryScope(scopeInput ?? { kind: 'global' });
	const relativePath = path.join(scope.relativeDir, `${date}.md`);
	return {
		scope,
		relativePath,
		targetPath: path.resolve(workspace, relativePath),
	};
}

export function describeChatMemoryFile(
	workspaceDir: string,
	filePath: string
): ChatMemoryFileDescriptor | undefined {
	const relativePath = relativeWorkspacePath(workspaceDir, filePath);
	if (!relativePath) return undefined;
	if (relativePath === ROOT_MEMORY_FILE) {
		return {
			corpus: 'memory',
			scopeKind: 'global',
			scopeId: GLOBAL_SCOPE_ID,
			relativePath,
		};
	}

	const parts = splitRelativeMemoryPath(relativePath);
	if (parts[0] !== WORKSPACE_MEMORY_DIR || parts.length < 2) return undefined;
	if (parts[1] === CHATS_DIRNAME && parts[2] && isSafeMemoryPathSegment(parts[2])) {
		return {
			corpus: 'memory',
			scopeKind: 'chat',
			scopeId: parts[2],
			relativePath,
		};
	}
	if (parts[1] !== 'rag' && parts[1] !== 'wiki') {
		return {
			corpus: 'memory',
			scopeKind: 'global',
			scopeId: GLOBAL_SCOPE_ID,
			relativePath,
		};
	}
	return undefined;
}

export function validateChatDailyMemoryRelativePath(relativePath: string): void {
	if (isUnsafeRelativePath(relativePath)) {
		throw new Error('Memory flush target must stay inside the workspace.');
	}
	const parts = splitRelativeMemoryPath(relativePath);
	const fileName = parts[parts.length - 1] ?? '';
	const isGlobalDaily = parts.length === 2 && parts[0] === WORKSPACE_MEMORY_DIR && DATE_FILE_PATTERN.test(fileName);
	const isChatDaily =
		parts.length === 4 &&
		parts[0] === WORKSPACE_MEMORY_DIR &&
		parts[1] === CHATS_DIRNAME &&
		Boolean(parts[2] && isSafeMemoryPathSegment(parts[2])) &&
		DATE_FILE_PATTERN.test(fileName);
	if (!isGlobalDaily && !isChatDaily) {
		throw new Error('Memory flush target must be memory/YYYY-MM-DD.md or memory/chats/<chatScope>/YYYY-MM-DD.md.');
	}
}
