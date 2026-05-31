import type { ZodSchema } from 'zod';

export type Message =
	| { role: 'user'; content: string }
	| { role: 'assistant'; content: string; toolCalls?: ToolCall[] }
	| { role: 'tool'; toolCallId: string; name: string; content: string; isError?: boolean };

export type ToolCall = {
	id: string;
	name: string;
	input: unknown;
};

export type ToolProgress = {
	message: string;
	metadata?: Record<string, unknown>;
};

export type ValidationResult = { ok: true } | { ok: false; message: string };

export type PermissionDecision =
	| { behavior: 'allow'; input?: unknown }
	| { behavior: 'deny'; message: string }
	| { behavior: 'ask'; message: string; input?: unknown };

export type PermissionMode = 'default' | 'plan' | 'auto' | 'bypass';

export type PermissionRule = {
	toolName?: string;
	pattern?: string;
};

export type PermissionContext = {
	mode: PermissionMode;
	alwaysAllowRules: PermissionRule[];
	alwaysDenyRules: PermissionRule[];
	alwaysAskRules: PermissionRule[];
	additionalWorkingDirectories: string[];
	requestApproval?(request: PermissionRequest): Promise<PermissionDecision>;
};

export type PermissionRequest = {
	toolName: string;
	input: unknown;
	message: string;
};

export type ReadFileState = Map<
	string,
	{
		timestamp: number;
		hash: string;
		isPartialView: boolean;
	}
>;

export type AppState = {
	activeInstructions: string[];
	readFileState: ReadFileState;
	metadata: Record<string, unknown>;
};

export type Logger = {
	event(name: string, data?: Record<string, unknown>): void;
};

export type Metrics = {
	measure<T>(name: string, work: () => Promise<T>): Promise<T>;
};

export type MemoryStore = {
	retrieve(query: string): Promise<string[]>;
	store(text: string): Promise<void>;
};

export type AgentContext = {
	messages: Message[];
	tools: Tool<unknown, unknown>[];
	abortSignal: AbortSignal;
	permissionContext: PermissionContext;
	getState(): AppState;
	setState(update: (prev: AppState) => AppState): void;
	memory?: MemoryStore;
	logger: Logger;
	metrics: Metrics;
	user?: { id: string; name?: string };
};

export type ToolResult<Output> = {
	data: Output;
	content?: string;
};

export type Tool<Input, Output> = {
	name: string;
	description: string;
	inputSchema: ZodSchema<Input>;
	outputSchema?: ZodSchema<Output>;
	prompt(): Promise<string>;
	validateInput?(input: Input, context: AgentContext): Promise<ValidationResult> | ValidationResult;
	checkPermissions(input: Input, context: AgentContext): Promise<PermissionDecision> | PermissionDecision;
	call(input: Input, context: AgentContext, onProgress?: (progress: ToolProgress) => void): Promise<ToolResult<Output>>;
	isReadOnly(input: Input): boolean;
	isDestructive?(input: Input): boolean;
};
