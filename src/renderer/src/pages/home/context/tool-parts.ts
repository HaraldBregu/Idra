import type { ToolPart } from '@/components/prompt-kit/tool';
import type {
	AgentHistoryContentBlock,
	AgentResponseEvent,
	AgentToolCallStatus,
} from '../../../../../shared/service';

export type AgentToolPart = ToolPart & {
	toolCallId: string;
	status?: AgentToolCallStatus;
};

type AgentToolPartPatch = Omit<Partial<AgentToolPart>, 'toolCallId'>;

function createAgentToolPart(
	toolCallId: string,
	patch: AgentToolPartPatch
): AgentToolPart {
	return {
		toolCallId,
		type: patch.type ?? 'tool',
		state: patch.state ?? 'input-streaming',
		iteration: patch.iteration,
		input: patch.input,
		inputText: patch.inputText,
		output: patch.output,
		outputText: patch.outputText,
		durationMs: patch.durationMs,
		errorText: patch.errorText,
		status: patch.status,
	};
}

export function updateAgentToolPart(
	tools: readonly AgentToolPart[],
	toolCallId: string,
	patch: AgentToolPartPatch
): AgentToolPart[] {
	const index = tools.findIndex((tool) => tool.toolCallId === toolCallId);
	if (index === -1) {
		return [...tools, createAgentToolPart(toolCallId, patch)];
	}

	return tools.map((tool, currentIndex) =>
		currentIndex === index ? { ...tool, ...patch, toolCallId } : tool
	);
}

export function applyAgentResponseEventToTools(
	tools: readonly AgentToolPart[],
	event: AgentResponseEvent
): AgentToolPart[] | undefined {
	switch (event.type) {
		case 'run_state':
		case 'reasoning_summary':
		case 'text_delta':
			return undefined;
		case 'tool_call_start':
			return updateAgentToolPart(tools, event.toolCallId, {
				type: event.toolName,
				state: 'input-streaming',
				iteration: event.iteration,
				inputText: '',
			});
		case 'tool_call_args_delta':
			return updateAgentToolPart(tools, event.toolCallId, {
				type: event.toolName,
				state: 'input-streaming',
				iteration: event.iteration,
				inputText: event.argsText,
			});
		case 'tool_call_input':
			return updateAgentToolPart(tools, event.toolCallId, {
				type: event.toolName,
				state: 'input-available',
				iteration: event.iteration,
				input: event.input,
				inputText: event.argsText,
			});
		case 'tool_call_result': {
			const isError = event.status !== 'ok';
			const errorText =
				event.errorText ?? (isError ? event.outputText || 'Tool call failed.' : undefined);

			return updateAgentToolPart(tools, event.toolCallId, {
				type: event.toolName,
				state: isError ? 'output-error' : 'output-available',
				iteration: event.iteration,
				input: event.input,
				output: event.output,
				outputText: event.outputText,
				durationMs: event.durationMs,
				errorText,
				status: event.status,
			});
		}
	}
}

export function agentToolPartFromHistoryBlock(
	block: AgentHistoryContentBlock
): AgentToolPart | undefined {
	if (block.type !== 'tool_use') return undefined;

	return {
		toolCallId: block.toolUseId,
		type: block.toolName,
		state: 'input-available',
		input: block.toolArgs ?? {},
	};
}
