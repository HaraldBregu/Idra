import { dispatchAgentHarnessHook } from './hook-runner';
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
	await dispatchAgentHarnessHook('llm_input', payload);
}

export async function fireLlmOutputHook(payload: LlmOutputHookPayload): Promise<void> {
	await dispatchAgentHarnessHook('llm_output', payload);
}

export async function fireAgentEndHook(payload: AgentEndHookPayload): Promise<void> {
	await dispatchAgentHarnessHook('agent_end', payload);
}
