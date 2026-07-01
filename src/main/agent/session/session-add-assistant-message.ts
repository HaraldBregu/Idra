import type { MessageContentBlock, ToolCall } from '../types';
import { persist } from './session-persist';
import type { SessionState } from './session-types';

export function addAssistantMessage(
	state: SessionState,
	content: string,
	toolCalls: ToolCall[],
	providerItems: MessageContentBlock[] = []
): void {
	const contentBlocks: MessageContentBlock[] = [...providerItems];
	if (content || contentBlocks.length === 0) {
		contentBlocks.push({ type: 'text', text: content });
	}
	state.messages.push({
		role: 'assistant',
		content: contentBlocks,
		...(toolCalls.length > 0 ? { toolCalls } : {}),
	});
	persist(state);
}
