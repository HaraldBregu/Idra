import { emitAgentHarnessLifecycleHook } from './hook-runner';
import type { AgentHarnessHookContext } from './hook-context';
import type { ToolResultBlock } from '../../provider/types';

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
