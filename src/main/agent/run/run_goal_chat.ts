import {
	appendGoalContinuation,
	clearGoal,
	goalCommandResponse,
	loadGoal,
	setGoal,
	updateGoal,
} from '../goal';
import type { SessionCategory, SessionState } from '../session';
import { addAssistantMessage, appendRun } from '../session';
import { getGoalSettings } from '../settings/settings_store';
import type { Config, RuntimeEvent, RuntimeInput } from '../types';
import { streamGoal } from './run_goal';

export async function* streamChatGoal(
	config: Config,
	session: SessionState,
	input: RuntimeInput,
	signal: AbortSignal,
	category?: SessionCategory
): AsyncGenerator<RuntimeEvent> {
	const command = input.message.trim();
	const action = command.toLowerCase();
	if (!command) {
		const goal = loadGoal(session);
		const text = goal
			? `Goal: ${goal.objective}\nStatus: ${goal.status}\nUsage: ${goal.usage.iterations}/${goal.budget.maxIterations} turns, ${goal.usage.toolCalls}/${goal.budget.maxToolCalls} tool calls.`
			: 'No goal is set for this thread.';
		const result = goalCommandResponse(session, text);
		addAssistantMessage(session, text, []);
		appendRun(session, { type: 'run_finished', result });
		yield { type: 'model_call_delta', delta: text };
		yield { type: 'run_finished', result };
		return;
	}

	if (action === 'pause') {
		const current = loadGoal(session);
		const goal = current?.status === 'active' ? updateGoal(session, { status: 'paused' }) : current;
		const text = !goal
			? 'No goal is set for this thread.'
			: goal.status === 'paused'
				? 'Goal paused.'
				: `Goal is ${goal.status}.`;
		const result = goalCommandResponse(session, text);
		addAssistantMessage(session, text, []);
		appendRun(session, { type: 'run_finished', result });
		yield { type: 'model_call_delta', delta: text };
		yield { type: 'run_finished', result };
		return;
	}

	if (action === 'clear') {
		const text = clearGoal(session) ? 'Goal cleared.' : 'No goal is set for this thread.';
		const result = goalCommandResponse(session, text);
		addAssistantMessage(session, text, []);
		appendRun(session, { type: 'run_finished', result });
		yield { type: 'model_call_delta', delta: text };
		yield { type: 'run_finished', result };
		return;
	}

	if (action === 'resume') {
		const current = loadGoal(session);
		if (!current || current.status === 'complete') {
			const text = current
				? 'Completed goals cannot be resumed. Set a new goal to continue.'
				: 'No goal is set for this thread.';
			const result = goalCommandResponse(session, text);
			addAssistantMessage(session, text, []);
			appendRun(session, { type: 'run_finished', result });
			yield { type: 'model_call_delta', delta: text };
			yield { type: 'run_finished', result };
			return;
		}
		if (current.status !== 'active') {
			updateGoal(session, {
				status: 'active',
				budget: getGoalSettings(),
				budgetReason: undefined,
			});
		}
		appendGoalContinuation(session);
		yield* streamGoal(config, session, input, signal, category);
		return;
	}

	setGoal(session, command, getGoalSettings());
	yield* streamGoal(config, session, input, signal, category);
}
