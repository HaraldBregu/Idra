import { runGoal } from '../../../../../src/main/agent/goal/goal_run';
import type {
	CriterionCheck,
	Goal,
	GoalBudget,
	GoalModel,
} from '../../../../../src/main/agent/goal/goal_types';
import type { Provider, Tool, ToolCall } from '../../../../../src/main/agent/types';
import type { LlmRequest, LlmResponse } from '../../../../../src/main/models/llm';

class FakeLlm implements GoalModel {
	readonly prompts: string[] = [];
	private readonly responses: LlmResponse[];

	constructor(responses: LlmResponse[]) {
		this.responses = [...responses];
	}

	async generate(request: LlmRequest): Promise<LlmResponse> {
		const last = request.messages[request.messages.length - 1];
		this.prompts.push(typeof last?.content === 'string' ? last.content : '');
		const response = this.responses.shift();
		if (!response) throw new Error('FakeLlm ran out of scripted responses');
		return response;
	}
}

const provider: Provider = { id: 'anthropic', apiKey: 'test-key', baseURL: '' };

const plan = (text: string): LlmResponse => ({ content: text });
const act = (toolCalls: ToolCall[] = [], content = 'done'): LlmResponse => ({
	content,
	toolCalls,
});
const call = (id: string, name: string, args: Record<string, unknown> = {}): ToolCall => ({
	id,
	name,
	args,
});

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

describe('runGoal', () => {
	it('returns achieved when verification passes on the first iteration', async () => {
		const llm = new FakeLlm([plan('1. nothing to do'), act()]);
		const goal = makeGoal(() => ({ passed: true, evidence: 'all green' }));

		const result = await runGoal({ goal, tools: [], provider, model: 'test-model', llm });

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
			act([call('t1', 'fix')]),
			act([], 'fix applied'),
		]);
		const goal = makeGoal(() =>
			fixed ? { passed: true, evidence: 'fix applied' } : { passed: false, evidence: 'still red' },
		);

		const result = await runGoal({ goal, tools: [fixTool], provider, model: 'test-model', llm });

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

		const result = await runGoal({ goal, tools: [], provider, model: 'test-model', llm });

		expect(result.status).toBe('budget_exceeded');
		if (result.status !== 'budget_exceeded') return;
		expect(result.transcript).toHaveLength(2);
		expect(result.partialProgress?.passed).toBe(false);
		expect(result.partialProgress?.criteria[0].evidence).toBe('still red');
	});

	it('returns stuck when the same failing action repeats across iterations', async () => {
		const retryTool = makeTool('retry', () => 'no effect');
		const iteration = (): LlmResponse[] => [
			plan('1. retry'),
			act([call('t', 'retry', { target: 'same' })]),
			act(),
		];
		const llm = new FakeLlm([...iteration(), ...iteration(), ...iteration()]);
		const goal = makeGoal(() => ({ passed: false, evidence: 'still red' }), { maxIterations: 10 });

		const result = await runGoal({
			goal,
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
