import type { SessionState } from '../session';
import { persist } from '../session/session_persist';
import { loadGoal } from './load';

export function appendGoalContinuation(state: SessionState): void {
	const goal = loadGoal(state);
	if (!goal || goal.status !== 'active') return;
	state.messages.push({
		role: 'user',
		content: [
			{
				type: 'text',
				text: `Active goal: ${goal.objective}\n\nContinue working toward this goal. Reassess the latest evidence, take the next useful action, and complete the goal only after a full evidence audit.`,
				internal: true,
			},
		],
	});
	persist(state);
}
