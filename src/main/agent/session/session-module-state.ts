import type { SessionState } from './session-types';

export function createSessionState(): SessionState {
	return {
		id: '',
		messages: [],
		toolCalls: [],
		usage: { inputTokens: 0, outputTokens: 0 },
		maxTurns: 20,
		model: 'default',
		numTurns: 0,
		finalText: '',
		sessionsPath: '',
		folderName: '',
	};
}
