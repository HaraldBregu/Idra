import { LlmModel } from '../../models/llm';
import { formatToolOutput } from '../run/run_common';
import type { Message, Tool, ToolCall } from '../types';
import { createJudge } from './goal_judge';
import { detectStuck } from './goal_stuck';
import { verifyGoal } from './goal_verify';
import type {
	Goal,
	GoalAction,
	GoalIterationLog,
	GoalRunOptions,
	GoalRunResult,
	GoalVerdict,
} from './goal_types';

export async function runGoal(options: GoalRunOptions): Promise<GoalRunResult> {
	const { goal, tools, provider, model, checkpoint } = options;
	const llm = options.llm ?? new LlmModel();
	const judge = options.judge ?? createJudge(llm, provider, model);
	const stuckAfter = options.stuckAfter ?? 3;
	const maxTokens = options.maxTokensPerCall ?? 4096;
	const startedAtMs = Date.now();
	const toolMap = new Map(tools.map((tool) => [tool.name, tool]));
	const systemPrompt = buildSystemPrompt(goal, tools);
	const messages: Message[] = [];
	const transcript: GoalIterationLog[] = [];
	let tokensUsed = 0;
	let toolCallsUsed = 0;
	let lastVerdict: GoalVerdict | undefined;

	const overBudget = (): boolean =>
		(goal.budget.timeoutMs !== undefined && Date.now() - startedAtMs >= goal.budget.timeoutMs) ||
		(goal.budget.maxTokens !== undefined && tokensUsed >= goal.budget.maxTokens);

	const budgetExceeded = (): GoalRunResult => ({
		status: 'budget_exceeded',
		partialProgress: lastVerdict,
		transcript,
	});

	const finishIteration = (log: GoalIterationLog): void => {
		transcript.push(log);
		options.onIteration?.(log);
	};

	const generate = async (withTools: boolean): Promise<{ content: string; toolCalls: ToolCall[] }> => {
		const response = await llm.generate({
			provider,
			model,
			systemPrompt,
			messages,
			...(withTools ? { tools } : {}),
			maxTokens,
			signal: options.signal,
		});
		tokensUsed += (response.usage?.inputTokens ?? 0) + (response.usage?.outputTokens ?? 0);
		return {
			content: response.content,
			toolCalls: (response.toolCalls ?? []).map((toolCall) => ({ ...toolCall })),
		};
	};

	try {
		for (let iteration = 1; iteration <= goal.budget.maxIterations; iteration += 1) {
			if (overBudget()) return budgetExceeded();

			const every = checkpoint?.everyIterations;
			if (every && iteration > 1 && (iteration - 1) % every === 0) {
				const decision = await checkpoint.confirm({
					reason: 'interval',
					iteration,
					lastVerification: lastVerdict,
				});
				if (decision === 'abort') {
					return {
						status: 'aborted',
						reason: `Stopped at the human checkpoint before iteration ${iteration}.`,
						transcript,
					};
				}
			}

			const log: GoalIterationLog = { iteration, plan: '', actions: [], observations: [] };

			// PLAN / REPLAN: no tools, so the model can only plan here.
			messages.push({ role: 'user', content: planPrompt(iteration, lastVerdict) });
			const planned = await generate(false);
			log.plan = planned.content.trim();
			messages.push({ role: 'assistant', content: planned.content });

			// ACT: model turns with tools until it stops calling them.
			messages.push({ role: 'user', content: actPrompt });
			let finalResponse = '';
			acting: while (true) {
				if (overBudget()) {
					finishIteration(log);
					return budgetExceeded();
				}
				const turn = await generate(true);
				messages.push({
					role: 'assistant',
					content: turn.content,
					...(turn.toolCalls.length > 0 ? { toolCalls: turn.toolCalls } : {}),
				});
				if (turn.toolCalls.length === 0) {
					finalResponse = turn.content;
					break acting;
				}

				for (const toolCall of turn.toolCalls) {
					const violated = goal.constraints.find((constraint) =>
						constraint.violatedBy?.(toolCall.name, toolCall.args),
					);
					if (violated) {
						finishIteration(log);
						return {
							status: 'aborted',
							reason: `Constraint violated by tool '${toolCall.name}': ${violated.description}`,
							transcript,
						};
					}

					if (checkpoint?.irreversibleTools?.includes(toolCall.name)) {
						const decision = await checkpoint.confirm({
							reason: 'irreversible_action',
							iteration,
							toolName: toolCall.name,
							input: toolCall.args,
							lastVerification: lastVerdict,
						});
						if (decision === 'abort') {
							finishIteration(log);
							return {
								status: 'aborted',
								reason: `Stopped at the human checkpoint before irreversible tool '${toolCall.name}'.`,
								transcript,
							};
						}
					}

					if (toolCallsUsed >= goal.budget.maxToolCalls || overBudget()) {
						finishIteration(log);
						return budgetExceeded();
					}
					toolCallsUsed += 1;

					// OBSERVE: only real tool outputs are recorded as observations.
					const action = await executeToolCall(toolMap.get(toolCall.name), toolCall);
					log.actions.push(action);
					log.observations.push(`${action.toolName}: ${action.output}`);
				}
			}

			// VERIFY: a dedicated verifier, separate from the actor conversation.
			const verdict = await verifyGoal(goal, buildEvidence(log, finalResponse), judge);
			log.verification = verdict;
			lastVerdict = verdict;
			finishIteration(log);

			if (verdict.passed) {
				return { status: 'achieved', evidence: verdict.criteria, transcript };
			}

			const stuckReason = detectStuck(transcript, stuckAfter);
			if (stuckReason) return { status: 'stuck', reason: stuckReason, transcript };
		}

		return budgetExceeded();
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return { status: 'aborted', reason: `Unrecoverable error: ${message}`, transcript };
	}
}

