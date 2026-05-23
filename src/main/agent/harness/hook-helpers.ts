import { dispatchAgentHarnessHook } from './hook-runner';
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
	await dispatchAgentHarnessHook('after_tool_call', payload);
}

export async function fireBeforeMessageWriteHook(payload: BeforeMessageWriteHookPayload): Promise<void> {
	await dispatchAgentHarnessHook('before_message_write', payload);
}
