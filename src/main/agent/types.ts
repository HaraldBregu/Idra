import type { z } from 'zod';
import type { LlmEvent } from '../models/adapters/llm';
import type {
	AgentOrigin,
	AgentToolEffect,
	AgentToolRisk,
} from '../../shared/agent_types';

export interface Config {
	location: string;
}

export type MessageRole = 'system' | 'user' | 'assistant';

export interface ToolResult {
	content: MessageContent;
	isError?: boolean;
}

export interface ToolCall {
	id: string;
	name: string;
	args: Record<string, unknown>;
	result?: ToolResult;
}

export interface JSONSchema {
	type?: string;
	properties?: Record<string, unknown>;
	required?: string[];
	items?: unknown;
	description?: string;
	enum?: unknown[];
	additionalProperties?: boolean | unknown;
	[k: string]: unknown;
}

export interface Tool {
	readonly name: string;
	readonly description: string;
	readonly schema: JSONSchema;
	readonly defaultPermission?: 'allow' | 'ask' | 'deny';
	readonly alwaysAsk?: boolean;
	readonly hardApproval?: boolean | ((args: Record<string, unknown>) => boolean);
	readonly stopOnReject?: boolean;
	readonly risk: AgentToolRisk;
	readonly effect: AgentToolEffect;
	readonly allowedOrigins?: readonly AgentOrigin[];
	readonly timeoutMs: number;
	readonly maxOutputBytes: number;
	readonly confirmDetail?: (args: Record<string, unknown>) => string | undefined;
	readonly targets?: (args: Record<string, unknown>) => string[];
	parseInput(input: unknown): Record<string, unknown>;
	run(input: Record<string, unknown>, signal?: AbortSignal): Promise<unknown> | unknown;
}

export type ToolConfig<T extends z.ZodType> = {
	name: string;
	description: string;
	defaultPermission?: 'allow' | 'ask' | 'deny';
	alwaysAsk?: boolean;
	hardApproval?: boolean | ((args: z.infer<T>) => boolean);
	stopOnReject?: boolean;
	risk?: AgentToolRisk;
	effect?: AgentToolEffect;
	allowedOrigins?: readonly AgentOrigin[];
	timeoutMs?: number;
	maxOutputBytes?: number;
	confirmDetail?: (args: Record<string, unknown>) => string | undefined;
	targets?: (args: Record<string, unknown>) => string[];
	inputSchema: T;
	execute: (input: z.infer<T>, signal?: AbortSignal) => Promise<unknown> | unknown;
};

export type JsonToolConfig = {
	name: string;
	description: string;
	defaultPermission?: 'allow' | 'ask' | 'deny';
	hardApproval?: boolean | ((args: Record<string, unknown>) => boolean);
	risk?: AgentToolRisk;
	effect?: AgentToolEffect;
	allowedOrigins?: readonly AgentOrigin[];
	timeoutMs?: number;
	maxOutputBytes?: number;
	targets?: (args: Record<string, unknown>) => string[];
	parseInput?: (input: unknown) => Record<string, unknown>;
	schema: JSONSchema;
	execute: (input: Record<string, unknown>, signal?: AbortSignal) => Promise<unknown> | unknown;
};

export interface MessageContentBlock {
	type: string;
	[key: string]: unknown;
}

export type MessageContent = string | MessageContentBlock[];

export interface Message {
	role: MessageRole;
	content: MessageContent;
	toolCalls?: ToolCall[];
	usage?: SessionUsage;
}

import type {
	SessionCategory,
	SessionInput,
	SessionResult,
	SessionResultSubtype,
	SessionTurn,
	SessionUsage,
} from './session/session_types';

export type {
	SessionCategory,
	SessionInput,
	SessionResult,
	SessionResultSubtype,
	SessionTurn,
	SessionUsage,
};

export type RuntimeModelEvent = LlmEvent;

export type RuntimeOutput = SessionResult;

export interface RuntimeInput extends Pick<
	SessionInput,
	'sessionId' | 'messages' | 'model' | 'effort' | 'maxTurns' | 'maxIterations' | 'files'
> {
	legacySessionId?: string;
	runId: string;
	task: string;
	message: string;
	providerId?: string;
	origin: AgentOrigin;
	contextMode: 'minimal' | 'workspace';
	toolsAllow?: string[];
	toolsDeny?: string[];
	approvalWindowId?: number;
}

export interface RuntimeModelRoute {
	task: string;
	model: string;
}

export interface RuntimePrompt {
	system: string;
	prompt: string;
	messages: Message[];
}

export interface RuntimePerception {
	prompt: RuntimePrompt;
	model: string;
	maxTokens: number;
	maxRetries: number;
	maxIterations: number;
	tools: Tool[];
	signal?: AbortSignal;
}

export type RuntimeEvent =
	| RuntimeModelEvent
	| { type: 'run_started'; sessionId: string; model: string; providerId: string; tools: string[] }
	| { type: 'assistant_message'; content: string; toolCalls: ToolCall[] }
	| {
			type: 'tool_call_start';
			toolCallId: string;
			toolName: string;
			input: Record<string, unknown>;
	  }
	| {
			type: 'tool_permission_request';
			approvalId: string;
			toolCallId: string;
			toolName: string;
			input: Record<string, unknown>;
			mode: 'ask';
			risk: AgentToolRisk;
			effect: AgentToolEffect;
			targets: string[];
				hardApproval: boolean;
				expiresAt: string;
				origin: AgentOrigin;
				inputFingerprint: string;
		  }
	| {
			type: 'tool_call_end';
			toolCallId: string;
			toolName: string;
			input: Record<string, unknown>;
			output: unknown;
			isError?: boolean;
			durationMs: number;
			permissionOutcome?: 'allow' | 'deny' | 'approve' | 'approve_always' | 'reject';
	  }
	| { type: 'run_finished'; result: RuntimeOutput };
