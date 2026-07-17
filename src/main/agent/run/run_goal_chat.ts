import {
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
	category?: SessionCategory,
): AsyncGenerator<RuntimeEvent> {
	const command = input.message.trim();
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

	if (command === 'pause') {
		const goal = updateGoal(session, { status: 'paused' });
		const text = goal ? 'Goal paused.' : 'No goal is set for this thread.';
		const result = goalCommandResponse(session, text);
		addAssistantMessage(session, text, []);
		appendRun(session, { type: 'run_finished', result });
		yield { type: 'model_call_delta', delta: text };
		yield { type: 'run_finished', result };
		return;
	}

	if (command === 'clear') {
		const text = clearGoal(session) ? 'Goal cleared.' : 'No goal is set for this thread.';
		const result = goalCommandResponse(session, text);
		addAssistantMessage(session, text, []);
		appendRun(session, { type: 'run_finished', result });
		yield { type: 'model_call_delta', delta: text };
		yield { type: 'run_finished', result };
		return;
	}

	if (command === 'resume') {
		const goal = updateGoal(session, {
			status: 'active',
			budget: getGoalSettings(),
			budgetReason: undefined,
		});
		if (!goal) {
			const text = 'No goal is set for this thread.';
			const result = goalCommandResponse(session, text);
			addAssistantMessage(session, text, []);
			appendRun(session, { type: 'run_finished', result });
			yield { type: 'model_call_delta', delta: text };
			yield { type: 'run_finished', result };
			return;
		}
		yield* streamGoal(config, session, input, signal, category);
		return;
	}

	setGoal(session, command, getGoalSettings());
	yield* streamGoal(config, session, input, signal, category);
}