async function executeToolCall(tool: Tool | undefined, toolCall: ToolCall): Promise<GoalAction> {
	let output: unknown;
	let isError = false;

	if (!tool) {
		output = `Error: unknown tool '${toolCall.name}'`;
		isError = true;
	} else {
		try {
			output = await tool.run(toolCall.args);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			output = `Error: tool '${toolCall.name}' failed: ${message}`;
			isError = true;
		}
	}

	const content = formatToolOutput(output);
	toolCall.result = { content, isError };
	return {
		toolCallId: toolCall.id,
		toolName: toolCall.name,
		input: toolCall.args,
		output: content,
		isError,
	};
}

function buildSystemPrompt(goal: Goal, tools: Tool[]): string {
	const criteria = goal.successCriteria
		.map((criterion) => `- [${criterion.id}] ${criterion.description}`)
		.join('\n');
	const constraints = goal.constraints
		.map((constraint) => `- ${constraint.description}`)
		.join('\n');
	return [
		'You are an autonomous agent working toward a goal. You cannot declare the goal ' +
			'achieved yourself: an external verifier checks every success criterion after each ' +
			'iteration, and only real evidence counts.',
		`Goal: ${goal.description}`,
		`Success criteria:\n${criteria || '- none'}`,
		constraints ? `Constraints (never do these):\n${constraints}` : '',
		`Available tools: ${tools.map((tool) => tool.name).join(', ') || 'none'}`,
	]
		.filter(Boolean)
		.join('\n\n');
}

function planPrompt(iteration: number, lastVerdict?: GoalVerdict): string {
	if (iteration === 1 || !lastVerdict) {
		return 'Write a short numbered plan (5 steps at most) to achieve the goal. Reply with the plan only.';
	}
	const failures = lastVerdict.criteria
		.filter((criterion) => !criterion.passed)
		.map((criterion) => `- [${criterion.id}] ${criterion.description}\n  Evidence: ${criterion.evidence}`)
		.join('\n');
	return (
		`Verification failed on these criteria:\n${failures}\n\n` +
		'Revise your plan using these failure details. Reply with the updated short numbered plan only.'
	);
}

const actPrompt =
	'Execute the next step of your plan now, using tools as needed. When you have done ' +
	'everything you can this iteration, reply without tool calls and summarize what you did.';

function buildEvidence(log: GoalIterationLog, finalResponse: string): string {
	return [
		log.observations.length > 0
			? `Observed tool outputs:\n${log.observations.join('\n')}`
			: 'No tool outputs were observed this iteration.',
		finalResponse ? `Actor's final message (a claim, not proof):\n${finalResponse}` : '',
	]
		.filter(Boolean)
		.join('\n\n');
}
