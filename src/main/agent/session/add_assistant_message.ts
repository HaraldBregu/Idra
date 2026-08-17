import type { MessageContentBlock, ToolCall } from '../types';
import { persist } from './persist';
import type { SessionState, SessionUsage } from './types';
import { hasAssistantPayload } from './has_assistant_payload';

export function addAssistantMessage(
	state: SessionState,
	content: string,
	toolCalls: ToolCall[],
	providerItems: MessageContentBlock[] = [],
	usage?: SessionUsage,
	persistState = true
): void {
	if (!hasAssistantPayload(content, toolCalls)) return;
	const contentBlocks: MessageContentBlock[] = [...providerItems];
	if (content || contentBlocks.length === 0) {
		contentBlocks.push({ type: 'text', text: content });
	}
	state.messages.push({
		role: 'assistant',
		content: contentBlocks,
		...(toolCalls.length > 0 ? { toolCalls } : {}),
		...(usage ? { usage } : {}),
	});
	if (persistState) persist(state);
}
