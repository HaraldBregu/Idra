import type { JSONSchema } from '../../provider/types';

export type JsonSchema = JSONSchema;

export type ToolCategory =
	| 'search'
	| 'web'
	| 'files'
	| 'email'
	| 'calendar'
	| 'contacts'
	| 'database'
	| 'codeExecution'
	| 'calculator'
	| 'payments'
	| 'messaging'
	| 'image'
	| 'document'
	| 'internalApi'
	| 'memory'
	| 'utility';

export type SafetyLevel = 'safe' | 'low' | 'medium' | 'high' | 'critical';
export type PrivacyLevel = 'public' | 'internal' | 'private' | 'sensitive';

export interface ToolCostEstimate {
	amount: number;
	currency: 'USD' | 'tokens' | 'none';
	unit: 'call' | 'request' | 'minute' | 'unknown';
	tier: 'free' | 'low' | 'medium' | 'high';
}

export interface ToolLatencyEstimate {
	p50Ms: number;
	p95Ms: number;
}

export interface ToolRateLimit {
	maxCalls: number;
	windowMs: number;
	scope: 'tool' | 'user' | 'session';
}

export interface ToolExample<TInput = unknown, TOutput = unknown> {
	description: string;
	input: TInput;
	output?: TOutput;
}

export interface ToolMetadata {
	whenToUse?: string;
	whenNotToUse?: string;
	safetyNotes?: string;
	privacyLevel?: PrivacyLevel;
	authoritative?: boolean;
	primarySource?: boolean;
	requiresConfirmation?: boolean;
	readOnly?: boolean;
	cacheable?: boolean;
	maxAgeMs?: number;
	executionTimeoutMs?: number;
	allowUnknownInputFields?: boolean;
	[key: string]: unknown;
}

export interface ToolExecutionContext {
	userId?: string;
	sessionId: string;
	userTimezone: string;
	now: Date;
	availablePermissions: ReadonlySet<string>;
	confirmedActionIds: ReadonlySet<string>;
	reasonForUse?: string;
	selectedAlternatives?: string[];
	turnId?: string;
	signal?: AbortSignal;
	metadata?: Record<string, unknown>;
	requestConfirmation?: (request: ToolConfirmationRequest) => Promise<boolean>;
}

export interface ToolConfirmationRequest {
	toolId: string;
	toolName: string;
	reason: string;
	inputPreview: unknown;
	permissions: string[];
	safetyLevel: SafetyLevel;
}

export interface ToolError {
	code: string;
	message: string;
	retryable: boolean;
	category:
		| 'validation'
		| 'permission'
		| 'rateLimit'
		| 'timeout'
		| 'provider'
		| 'safety'
		| 'unknown';
	details?: unknown;
}

export interface ToolResult<TOutput = unknown> {
	success: boolean;
	data?: TOutput;
	error?: ToolError;
	warnings: string[];
	toolId: string;
	startedAt: string;
	finishedAt: string;
	durationMs: number;
	retryCount: number;
	metadata: Record<string, unknown>;
}

export interface Tool<TInput = unknown, TOutput = unknown> {
	id: string;
	name: string;
	description: string;
	category: ToolCategory;
	inputSchema: JsonSchema;
	outputSchema: JsonSchema;
	permissionsRequired: string[];
	safetyLevel: SafetyLevel;
	costEstimate: ToolCostEstimate;
	latencyEstimate: ToolLatencyEstimate;
	reliabilityScore: number;
	rateLimit?: ToolRateLimit;
	examples: Array<ToolExample<TInput, TOutput>>;
	tags: string[];
	enabled: boolean;
	version: string;
	owner: string;
	metadata: ToolMetadata;
	execute(input: TInput, context: ToolExecutionContext): Promise<ToolResult<TOutput>>;
}

export interface SessionContext {
	userId?: string;
	sessionId: string;
	userTimezone: string;
	availablePermissions: ReadonlySet<string>;
	confirmedActionIds?: ReadonlySet<string>;
	privacyConstraints?: {
		allowedPrivacyLevels: PrivacyLevel[];
		disallowExternalPrivateData?: boolean;
	};
	safetyConstraints?: {
		maxSafetyLevel: SafetyLevel;
	};
	metadata?: Record<string, unknown>;
}

export interface RelevantMemory {
	preferredTools?: string[];
	preferredCategories?: ToolCategory[];
	recentlySuccessfulToolIds?: string[];
	safeDefaults?: Record<string, unknown>;
	projectIds?: Record<string, string>;
	metadata?: Record<string, unknown>;
}

export interface RankedTool {
	tool: Tool;
	score: number;
	explanations: string[];
}

export type ToolSelectionDecision =
	| { type: 'useTool'; toolId: string; reason: string }
	| { type: 'useMultipleTools'; toolIds: string[]; reason: string }
	| { type: 'askClarifyingQuestion'; question: string; reason: string }
	| { type: 'answerWithoutTool'; reason: string }
	| { type: 'refuseForSafety'; reason: string };

export interface ToolPlanStep {
	id: string;
	toolId: string;
	purpose: string;
	inputDependencies: string[];
	expectedOutputs: string[];
	stopConditions: string[];
	fallbackToolIds: string[];
}

export interface ToolPlan {
	goal: string;
	steps: ToolPlanStep[];
	maxSteps: number;
	stopConditions: string[];
}

export interface ToolCard {
	name: string;
	id: string;
	purpose: string;
	whenToUse: string;
	whenNotToUse: string;
	requiredInputs: string[];
	safetyNotes: string;
	exampleCall: unknown;
}

export interface LLMCompletionRequest {
	system: string;
	prompt: string;
	maxTokens: number;
	temperature?: number;
}

export interface LLMProvider {
	complete(request: LLMCompletionRequest): Promise<string>;
}

export const TOOL_SAFETY_ORDER: Record<SafetyLevel, number> = {
	safe: 0,
	low: 1,
	medium: 2,
	high: 3,
	critical: 4,
};

export const TOOL_PRIVACY_ORDER: Record<PrivacyLevel, number> = {
	public: 0,
	internal: 1,
	private: 2,
	sensitive: 3,
};

export function createToolResult<TOutput>(input: {
	toolId: string;
	success: boolean;
	data?: TOutput;
	error?: ToolError;
	warnings?: string[];
	startedAt?: Date;
	finishedAt?: Date;
	retryCount?: number;
	metadata?: Record<string, unknown>;
}): ToolResult<TOutput> {
	const startedAt = input.startedAt ?? new Date();
	const finishedAt = input.finishedAt ?? new Date();
	return {
		success: input.success,
		data: input.data,
		error: input.error,
		warnings: input.warnings ?? [],
		toolId: input.toolId,
		startedAt: startedAt.toISOString(),
		finishedAt: finishedAt.toISOString(),
		durationMs: Math.max(0, finishedAt.getTime() - startedAt.getTime()),
		retryCount: input.retryCount ?? 0,
		metadata: input.metadata ?? {},
	};
}

export class ToolManagementError extends Error {
	constructor(
		message: string,
		readonly code: string,
		readonly details?: unknown
	) {
		super(message);
		this.name = 'ToolManagementError';
	}
}
