export interface RuntimeToolSchema {
	type?: string;
	properties?: Record<string, unknown>;
	required?: string[];
	items?: unknown;
	description?: string;
	enum?: unknown[];
	additionalProperties?: boolean | unknown;
	[k: string]: unknown;
}

export type RuntimeRole = 'system' | 'user' | 'assistant' | 'tool';

export interface RuntimeToolCall {
	id?: string;
	name: string;
	args: Record<string, unknown>;
}

export interface RuntimeMessage {
	role: RuntimeRole;
	content: string;
	toolUseId?: string;
	toolCalls?: RuntimeToolCall[];
}

export interface RuntimeModelProvider {
	id: string;
	apiKey: string;
	baseURL?: string;
}

export interface RuntimeTool {
	name: string;
	description?: string;
	schema?: RuntimeToolSchema;
	run?: (input: Record<string, unknown>) => Promise<unknown> | unknown;
}

export interface RuntimeSkill {
	name: string;
	run: (input: string) => Promise<unknown> | unknown;
}

export interface RuntimeModelRequest {
	messages: RuntimeMessage[];
	system?: string;
	provider: RuntimeModelProvider;
	model: string;
	maxTokens: number;
	tools?: RuntimeTool[];
	signal?: AbortSignal;
}

export interface RuntimeModelResponse {
	content: string;
	toolCalls?: RuntimeToolCall[];
	model?: string;
	stopReason?: string;
	usage?: {
		inputTokens?: number;
		outputTokens?: number;
	};
}

export type RuntimeModelEvent =
	| { type: 'model_call_start'; model: string }
	| { type: 'model_call_delta'; delta: string }
	| { type: 'model_tool_call_start'; id: string; name: string }
	| { type: 'model_tool_call_args_delta'; id: string; jsonDelta: string }
	| { type: 'model_tool_call_end'; id: string }
	| {
			type: 'model_call_end';
			model: string;
			stopReason?: string;
			usage?: RuntimeModelResponse['usage'];
	  };

export interface RuntimeModel {
	generate(request: RuntimeModelRequest): Promise<RuntimeModelResponse>;
	stream(request: RuntimeModelRequest): AsyncIterable<RuntimeModelEvent>;
}

export interface RuntimeModelRoute {
	task: string;
	model: string;
}

export interface RuntimeInput {
	task: string;
	message: string;
	provider: RuntimeModelProvider;
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
