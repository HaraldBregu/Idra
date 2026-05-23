import { dispatchAgentHarnessHook } from './hook-runner';
import type { AgentHarnessHookContext } from './hook-context';

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
	await dispatchAgentHarnessHook('before_prompt_build', payload);
}

export async function fireBeforeAgentStartHook(payload: BeforeAgentStartHookPayload): Promise<void> {
	await dispatchAgentHarnessHook('before_agent_start', payload);
}

export async function fireBeforeCompactionHook(payload: BeforeCompactionHookPayload): Promise<void> {
	await dispatchAgentHarnessHook('before_compaction', payload);
}

export async function fireAfterCompactionHook(payload: AfterCompactionHookPayload): Promise<void> {
	await dispatchAgentHarnessHook('after_compaction', payload);
}
