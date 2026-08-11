import {
	addAssistantMessage,
	createSessionState,
	init,
	insertUserMessage,
} from '../agent/session';
import type { Config } from '../agent/types';

export interface RealtimeVoiceConversation {
	beginUserTurn(itemId: string): void;
	finalizeUserTurn(itemId: string, transcript: string): void;
	addAssistantTranscript(transcript: string): void;
}

interface PendingUserTurn {
	index: number;
	begun: boolean;
	transcript?: string;
}

export type RealtimeVoiceConversationFactory = (
	chatSessionId: string,
	modelId: string
) => RealtimeVoiceConversation;

export function realtimeVoiceConversationFactory(config: Config): RealtimeVoiceConversationFactory {
	return (chatSessionId, modelId) => {
		const state = createSessionState();
		const pendingUserTurns = new Map<string, PendingUserTurn>();
		init(state, config, { task: 'chat', message: '', sessionId: chatSessionId, model: modelId }, 'main');
		return {
			beginUserTurn: (itemId) => {
				const turn = pendingUserTurns.get(itemId) ?? {
					index: state.messages.length,
					begun: false,
				};
				if (turn.begun) return;
				turn.begun = true;
				pendingUserTurns.set(itemId, turn);
				if (!turn.transcript) return;
				insertUserMessage(state, turn.index, turn.transcript);
				pendingUserTurns.delete(itemId);
				for (const pending of pendingUserTurns.values()) {
					if (pending.index >= turn.index) pending.index += 1;
				}
			},
			finalizeUserTurn: (itemId, transcript) => {
				const turn = pendingUserTurns.get(itemId) ?? {
					index: state.messages.length,
					begun: false,
				};
				turn.transcript = transcript;
				pendingUserTurns.set(itemId, turn);
				if (!turn.begun) return;
				insertUserMessage(state, turn.index, transcript);
				pendingUserTurns.delete(itemId);
				for (const pending of pendingUserTurns.values()) {
					if (pending.index >= turn.index) pending.index += 1;
				}
			},
			addAssistantTranscript: (transcript) => addAssistantMessage(state, transcript, []),
		};
	};
}
