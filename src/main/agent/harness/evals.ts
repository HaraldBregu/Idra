import type { AgentHarnessEvent, AgentHarnessRunResult, ExecutableAgentHarness } from './types';

export interface AgentHarnessEvalCase {
	id: string;
	task: string;
	sessionId?: string;
	context?: Record<string, unknown>;
	expectedText?: string | RegExp;
	score?(result: AgentHarnessRunResult, events: AgentHarnessEvent[]): number | Promise<number>;
}

export interface AgentHarnessEvalResult {
	id: string;
	score: number;
	passed: boolean;
	output: string;
	events: AgentHarnessEvent['type'][];
	error?: string;
}

export async function runAgentHarnessEvals(
	harness: ExecutableAgentHarness,
	cases: AgentHarnessEvalCase[]
): Promise<AgentHarnessEvalResult[]> {
	const results: AgentHarnessEvalResult[] = [];
	for (const fixture of cases) {
		const events: AgentHarnessEvent[] = [];
		const off = harness.on('run.started', () => undefined);
		const anyOff = attachAnyEvent(harness, events);
		try {
			const result = await harness.execute({
				task: fixture.task,
				sessionId: fixture.sessionId ?? `eval:${fixture.id}`,
				context: fixture.context,
			});
			const score = fixture.score
				? await fixture.score(result, events)
				: scoreExpectedText(result.finalText, fixture.expectedText);
			results.push({
				id: fixture.id,
				score,
				passed: score >= 1,
				output: result.finalText,
				events: events.map((event) => event.type),
			});
		} catch (error) {
			results.push({
				id: fixture.id,
				score: 0,
				passed: false,
				output: '',
				events: events.map((event) => event.type),
				error: error instanceof Error ? error.message : String(error),
			});
		} finally {
			off();
			anyOff();
		}
	}
	return results;
}

function scoreExpectedText(output: string, expected: string | RegExp | undefined): number {
	if (!expected) return output.trim() ? 1 : 0;
	if (typeof expected === 'string') return output.includes(expected) ? 1 : 0;
	return expected.test(output) ? 1 : 0;
}

function attachAnyEvent(harness: ExecutableAgentHarness, events: AgentHarnessEvent[]): () => void {
	const removers = new Set<() => void>();
	const eventTypes: AgentHarnessEvent['type'][] = [
		'run.started',
		'run.finished',
		'run.cancelled',
		'run.error',
		'model.request',
		'model.delta',
		'model.response',
		'model.retry',
		'model.fallback',
		'usage.updated',
		'context.assembled',
		'memory.read',
		'memory.write',
		'tool.discovered',
		'tool.started',
		'tool.finished',
		'tool.error',
		'approval.requested',
		'approval.resolved',
		'snapshot.created',
		'mcp.server.connecting',
		'mcp.server.connected',
		'mcp.server.disconnected',
		'mcp.server.error',
		'mcp.inventory',
		'connector.status',
		'skill.loaded',
		'subagent.started',
		'subagent.finished',
	];
	for (const type of eventTypes) {
		removers.add(harness.on(type, (event) => events.push(event)));
	}
	return () => {
		for (const remove of removers) remove();
	};
}
