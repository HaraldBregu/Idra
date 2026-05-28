import type { AgentHarnessEvent, AgentHarnessRunResult, ExecutableAgentHarness } from './types';

export interface AgentHarnessEvalCase {
	name: string;
	task: string;
	expectText?: string;
	score?(result: AgentHarnessRunResult, events: AgentHarnessEvent[]): number | Promise<number>;
}
export async function runAgentHarnessEvals(harness: ExecutableAgentHarness, cases: AgentHarnessEvalCase[]) {
	return Promise.all(cases.map(async (testCase) => {
		const events: AgentHarnessEvent[] = [];
		const off = harness.on('run.finished', (event) => events.push(event));
		const result = await harness.execute({ task: testCase.task });
		off();
		return { name: testCase.name, score: testCase.score ? await testCase.score(result, events) : testCase.expectText && result.finalText.includes(testCase.expectText) ? 1 : 0, events: events.map((event) => event.type) };
	}));
}
