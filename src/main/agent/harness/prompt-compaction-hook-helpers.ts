import { emitAgentHarnessLifecycleHook } from './hook-runner';
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
