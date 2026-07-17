import {
	accountGoalEvent,
	appendGoalContinuation,
	finishGoalTurn,
	goalBudgetOutcome,
	goalBudgetReason,
	loadGoal,
	updateGoal,
	type GoalBudgetReason,
} from '../goal';
import {
	appendRun,
	init,
	type SessionCategory,
	type SessionResult,
	type SessionState,
} from '../session';
import type { Config, RuntimeEvent, RuntimeInput } from '../types';
import { stream } from './run_stream';

export async function* streamGoal(
	config: Config,
	session: SessionState,
	input: RuntimeInput,
	signal: AbortSignal,
	category?: SessionCategory
): AsyncGenerator<RuntimeEvent> {
	let continuation = false;

	while (true) {
		let goal = loadGoal(session);
		if (!goal || goal.status !== 'active') {
			yield* stream(config, session, input, signal);
			return;
		}

		let budgetReason = goalBudgetReason(goal);
		if (budgetReason) {
			goal = updateGoal(session, { status: 'budget_limited', budgetReason }) ?? goal;
			const result = goalBudgetOutcome(session, goal, budgetReason);
			yield { type: 'model_call_delta', delta: result.text };
			yield { type: 'run_finished', result };
			return;
		}

		if (continuation) {
			appendGoalContinuation(session);
			init(
				session,
				config,
				{ ...input, task: 'goal', message: '', files: undefined, sessionId: session.id },
				category
			);
		}

		const startedAtMs = Date.now();
		const timeoutController = new AbortController();
		const remainingTimeout =
			goal.budget.timeoutMs === undefined
				? undefined
				: Math.max(1, goal.budget.timeoutMs - goal.usage.timeUsedMs);
		const timeout =
			remainingTimeout === undefined
				? undefined
				: setTimeout(
						() => timeoutController.abort(new Error('Goal time limit reached.')),
						remainingTimeout
					);
		timeout?.unref();
		const runSignal = timeout ? AbortSignal.any([signal, timeoutController.signal]) : signal;
		const events = stream(config, session, input, runSignal);
		let toolCallsThisTurn = 0;
		let lastResult: SessionResult | undefined;
		let stoppedByBudget: GoalBudgetReason | undefined;

		try {
			for await (const event of events) {
				if (event.type === 'assistant_message') {
					const current = loadGoal(session);
					if (
						current?.status === 'active' &&
						current.usage.toolCalls + event.toolCalls.length > current.budget.maxToolCalls
					) {
						stoppedByBudget = 'max_tool_calls';
						break;
					}
				}

				accountGoalEvent(session, event);
				if (event.type === 'tool_call_start') toolCallsThisTurn += 1;
				if (event.type === 'run_finished') {
					lastResult = event.result;
					continue;
				}
				if (event.type === 'model_call_end') {
					const current = loadGoal(session);
					const reason = current ? goalBudgetReason(current, Date.now() - startedAtMs) : undefined;
					if (reason === 'max_tokens' || reason === 'timeout') {
						stoppedByBudget = reason;
						break;
					}
				}
				yield event;
			}
		} catch (error) {
			if (signal.aborted) {
				updateGoal(session, { status: 'paused' });
				throw error;
			}
			if (timeoutController.signal.aborted) {
				stoppedByBudget = 'timeout';
			} else {
				throw error;
			}
		} finally {
			if (timeout) clearTimeout(timeout);
		}

		finishGoalTurn(session, Date.now() - startedAtMs);
		goal = loadGoal(session);
		if (!goal) {
			if (lastResult) yield { type: 'run_finished', result: lastResult };
			return;
		}

		if (stoppedByBudget) {
			goal =
				updateGoal(session, {
					status: 'budget_limited',
					budgetReason: stoppedByBudget,
				}) ?? goal;
			const result = goalBudgetOutcome(session, goal, stoppedByBudget);
			const delta = `\n\n${result.text}`;
			appendRun(session, { type: 'model_call_delta', delta });
			appendRun(session, { type: 'run_finished', result });
			yield { type: 'model_call_delta', delta };
			yield { type: 'run_finished', result };
			return;
		}

		if (goal.status !== 'active') {
			if (lastResult) yield { type: 'run_finished', result: lastResult };
			return;
		}

		budgetReason = goalBudgetReason(goal);
		if (budgetReason) {
			goal = updateGoal(session, { status: 'budget_limited', budgetReason }) ?? goal;
			const result = goalBudgetOutcome(session, goal, budgetReason);
			const delta = `\n\n${result.text}`;
			yield { type: 'model_call_delta', delta };
			yield { type: 'run_finished', result };
			return;
		}

		if (!lastResult || toolCallsThisTurn === 0) {
			if (lastResult) yield { type: 'run_finished', result: lastResult };
			return;
		}

		continuation = true;
	}
}
