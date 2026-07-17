import { addAssistantMessage, appendRun, type SessionResult, type SessionState } from '../session';

export function recordGoalOutcome(state: SessionState, result: SessionResult, delta: string): void {
	addAssistantMessage(state, result.text, []);
	appendRun(state, { type: 'model_call_delta', delta });
	appendRun(state, { type: 'run_finished', result });
}
