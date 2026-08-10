import type { RuntimeEvent, Tool, ToolCall } from '../types';
import type { ToolsContext } from '../context';
import type { AgentPermissionMode } from '../../../shared/agent_types';
import { runToolCall, type ToolCallSecurityContext } from './run_tool_call';
import type { PermissionsSchema } from '../permissions';
import type { KeyedMutex } from '../mutex';

export async function* runToolCalls(
	tools: Tool[],
	toolCalls: ToolCall[],
	interactive = true,
	signal?: AbortSignal,
	context?: ToolsContext,
	permissionMode: AgentPermissionMode = 'ask',
	security?: ToolCallSecurityContext,
	permissions?: PermissionsSchema,
	resources?: KeyedMutex
): AsyncGenerator<RuntimeEvent, void> {
	for (const toolCall of toolCalls) {
		yield* runToolCall(
			tools.find((tool) => tool.name === toolCall.name),
			toolCall,
			interactive,
			signal,
			context,
			permissionMode,
			security,
			permissions,
			resources
		);
	}
}
