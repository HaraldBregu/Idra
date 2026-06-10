import type {
	ModelEvent,
	ModelMessage,
	ModelMessageRole,
	ModelModule,
	ModelRequest,
	ModelResponse,
	ModelTool,
	ModelToolCall,
	SessionResult,
} from '../types';

export type RuntimeToolCall = ModelToolCall;

export type RuntimeModelEvent = ModelEvent;

export type RuntimeMessage = ModelMessage;

export type RuntimeOutput = SessionResult;

export interface RuntimeInput {
    task: string;
    message: string;
    sessionId?: string;
    messages?: RuntimeMessage[];
    tools?: RuntimeTool[];
    skills?: RuntimeSkill[];
    modelRoutes?: RuntimeModelRoute[];
    maxTokens?: number;
    maxRetries?: number;
    maxTurns?: number;
    maxIterations?: number;
}
/**
 * Optional route hint for selecting a model based on a task name.
 */
export interface RuntimeModelRoute {
	task: string;
	model: string;
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
	| { type: 'run_started'; sessionId: string; model: string; providerId: string }
	| { type: 'assistant_message'; content: string; toolCalls: RuntimeToolCall[] }
	| { type: 'user_message'; messages: RuntimeMessage[] }
	| { type: 'tool_call_start'; toolName: string; input: Record<string, unknown> }
	| { type: 'tool_call_end'; toolName: string; output: unknown }
	| { type: 'skill_call_start'; skillName: string; input: string }
	| { type: 'skill_call_end'; skillName: string; output: unknown }
	| { type: 'run_finished'; result: RuntimeOutput };
/**
 * Model request alias used by runtime ports.
 */
export type RuntimeModelRequest = ModelRequest;
/**
 * Model response alias used by runtime ports.
 */
export type RuntimeModelResponse = ModelResponse;
/**
 * Model module alias used as the runtime's injected model port.
 */
export type RuntimeModel = ModelModule;


/**
 * Runtime role alias backed by the agent_v2 model module.
 */
export type RuntimeRole = ModelMessageRole;

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
