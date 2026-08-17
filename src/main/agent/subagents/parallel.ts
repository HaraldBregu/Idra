import { runSubagent } from './run';
import type { SubagentRequest, SubagentResult, SubagentRuntime } from './types';

export async function runSubagents(
	runtime: SubagentRuntime,
	requests: SubagentRequest[],
	signal: AbortSignal
): Promise<SubagentResult[]> {
	return Promise.all(
		requests.map(async (request) => {
			const startedAt = Date.now();
			let lease;
			try {
				lease = await runtime.limiter.acquire(runtime.parentInput.runId, signal);
				const requested = new Set(request.tools ?? ['read']);
				const tools = runtime.availableTools.filter(
					(tool) => requested.has(tool.id) && tool.id !== 'subagents'
				);
				const result = await runSubagent(runtime, request, tools, signal);
				return {
					id: request.id,
					status: 'completed',
					text: result.text,
					...(result.stopReason ? { stopReason: result.stopReason } : {}),
					durationMs: Date.now() - startedAt,
				} satisfies SubagentResult;
			} catch {
				return {
					id: request.id,
					status: signal.aborted ? 'cancelled' : 'failed',
					...(signal.aborted ? {} : { error: 'Subagent failed.' }),
					durationMs: Date.now() - startedAt,
				} satisfies SubagentResult;
			} finally {
				lease?.release();
			}
		})
	);
}
