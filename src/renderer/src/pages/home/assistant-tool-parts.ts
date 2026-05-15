import type { ToolPart } from '@/components/prompt-kit/tool';
import type { AssistantHistoryMessage, AssistantResponseEvent } from '../../../../shared/service';

export type AssistantToolPart = ToolPart & {
	toolCallId: string;
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
		input: patch.input,
		inputText: patch.inputText,
		output: patch.output,
		outputText: patch.outputText,
		errorText: patch.errorText,
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
		case 'text_delta':
			return undefined;
		case 'tool_call_start':
			return updateAssistantToolPart(tools, event.toolCallId, {
				type: event.toolName,
				state: 'input-streaming',
				inputText: '',
			});
		case 'tool_call_args_delta':
			return updateAssistantToolPart(tools, event.toolCallId, {
				type: event.toolName,
				state: 'input-streaming',
				inputText: event.argsText,
			});
		case 'tool_call_input':
			return updateAssistantToolPart(tools, event.toolCallId, {
				type: event.toolName,
				state: 'input-available',
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
				input: event.input,
				output: event.output,
				outputText: event.outputText,
				errorText,
			});
		}
	}
}

type AssistantContentBlock = NonNullable<AssistantHistoryMessage['contentBlocks']>[number];

export function assistantToolPartFromHistoryBlock(
	block: AssistantContentBlock
): AssistantToolPart | undefined {
	if (block.type !== 'tool_use' || !block.toolUseId || !block.toolName) return undefined;

	return {
		toolCallId: block.toolUseId,
		type: block.toolName,
		state: 'input-available',
		input: block.toolArgs ?? {},
	};
}
