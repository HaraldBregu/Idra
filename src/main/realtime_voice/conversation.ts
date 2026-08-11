import {
	addAssistantMessage,
	addUserMessage,
	createSessionState,
	init,
} from '../agent/session';
import type { Config } from '../agent/types';

export interface RealtimeVoiceConversation {
	addUserTurn(): void;
	addAssistantTranscript(transcript: string): void;
}

export type RealtimeVoiceConversationFactory = (
	chatSessionId: string,
	modelId: string
) => RealtimeVoiceConversation;

export function realtimeVoiceConversationFactory(config: Config): RealtimeVoiceConversationFactory {
	return (chatSessionId, modelId) => {
		const state = createSessionState();
		init(state, config, { task: 'chat', message: '', sessionId: chatSessionId, model: modelId }, 'main');
		return {
			addUserTurn: () => addUserMessage(state, 'Voice message'),
			addAssistantTranscript: (transcript) => addAssistantMessage(state, transcript, []),
		};
	};
}
