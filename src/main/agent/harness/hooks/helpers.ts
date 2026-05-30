import type { ToolResultBlock } from '../../../provider/types';
import { emitAgentHarnessLifecycleHook } from './runner';
import type { AgentHarnessHookContext } from './runner';

// --- after_tool_call / before_message_write ---

export type AfterToolCallHookPayload = AgentHarnessHookContext & {
	toolName: string;
	toolUseId: string;
	result: ToolResultBlock[];
	isError?: boolean;
};

export type BeforeMessageWriteHookPayload = AgentHarnessHookContext & {
	content: string;
	sessionKey?: string;
};

export async function fireAfterToolCallHook(payload: AfterToolCallHookPayload): Promise<void> {
	await emitAgentHarnessLifecycleHook('after_tool_call', payload as Record<string, unknown>);
}

export async function fireBeforeMessageWriteHook(payload: BeforeMessageWriteHookPayload): Promise<void> {
	await emitAgentHarnessLifecycleHook('before_message_write', payload as Record<string, unknown>);
}

// --- lifecycle: agent start / prompt build / compaction ---

export type BeforePromptBuildHookPayload = AgentHarnessHookContext & {
	systemPrompt?: string;
};

export type BeforeAgentStartHookPayload = AgentHarnessHookContext & {
	userMessage: string;
};

export type BeforeCompactionHookPayload = AgentHarnessHookContext & {
	transcriptLength: number;
};

export type AfterCompactionHookPayload = AgentHarnessHookContext & {
	transcriptLength: number;
	summaryHash?: string;
};

export async function fireBeforePromptBuildHook(payload: BeforePromptBuildHookPayload): Promise<void> {
	await emitAgentHarnessLifecycleHook('before_prompt_build', payload as Record<string, unknown>);
}

export async function fireBeforeAgentStartHook(payload: BeforeAgentStartHookPayload): Promise<void> {
	await emitAgentHarnessLifecycleHook('before_agent_start', payload as Record<string, unknown>);
}

export async function fireBeforeCompactionHook(payload: BeforeCompactionHookPayload): Promise<void> {
	await emitAgentHarnessLifecycleHook('before_compaction', payload as Record<string, unknown>);
}

export async function fireAfterCompactionHook(payload: AfterCompactionHookPayload): Promise<void> {
	await emitAgentHarnessLifecycleHook('after_compaction', payload as Record<string, unknown>);
}

// --- llm_input / llm_output / agent_end ---

export type LlmInputHookPayload = AgentHarnessHookContext & {
	messages: unknown[];
	systemPrompt?: string;
};

export type LlmOutputHookPayload = AgentHarnessHookContext & {
	stopReason?: string;
	outputTokens?: number;
};

export type AgentEndHookPayload = AgentHarnessHookContext & {
	stopReason?: string;
	turnCount?: number;
};

export async function fireLlmInputHook(payload: LlmInputHookPayload): Promise<void> {
	await emitAgentHarnessLifecycleHook('llm_input', payload as Record<string, unknown>);
}

export async function fireLlmOutputHook(payload: LlmOutputHookPayload): Promise<void> {
	await emitAgentHarnessLifecycleHook('llm_output', payload as Record<string, unknown>);
}

export async function fireAgentEndHook(payload: AgentEndHookPayload): Promise<void> {
	await emitAgentHarnessLifecycleHook('agent_end', payload as Record<string, unknown>);
}
