export type MemoryApiCorpus = 'memory' | 'sessions' | 'rag' | 'wiki';
export type MemoryApiScopeKind = 'global' | 'chat';

export interface MemorySearchRequest {
	query: string;
	maxResults?: number;
	minScore?: number;
	scopeId?: string;
}

export interface MemoryReadRequest {
	path: string;
	from?: number;
	lines?: number;
	maxChars?: number;
}

export interface ChatMemoryListRequest {
	scopeId?: string;
}

export interface MemoryFileSummary {
	path: string;
	relativePath: string;
	corpus: Exclude<MemoryApiCorpus, 'sessions'>;
	scopeKind: MemoryApiScopeKind;
	scopeId: string;
	size: number;
	updatedAt: string;
}

export interface MemorySearchResult {
	source: 'memory' | 'sessions';
	corpus: MemoryApiCorpus;
	path: string;
	chunkId: string;
	text: string;
	score: number;
	lineStart?: number;
	lineEnd?: number;
	scopeKind?: MemoryApiScopeKind;
	scopeId?: string;
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
