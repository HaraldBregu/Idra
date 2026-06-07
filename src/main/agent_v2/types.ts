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
} from './model/types';

/**
 * Runtime role alias backed by the agent_v2 model module.
 */
export type RuntimeRole = ModelMessageRole;

/**
 * Runtime tool call alias backed by the agent_v2 model module.
 */
export type RuntimeToolCall = ModelToolCall;
/**
 * Runtime transcript message alias backed by the agent_v2 model module.
 */
export type RuntimeMessage = ModelMessage;
/**
 * Runtime provider configuration alias backed by the agent_v2 model module.
 */
export type RuntimeModelProvider = ModelProvider;

/**
 * Tool definition exposed to the model plus the local function used to execute it.
 */
export interface RuntimeTool extends ModelTool {
	run?: (input: Record<string, unknown>) => Promise<unknown> | unknown;
}

/**
 * Skill definition reserved for runtime-level skill execution.
 */
export interface RuntimeSkill {
	name: string;
	run: (input: string) => Promise<unknown> | unknown;
}

/**
 * Model request alias used by runtime ports.
 */
export type RuntimeModelRequest = ModelRequest;
/**
 * Model response alias used by runtime ports.
 */
export type RuntimeModelResponse = ModelResponse;
/**
 * Model streaming event alias used by runtime ports.
 */
export type RuntimeModelEvent = ModelEvent;
/**
 * Model module alias used as the runtime's injected model port.
 */
export type RuntimeModel = ModelModule;

/**
 * Optional route hint for selecting a model based on a task name.
 */
export interface RuntimeModelRoute {
	task: string;
	model: string;
}

/**
 * Complete input required to start an agent runtime loop.
 */
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

/**
 * Final result emitted when the runtime loop finishes.
 */
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

/**
 * Prompt representation retained for compatibility with prompt composition flows.
 */
export interface RuntimePrompt {
	system: string;
	prompt: string;
	messages: RuntimeMessage[];
}

/**
 * Prepared runtime view of input options, prompt, model settings, and tools.
 */
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

/**
 * Stream event union emitted by the runtime loop.
 */
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

/**
 * Cancellable handle returned by `AgentRuntime.run`.
 */
export interface RuntimeRun {
	stream: AsyncIterable<RuntimeEvent>;
	stop(reason?: string): void;
}
