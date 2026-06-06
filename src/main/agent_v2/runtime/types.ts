import type {
	ModelEvent,
	ModelMessage,
	ModelMessageRole,
	ModelModule,
	ModelProvider,
	ModelRequest,
	ModelResponse,
	ModelTool,
	ModelToolCall,
} from '../model/types';

export type RuntimeRole = ModelMessageRole;

export type RuntimeToolCall = ModelToolCall;
export type RuntimeMessage = ModelMessage;
export type RuntimeModelProvider = ModelProvider;

export interface RuntimeTool extends ModelTool {
	run?: (input: Record<string, unknown>) => Promise<unknown> | unknown;
}

export interface RuntimeSkill {
	name: string;
	run: (input: string) => Promise<unknown> | unknown;
}

export type RuntimeModelRequest = ModelRequest;
export type RuntimeModelResponse = ModelResponse;
export type RuntimeModelEvent = ModelEvent;
export type RuntimeModel = ModelModule;

export interface RuntimeModelRoute {
	task: string;
	model: string;
}

export interface RuntimeInput {
	task: string;
	message: string;
	provider: RuntimeModelProvider;
	sessionId?: string;
	system?: string;
	messages?: RuntimeMessage[];
	tools?: RuntimeTool[];
	skills?: RuntimeSkill[];
	model?: string;
	modelRoutes?: RuntimeModelRoute[];
	maxTokens?: number;
	maxRetries?: number;
	maxTurns?: number;
	maxIterations?: number;
	signal?: AbortSignal;
}

export interface RuntimeOutput {
	text: string;
	model: string;
	toolCalls: RuntimeToolCall[];
	numTurns: number;
	subtype: 'success' | 'error_max_turns';
	sessionId: string;
	stopReason?: string;
	usage?: {
		inputTokens: number;
		outputTokens: number;
	};
}

export interface RuntimePrompt {
	system: string;
	prompt: string;
	messages: RuntimeMessage[];
}

export interface RuntimePerception {
	prompt: RuntimePrompt;
	provider: RuntimeModelProvider;
	model: string;
	maxTokens: number;
	maxRetries: number;
	maxIterations: number;
	tools: RuntimeTool[];
	skills: RuntimeSkill[];
	signal?: AbortSignal;
}

export type RuntimeEvent =
	| RuntimeModelEvent
	| { type: 'run_started'; sessionId: string; model: string }
	| { type: 'assistant_message'; content: string; toolCalls: RuntimeToolCall[] }
	| { type: 'user_message'; messages: RuntimeMessage[] }
	| { type: 'tool_call_start'; toolName: string; input: Record<string, unknown> }
	| { type: 'tool_call_end'; toolName: string; output: unknown }
	| { type: 'skill_call_start'; skillName: string; input: string }
	| { type: 'skill_call_end'; skillName: string; output: unknown }
	| { type: 'run_finished'; result: RuntimeOutput }
	| { type: 'run_stopped'; reason: string };

export interface RuntimeRun {
	stream: AsyncIterable<RuntimeEvent>;
	stop(reason?: string): void;
}
