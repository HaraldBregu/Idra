import type { SessionState } from '../session';
import { persist } from '../session/session_persist';

export function appendGoalContinuation(state: SessionState): void {
	state.messages.push({
		role: 'user',
		content: [
			{
				type: 'text',
				text: 'Continue working toward the active thread goal. Reassess the latest evidence, take the next useful action, and complete the goal only after a full evidence audit.',
				internal: true,
			},
		],
	});
	persist(state);
}
