import type { AgentRuntimeEvent, AgentRuntimeRunResult, ExecutableAgentRuntime } from './types';

export interface AgentRuntimeEvalCase {
	name: string;
	task: string;
	expectText?: string;
	score?(result: AgentRuntimeRunResult, events: AgentRuntimeEvent[]): number | Promise<number>;
}
export async function runAgentRuntimeEvals(runtime: ExecutableAgentRuntime, cases: AgentRuntimeEvalCase[]) {
	return Promise.all(cases.map(async (testCase) => {
		const events: AgentRuntimeEvent[] = [];
		const off = runtime.on('run.finished', (event) => events.push(event));
		const result = await runtime.execute({ task: testCase.task });
		off();
		return { name: testCase.name, score: testCase.score ? await testCase.score(result, events) : testCase.expectText && result.finalText.includes(testCase.expectText) ? 1 : 0, events: events.map((event) => event.type) };
	}));
}
