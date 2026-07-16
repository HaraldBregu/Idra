import { getGoalSettings, getModelId, getProvider } from '../settings/settings_store';
import { readTool } from '../tools/file_read';
import { writeTool } from '../tools/file_write';
import { editTool } from '../tools/file_edit';
import { applyPatchTool } from '../tools/file_apply_patch';
import { execTool } from '../tools/run_exec';
import { processTool } from '../tools/run_process';
import { getWebSearchTools } from '../tools/web_search';
import { webFetchTool } from '../tools/web_fetch';
import type { RuntimeEvent, SessionResult, Tool } from '../types';
import { streamGoal } from './run_goal';
import type { Goal, GoalRunResult } from './run_goal_types';

export interface ChatGoalOptions {
	providerId?: string;
	model?: string;
	signal?: AbortSignal;
}

// Runs a goal typed in chat as a stream of the same runtime events a normal
// run produces, so callers reuse the existing event mapping unchanged.
export async function* streamChatGoal(
	goalText: string,
	options: ChatGoalOptions = {},
): AsyncGenerator<RuntimeEvent> {
	const provider = getProvider(options.providerId);
	const model = options.model ?? getModelId();
	if (!provider || !model) throw new Error('Agent requires a configured provider and model.');

	yield { type: 'run_started', sessionId: '', model, providerId: provider.id };

	const tools: Tool[] = [
		readTool,
		writeTool,
		editTool,
		applyPatchTool,
		execTool,
		processTool,
		...getWebSearchTools(),
		webFetchTool,
	];

	const result = yield* streamGoal(goalFromText(goalText), {
		tools,
		provider,
		model,
		signal: options.signal,
	});

	const summary = summarizeGoalResult(result);
	yield { type: 'model_call_delta', delta: `\n\n${summary}` };
	yield { type: 'run_finished', result: toSessionResult(result, model, summary) };
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

export function summarizeGoalResult(result: GoalRunResult): string {
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

function toSessionResult(result: GoalRunResult, model: string, summary: string): SessionResult {
	return {
		text: summary,
		model,
		toolCalls: [],
		numTurns: result.transcript.length,
		subtype: result.status === 'budget_exceeded' ? 'error_max_turns' : 'success',
		sessionId: '',
		stopReason:
			result.status === 'achieved'
				? 'end_turn'
				: result.status === 'budget_exceeded'
					? 'max_iterations'
					: 'error',
	};
}
