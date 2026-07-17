import type { RuntimeEvent } from '../types';
import type { SessionState } from '../session';
import { loadGoal } from './load';
import { saveGoal } from './save';

export function accountGoalEvent(state: SessionState, event: RuntimeEvent): void {
	if (event.type !== 'model_call_end' && event.type !== 'tool_call_start') return;
	const goal = loadGoal(state);
	if (!goal) return;
	if (event.type === 'model_call_end') {
		goal.usage.inputTokens += event.usage?.inputTokens ?? 0;
		goal.usage.outputTokens += event.usage?.outputTokens ?? 0;
	} else {
		goal.usage.toolCalls += 1;
	}
	saveGoal(state, goal);
}
