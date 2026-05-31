export type MemorySource = 'memory' | 'sessions';
export type MemoryCorpus = 'memory' | 'wiki' | 'all' | 'sessions';
export type SessionVisibility = 'self' | 'tree' | 'agent' | 'all';

export interface MemorySearchResult {
	source: MemorySource;
	path: string;
	chunkId: string;
	text: string;
	score: number;
	lineStart?: number;
	lineEnd?: number;
	sessionId?: string;
	metadata?: Record<string, unknown>;
}

export interface MemoryReadResult {
	path: string;
	from: number;
	lines: number;
	text: string;
	truncated: boolean;
	nextFrom?: number;
	maxChars: number;
	lineCount: number;
}

export interface MemorySearchManager {
	search(query: string, options?: {
		maxResults?: number;
		minScore?: number;
		source?: MemorySource;
		sources?: MemorySource[];
		sessionKey?: string;
	}): Promise<MemorySearchResult[]>;

	readFile(path: string, options?: {
		from?: number;
		lines?: number;
		maxChars?: number;
	}): Promise<MemoryReadResult>;

	status(): Promise<Record<string, unknown>>;
	warmSession?(): Promise<void>;
	close?(): Promise<void>;
}

export interface WorkspaceMemorySearchManagerOptions {
	workspaceDir: string;
	sessionBaseDir?: string;
	enabled?: boolean;
	includeSessions?: boolean;
	extraPaths?: string[];
	sessionVisibility?: SessionVisibility;
	currentSessionId?: string;
}

export interface MemoryFlushPlan {
	targetPath: string;
	relativePath: string;
	prompt: string;
}

export type IndexedChunk = {
	source: MemorySource;
	path: string;
	chunkId: string;
	text: string;
	lineStart?: number;
	lineEnd?: number;
	sessionId?: string;
	metadata?: Record<string, unknown>;
};
