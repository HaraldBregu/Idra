import { emitAgentHarnessLifecycleHook } from './hook-runner';
import type { AgentHarnessHookContext } from './hook-context';

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
