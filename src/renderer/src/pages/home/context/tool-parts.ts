import type { ToolPart } from '@/components/prompt-kit/tool';
import type {
	AssistantHistoryContentBlock,
	AssistantResponseEvent,
	AssistantToolCallStatus,
} from '../../../../shared/service';

export type AssistantToolPart = ToolPart & {
	toolCallId: string;
	status?: AssistantToolCallStatus;
};

type AssistantToolPartPatch = Omit<Partial<AssistantToolPart>, 'toolCallId'>;

function createAssistantToolPart(
	toolCallId: string,
	patch: AssistantToolPartPatch
): AssistantToolPart {
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

export function updateAssistantToolPart(
	tools: readonly AssistantToolPart[],
	toolCallId: string,
	patch: AssistantToolPartPatch
): AssistantToolPart[] {
	const index = tools.findIndex((tool) => tool.toolCallId === toolCallId);
	if (index === -1) {
		return [...tools, createAssistantToolPart(toolCallId, patch)];
	}

	return tools.map((tool, currentIndex) =>
		currentIndex === index ? { ...tool, ...patch, toolCallId } : tool
	);
}

export function applyAssistantResponseEventToTools(
	tools: readonly AssistantToolPart[],
	event: AssistantResponseEvent
): AssistantToolPart[] | undefined {
	switch (event.type) {
		case 'run_state':
		case 'reasoning_summary':
		case 'text_delta':
			return undefined;
		case 'tool_call_start':
			return updateAssistantToolPart(tools, event.toolCallId, {
				type: event.toolName,
				state: 'input-streaming',
				iteration: event.iteration,
				inputText: '',
			});
		case 'tool_call_args_delta':
			return updateAssistantToolPart(tools, event.toolCallId, {
				type: event.toolName,
				state: 'input-streaming',
				iteration: event.iteration,
				inputText: event.argsText,
			});
		case 'tool_call_input':
			return updateAssistantToolPart(tools, event.toolCallId, {
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

			return updateAssistantToolPart(tools, event.toolCallId, {
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

export function assistantToolPartFromHistoryBlock(
	block: AssistantHistoryContentBlock
): AssistantToolPart | undefined {
	if (block.type !== 'tool_use') return undefined;

	return {
		toolCallId: block.toolUseId,
		type: block.toolName,
		state: 'input-available',
		input: block.toolArgs ?? {},
	};
}
