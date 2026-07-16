import { streamGoal } from '../../../../../src/main/agent/run/run_goal';
import type { ModelTurnStream } from '../../../../../src/main/agent/run/run_model_turn';
import type {
	CriterionCheck,
	Goal,
	GoalBudget,
	GoalRunResult,
	GoalStreamOptions,
} from '../../../../../src/main/agent/run/run_goal_types';
import type { LlmEvent, LlmRequest } from '../../../../../src/main/models/llm';
import type { Provider, RuntimeEvent, Tool } from '../../../../../src/main/agent/types';

interface ScriptedTurn {
	content?: string;
	toolCalls?: Array<{ id: string; name: string; args: Record<string, unknown> }>;
}

class FakeLlm implements ModelTurnStream {
	readonly prompts: string[] = [];
	private readonly turns: ScriptedTurn[];

	constructor(turns: ScriptedTurn[]) {
		this.turns = [...turns];
	}

	async *stream(request: LlmRequest): AsyncIterable<LlmEvent> {
		const last = request.messages[request.messages.length - 1];
		this.prompts.push(typeof last?.content === 'string' ? last.content : '');
		const turn = this.turns.shift();
		if (!turn) throw new Error('FakeLlm ran out of scripted turns');
		if (turn.content) yield { type: 'model_call_delta', delta: turn.content };
		for (const toolCall of turn.toolCalls ?? []) {
			yield { type: 'model_tool_call_start', id: toolCall.id, name: toolCall.name };
			yield {
				type: 'model_tool_call_args_delta',
				id: toolCall.id,
				jsonDelta: JSON.stringify(toolCall.args),
			};
			yield { type: 'model_tool_call_end', id: toolCall.id };
		}
		yield {
			type: 'model_call_end',
			model: request.model,
			stopReason: turn.toolCalls?.length ? 'tool_calls' : 'end_turn',
		};
	}
}

const provider: Provider = { id: 'anthropic', apiKey: 'test-key', baseURL: '' };

const plan = (text: string): ScriptedTurn => ({ content: text });
const act = (
	toolCalls: ScriptedTurn['toolCalls'] = [],
	content = 'done',
): ScriptedTurn => ({ content, toolCalls });

function makeGoal(check: () => CriterionCheck, budget: Partial<GoalBudget> = {}): Goal {
	return {
		description: 'test goal',
		successCriteria: [
			{ id: 'c1', description: 'criterion one', verification: { type: 'programmatic', check } },
		],
		constraints: [],
		budget: { maxIterations: 3, maxToolCalls: 10, ...budget },
	};
}

function makeTool(name: string, run: Tool['run']): Tool {
	return { name, description: `fake ${name}`, schema: { type: 'object' }, run };
}

async function runToResult(
	goal: Goal,
	options: GoalStreamOptions,
): Promise<GoalRunResult> {
	const events = streamGoal(goal, options);
	let step: IteratorResult<RuntimeEvent, GoalRunResult> = await events.next();
	while (!step.done) step = await events.next();
	return step.value;
}

describe('streamGoal', () => {
	it('returns achieved when verification passes on the first iteration', async () => {
		const llm = new FakeLlm([plan('1. nothing to do'), act()]);
		const goal = makeGoal(() => ({ passed: true, evidence: 'all green' }));

		const result = await runToResult(goal, { tools: [], provider, model: 'test-model', llm });

		expect(result.status).toBe('achieved');
		if (result.status !== 'achieved') return;
		expect(result.evidence).toEqual([
			{ id: 'c1', description: 'criterion one', passed: true, evidence: 'all green' },
		]);
		expect(result.transcript).toHaveLength(1);
		expect(result.transcript[0].plan).toBe('1. nothing to do');
		expect(result.transcript[0].verification?.passed).toBe(true);
	});

	it('replans with failure details and achieves the goal after a second iteration', async () => {
		let fixed = false;
		const fixTool = makeTool('fix', () => {
			fixed = true;
			return 'applied fix';
		});
		const llm = new FakeLlm([
			plan('1. inspect'),
			act([], 'nothing done yet'),
			plan('1. run the fix tool'),
			act([{ id: 't1', name: 'fix', args: {} }]),
			act([], 'fix applied'),
		]);
		const goal = makeGoal(() =>
			fixed ? { passed: true, evidence: 'fix applied' } : { passed: false, evidence: 'still red' },
		);

		const result = await runToResult(goal, {
			tools: [fixTool],
			provider,
			model: 'test-model',
			llm,
		});

		expect(result.status).toBe('achieved');
		if (result.status !== 'achieved') return;
		expect(result.transcript).toHaveLength(2);
		expect(result.transcript[0].verification?.passed).toBe(false);
		expect(result.transcript[1].actions).toEqual([
			{ toolCallId: 't1', toolName: 'fix', input: {}, output: 'applied fix', isError: false },
		]);
		expect(llm.prompts[2]).toContain('Verification failed');
		expect(llm.prompts[2]).toContain('still red');
	});

	it('returns budget_exceeded with partial progress when iterations run out', async () => {
		const llm = new FakeLlm([plan('1. try'), act(), plan('1. try again'), act()]);
		const goal = makeGoal(() => ({ passed: false, evidence: 'still red' }), { maxIterations: 2 });

		const result = await runToResult(goal, { tools: [], provider, model: 'test-model', llm });

		expect(result.status).toBe('budget_exceeded');
		if (result.status !== 'budget_exceeded') return;
		expect(result.transcript).toHaveLength(2);
		expect(result.partialProgress?.passed).toBe(false);
		expect(result.partialProgress?.criteria[0].evidence).toBe('still red');
	});

	it('returns stuck when the same failing action repeats across iterations', async () => {
		const retryTool = makeTool('retry', () => 'no effect');
		const iteration = (): ScriptedTurn[] => [
			plan('1. retry'),
			act([{ id: 't', name: 'retry', args: { target: 'same' } }]),
			act(),
		];
		const llm = new FakeLlm([...iteration(), ...iteration(), ...iteration()]);
		const goal = makeGoal(() => ({ passed: false, evidence: 'still red' }), { maxIterations: 10 });

		const result = await runToResult(goal, {
			tools: [retryTool],
			provider,
			model: 'test-model',
			llm,
			stuckAfter: 2,
		});

		expect(result.status).toBe('stuck');
		if (result.status !== 'stuck') return;
		expect(result.reason).toContain('No progress in the last 2 iterations');
		expect(result.transcript).toHaveLength(2);
	});
});
