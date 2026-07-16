import { randomUUID } from 'node:crypto';
import { getModelId, getProvider } from '../settings/settings_store';
import { readTool } from '../tools/file_read';
import { writeTool } from '../tools/file_write';
import { editTool } from '../tools/file_edit';
import { applyPatchTool } from '../tools/file_apply_patch';
import { execTool } from '../tools/run_exec';
import { processTool } from '../tools/run_process';
import { getWebSearchTools } from '../tools/web_search';
import { webFetchTool } from '../tools/web_fetch';
import { formatToolOutput } from '../run/run_common';
import type { AgentRunStopReason, AgentRunStreamEvent } from '../../../shared/agent_types';
import type { Tool } from '../types';
import { runGoal } from './goal_run';
import type { Goal, GoalIterationLog, GoalRunResult } from './goal_types';

export interface ChatGoalOptions {
	providerId?: string;
	model?: string;
	signal?: AbortSignal;
	emit?: (event: AgentRunStreamEvent) => void;
}

export async function runChatGoal(goalText: string, options: ChatGoalOptions = {}): Promise<string> {
	const provider = getProvider(options.providerId);
	const model = options.model ?? getModelId();
	if (!provider || !model) throw new Error('Agent requires a configured provider and model.');

	const emit = options.emit ?? ((): void => {});
	emit({ type: 'run_state', state: 'thinking' });

	const goal = goalFromText(goalText);
	const tools = [
		readTool,
		writeTool,
		editTool,
		applyPatchTool,
		execTool,
		processTool,
		...getWebSearchTools(),
		webFetchTool,
	].map((tool) => observedTool(tool, emit));

	const result = await runGoal({
		goal,
		tools,
		provider,
		model,
		signal: options.signal,
		onIteration: (log) => emit({ type: 'text_delta', delta: iterationDelta(log) }),
	});
	if (options.signal?.aborted) return '';

	const summary = summarize(result);
	emit({ type: 'text_delta', delta: summary });
	emit({ type: 'run_finished', stopReason: stopReasonFor(result), outputChars: summary.length });
	if (result.status === 'aborted') {
		emit({ type: 'run_state', state: 'error', label: result.reason });
	} else {
		emit({ type: 'run_state', state: 'completed' });
	}
	return summary;
}

// A goal typed in chat is free text, so the one checkable criterion is the
// text itself, judged by a separate LLM call against real tool outputs.
function goalFromText(text: string): Goal {
	return {
		description: text,
		successCriteria: [
			{
				id: 'goal',
				description: text,
				verification: { type: 'llm_judge', rubric: text },
			},
		],
		constraints: [],
		budget: { maxIterations: 5, maxToolCalls: 30, timeoutMs: 10 * 60 * 1000 },
	};
}

function observedTool(tool: Tool, emit: (event: AgentRunStreamEvent) => void): Tool {
	return {
		...tool,
		async run(input) {
			const startedAtMs = Date.now();
			const common = {
				iteration: 0,
				toolCallId: randomUUID(),
				toolName: tool.name,
				name: tool.name,
				serviceKind: 'tool' as const,
			};
			emit({ type: 'tool_call_start', ...common });
			emit({ type: 'tool_call_input', ...common, input, argsText: formatToolOutput(input) });
			try {
				const output = await tool.run(input);
				emit({
					type: 'tool_call_result',
					...common,
					input,
					output,
					outputText: formatToolOutput(output),
					status: 'ok',
					durationMs: Date.now() - startedAtMs,
				});
				return output;
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				emit({
					type: 'tool_call_result',
					...common,
					input,
					output: message,
					outputText: message,
					status: 'error',
					durationMs: Date.now() - startedAtMs,
					errorText: message,
				});
				throw error;
			}
		},
	};
}

function iterationDelta(log: GoalIterationLog): string {
	const verdict = log.verification;
	if (!verdict || verdict.passed) return '';
	const passed = verdict.criteria.filter((criterion) => criterion.passed).length;
	return (
		`Iteration ${log.iteration}: ${passed}/${verdict.criteria.length} criteria passed — replanning…\n\n`
	);
}

function summarize(result: GoalRunResult): string {
	const iterations = `${result.transcript.length} iteration${result.transcript.length === 1 ? '' : 's'}`;
	if (result.status === 'achieved') {
		const evidence = result.evidence
			.map((criterion) => `- **${criterion.description}** — ${criterion.evidence}`)
			.join('\n');
		return `**Goal achieved** after ${iterations}.\n\n${evidence}`;
	}
	if (result.status === 'budget_exceeded') {
		const progress = result.partialProgress
			? result.partialProgress.criteria
					.map((criterion) => `- ${criterion.passed ? '✅' : '❌'} ${criterion.description} — ${criterion.evidence}`)
					.join('\n')
			: 'No verification was completed.';
		return `**Goal not achieved: budget exhausted** after ${iterations}.\n\n${progress}`;
	}
	if (result.status === 'stuck') {
		return `**Goal run stopped: no progress.** ${result.reason}\n\nStopped after ${iterations} so you can take over.`;
	}
	return `**Goal run aborted.** ${result.reason}`;
}

function stopReasonFor(result: GoalRunResult): AgentRunStopReason {
	if (result.status === 'achieved') return 'end_turn';
	if (result.status === 'budget_exceeded') return 'max_iterations';
	return 'error';
}
