import type { SessionResult, SessionState } from '../session';

export function goalCommandResponse(state: SessionState, text: string): SessionResult {
	return {
		text,
		model: state.model,
		toolCalls: [],
		numTurns: 0,
		subtype: 'success',
		sessionId: state.id,
		stopReason: 'end_turn',
		usage: { inputTokens: 0, outputTokens: 0 },
	};
}
