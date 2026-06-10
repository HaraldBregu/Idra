import type { Model, ModelEvent, ModelRequest, ModelResponse } from './model';
import type { Tool } from './tool';

export interface Provider {
	id: string,
	apiKey: string,
	baseURL: string,
}

export type ModelMessageRole = 'system' | 'user' | 'assistant' | 'tool';

export interface ModelToolCall {
	id: string;
	name: string;
	args: Record<string, unknown>;
}

export interface ModelMessage {
	role: ModelMessageRole;
	content: string;
	toolUseId?: string;
	toolCalls?: ModelToolCall[];
}

export interface ModelProvider {
	id: string;
	apiKey: string;
	baseURL?: string;
}

export type SessionMessage = ModelMessage;
export type SessionToolCall = ModelToolCall;

export interface SessionUsage {
	inputTokens: number;
	outputTokens: number;
}

export interface SessionResult {
	text: string;
	model: string;
	toolCalls: SessionToolCall[];
	numTurns: number;
	subtype: 'success' | 'error_max_turns';
	sessionId: string;
	stopReason?: string;
	usage?: SessionUsage;
}

export interface SessionInput {
	task: string;
	message: string;
	sessionId?: string;
	messages?: SessionMessage[];
	model?: string;
	maxTurns?: number;
	maxIterations?: number;
}

export interface SessionTurn {
	content: string;
	model: string;
	stopReason?: string;
	toolCalls: SessionToolCall[];
	usage?: {
		inputTokens?: number;
		outputTokens?: number;
	};
}

export type RuntimeToolCall = ModelToolCall;

export type RuntimeModelEvent = ModelEvent;

export type RuntimeMessage = ModelMessage;

export type RuntimeOutput = SessionResult;

export interface RuntimeInput {
	task: string;
	message: string;
	sessionId?: string;
	messages?: RuntimeMessage[];
	tools?: Tool[];
	modelRoutes?: RuntimeModelRoute[];
	maxTokens?: number;
	maxRetries?: number;
	maxTurns?: number;
	maxIterations?: number;
}

export interface RuntimeModelRoute {
	task: string;
	model: string;
}

export interface RuntimePrompt {
	system: string;
	prompt: string;
	messages: RuntimeMessage[];
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
	| { type: 'run_started'; sessionId: string; model: string; providerId: string }
	| { type: 'assistant_message'; content: string; toolCalls: RuntimeToolCall[] }
	| { type: 'user_message'; messages: RuntimeMessage[] }
	| { type: 'tool_call_start'; toolName: string; input: Record<string, unknown> }
	| { type: 'tool_call_end'; toolName: string; output: unknown }
	| { type: 'run_finished'; result: RuntimeOutput };

export type RuntimeModelRequest = ModelRequest;

export type RuntimeModelResponse = ModelResponse;

export type RuntimeModel = Model;

export type RuntimeRole = ModelMessageRole;
