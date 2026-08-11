import {
	addAssistantMessage,
	addUserMessage,
	createSessionState,
	init,
	updateUserMessage,
} from '../agent/session';
import type { Config } from '../agent/types';

export interface RealtimeVoiceConversation {
	addUserTurn(itemId: string): void;
	updateUserTurn(itemId: string, transcript: string): void;
	addAssistantTranscript(transcript: string): void;
}

export type RealtimeVoiceConversationFactory = (
	chatSessionId: string,
	modelId: string
) => RealtimeVoiceConversation;

export function realtimeVoiceConversationFactory(config: Config): RealtimeVoiceConversationFactory {
	return (chatSessionId, modelId) => {
		const state = createSessionState();
		const userTurnIndexes = new Map<string, number>();
		init(state, config, { task: 'chat', message: '', sessionId: chatSessionId, model: modelId }, 'main');
		return {
			addUserTurn: (itemId) => {
				if (userTurnIndexes.has(itemId)) return;
				userTurnIndexes.set(itemId, state.messages.length);
				addUserMessage(state, 'Voice message');
			},
			updateUserTurn: (itemId, transcript) => {
				const index = userTurnIndexes.get(itemId);
				if (index !== undefined) updateUserMessage(state, index, transcript);
			},
			addAssistantTranscript: (transcript) => addAssistantMessage(state, transcript, []),
		};
	};
}
