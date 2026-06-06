import type {
	ModelEvent,
	ModelMessage,
	ModelMessageRole,
	ModelModule,
	ModelProvider,
	ModelRequest,
	ModelResponse,
} from '../model/types';

export type RuntimeRole = ModelMessageRole;
export type RuntimeMessage = ModelMessage;

export interface RuntimeTool {
	name: string;
	description?: string;
	run?: (input: Record<string, unknown>) => Promise<unknown> | unknown;
}

export interface RuntimeSkill {
	name: string;
	run: (input: string) => Promise<unknown> | unknown;
}

export type RuntimeModelRequest = ModelRequest;
export type RuntimeModelResponse = ModelResponse;
export type RuntimeModel = ModelModule;

export interface RuntimeModelRoute {
	task: string;
	model: string;
}

export interface RuntimeInput {
	task: string;
	message: string;
	provider: ModelProvider;
	system?: string;
	messages?: RuntimeMessage[];
	tools?: RuntimeTool[];
	skills?: RuntimeSkill[];
	model?: string;
	modelRoutes?: RuntimeModelRoute[];
	maxTokens?: number;
	maxRetries?: number;
	maxIterations?: number;
	signal?: AbortSignal;
}

export interface RuntimeToolCall {
	name: string;
	args: Record<string, unknown>;
}

export interface RuntimeOutput {
	text: string;
	model: string;
	toolCalls: RuntimeToolCall[];
	stopReason?: string;
}

export interface RuntimePrompt {
	system: string;
	prompt: string;
	messages: RuntimeMessage[];
}

export interface RuntimePerception {
	prompt: RuntimePrompt;
	provider: ModelProvider;
	model: string;
	maxTokens: number;
	maxRetries: number;
	tools: RuntimeTool[];
	skills: RuntimeSkill[];
	signal?: AbortSignal;
}

export type RuntimeEvent =
	| ModelEvent
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
