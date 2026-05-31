import { randomUUID } from 'node:crypto';

export type JsonValue =
	| string
	| number
	| boolean
	| null
	| JsonValue[]
	| { [key: string]: JsonValue };

export type MemoryKind =
	| 'semantic'
	| 'episodic'
	| 'preference'
	| 'workflow_instruction'
	| 'project_context';

export type MemoryImportance = 'low' | 'medium' | 'high' | 'critical';

export type MemorySourceType =
	| 'user_explicit'
	| 'user_implicit'
	| 'agent_inferred'
	| 'system'
	| 'imported';

export interface MemorySource {
	type: MemorySourceType;
	sessionId?: string;
	messageId?: string;
	evidence?: string;
}

export type MemoryPrivacyLevel = 'public' | 'personal' | 'private' | 'sensitive';

export interface MemoryItem {
	id: string;
	userId: string;
	kind: MemoryKind;
	content: string;
	summary: string;
	tags: string[];
	importance: MemoryImportance;
	confidence: number;
	privacyLevel: MemoryPrivacyLevel;
	source: MemorySource;
	createdAt: string;
	updatedAt: string;
	lastAccessedAt: string;
	expiresAt?: string;
	metadata: Record<string, JsonValue>;
}

export type EpisodicMemory = MemoryItem & { kind: 'episodic' };
export type SemanticMemory = MemoryItem & {
	kind: 'semantic' | 'preference' | 'workflow_instruction' | 'project_context';
};

export interface LongTermMemory {
	items: MemoryItem[];
	archivedItems: MemoryItem[];
}

export interface UserMemory {
	userId: string;
	version: number;
	createdAt: string;
	updatedAt: string;
	longTerm: LongTermMemory;
}

export type AgentMessageRole = 'user' | 'assistant' | 'system';

export interface AgentMessage {
	id: string;
	role: AgentMessageRole;
	content: string;
	createdAt: string;
	metadata: Record<string, JsonValue>;
}

export interface ShortTermMemory {
	messages: AgentMessage[];
	summary?: string;
	maxMessages: number;
}

export interface WorkingMemory {
	turnId: string;
	userId: string;
	sessionId: string;
	context: string[];
	relevantMemoryIds: string[];
	notes: string[];
	createdAt: string;
	expiresAt: string;
}

export interface AgentSession {
	id: string;
	userId: string;
	createdAt: string;
	updatedAt: string;
	closedAt?: string;
	shortTermMemory: ShortTermMemory;
	workingMemory?: WorkingMemory;
	metadata: Record<string, JsonValue>;
}

export type MemoryUpdateAction = 'store' | 'update' | 'delete' | 'ignore' | 'session_only';

export interface MemoryUpdateDecision {
	action: MemoryUpdateAction;
	shouldStore: boolean;
	shouldUpdate: boolean;
	shouldDelete: boolean;
	reason: string;
	candidateMemory?: MemoryItem;
	targetMemoryId?: string;
	patch?: Partial<MemoryItem>;
	redactedContent?: string;
}

export interface MemoryStore {
	getMemory(userId: string): Promise<UserMemory>;
	saveMemory(userId: string, memory: UserMemory): Promise<void>;
	searchMemory(userId: string, query: string): Promise<MemoryItem[]>;
	addMemory(userId: string, item: MemoryItem): Promise<void>;
	updateMemory(userId: string, itemId: string, patch: Partial<MemoryItem>): Promise<void>;
	deleteMemory(userId: string, itemId: string): Promise<void>;
	exportMemory(userId: string): Promise<UserMemory>;
	deleteAllMemory(userId: string): Promise<void>;
}

export interface NewAgentMessage {
	role: AgentMessageRole;
	content: string;
	metadata?: Record<string, JsonValue>;
	id?: string;
	createdAt?: string;
}

export interface SessionManager {
	createSession(userId: string): Promise<AgentSession>;
	loadSession(sessionId: string): Promise<AgentSession>;
	appendMessage(sessionId: string, message: NewAgentMessage): Promise<AgentSession>;
	summarizeSession(sessionId: string): Promise<string>;
	closeSession(sessionId: string): Promise<AgentSession>;
}

export interface WorkingMemorySessionManager extends SessionManager {
	setWorkingMemory(sessionId: string, workingMemory: WorkingMemory): Promise<AgentSession>;
}

export interface LlmPromptMessage {
	role: 'user' | 'assistant';
	content: string;
}

export interface BuiltPrompt {
	system: string;
	messages: LlmPromptMessage[];
	renderedPrompt: string;
	relevantMemoryIds: string[];
}

export interface LlmRequest {
	model: string;
	system: string;
	messages: LlmPromptMessage[];
	renderedPrompt: string;
	relevantMemory: MemoryItem[];
	userId: string;
	sessionId: string;
	signal?: AbortSignal;
	metadata?: Record<string, JsonValue>;
}

export interface LlmResponse {
	content: string;
	usage?: {
		inputTokens: number;
		outputTokens: number;
	};
	metadata?: Record<string, JsonValue>;
}

export interface LlmProvider {
	complete(request: LlmRequest): Promise<LlmResponse>;
}

export interface IdGenerator {
	createId(prefix: string): string;
}

export class CryptoIdGenerator implements IdGenerator {
	createId(prefix: string): string {
		return `${prefix}_${randomUUID()}`;
	}
}

export type Clock = () => Date;

export class MemoryAgentError extends Error {
	constructor(
		message: string,
		readonly cause?: unknown
	) {
		super(message);
		this.name = 'MemoryAgentError';
	}
}

export class MemoryStoreError extends MemoryAgentError {
	constructor(message: string, cause?: unknown) {
		super(message, cause);
		this.name = 'MemoryStoreError';
	}
}

export class SessionNotFoundError extends MemoryAgentError {
	constructor(sessionId: string) {
		super(`Session not found: ${sessionId}`);
		this.name = 'SessionNotFoundError';
	}
}

export class MemoryItemNotFoundError extends MemoryAgentError {
	constructor(itemId: string) {
		super(`Memory item not found: ${itemId}`);
		this.name = 'MemoryItemNotFoundError';
	}
}

export class AgentExecutionError extends MemoryAgentError {
	constructor(message: string, cause?: unknown) {
		super(message, cause);
		this.name = 'AgentExecutionError';
	}
}
