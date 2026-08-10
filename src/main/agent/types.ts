import type { z } from 'zod';
import type { LlmEvent } from '../models/adapters/llm';
import type { AgentRunType } from '../../shared/agent_types';
import type { SkillDiagnostic, SkillTrust } from '../../shared/skills_types';

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
	readonly id: string;
	readonly name: string;
	readonly description: string;
	readonly schema: JSONSchema;
	readonly timeoutMs: number;
	readonly maxOutputBytes: number;
	parseInput(input: unknown): Record<string, unknown>;
	run(input: Record<string, unknown>, signal?: AbortSignal): Promise<unknown> | unknown;
}

export type ToolConfig<T extends z.ZodType> = {
	id: string;
	name: string;
	description: string;
	timeoutMs?: number;
	maxOutputBytes?: number;
	inputSchema: T;
	execute: (input: z.infer<T>, signal?: AbortSignal) => Promise<unknown> | unknown;
};

export type JsonToolConfig = {
	id: string;
	name: string;
	description: string;
	timeoutMs?: number;
	maxOutputBytes?: number;
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

type RuntimeInputBase = Pick<
	SessionInput,
	'sessionId' | 'messages' | 'model' | 'effort' | 'maxTurns' | 'maxIterations' | 'files'
> & {
	legacySessionId?: string;
	runId: string;
	task: string;
	message: string;
	providerId?: string;
	agentId: string;
	contextMode: 'minimal' | 'workspace';
	toolsDeny?: string[];
	approvalWindowId?: number;
	explicitSkill?: string;
};

export type RuntimeInput = RuntimeInputBase &
	({ type: 'default'; toolsAllow?: string[] } | { type: 'background'; toolsAllow: string[] });

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

export interface McpDiscoveryIssue {
	serverId: string;
	phase: 'connect' | 'list' | 'schema' | 'limit';
	toolName?: string;
}

export interface McpDiscoveryDiagnostics {
	configuredServers: number;
	enabledServers: number;
	connectedServers: number;
	listedTools: number;
	loadedTools: number;
	rejectedTools: number;
	truncated: boolean;
	failures: McpDiscoveryIssue[];
}

export type RuntimeEvent =
	| RuntimeModelEvent
	| { type: 'provider_queue_metrics'; providerId: string; queueDelayMs: number; attempt: number }
	| { type: 'run_error'; message: string }
	| {
			type: 'run_started';
			sessionId: string;
			model: string;
			providerId: string;
			tools: string[];
			mcpDiscovery?: McpDiscoveryDiagnostics;
			skillDiagnostics?: readonly SkillDiagnostic[];
			skillActivations?: { id: string; name: string; hash: string; trust: SkillTrust }[];
	  }
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
			targets: string[];
			expiresAt: string;
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
			permissionOutcome?: 'allow' | 'deny' | 'approve' | 'approve_always' | 'reject' | 'bypass';
	  }
	| { type: 'run_finished'; result: RuntimeOutput };
