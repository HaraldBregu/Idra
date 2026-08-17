import { randomUUID } from 'node:crypto';
import { createSessionState, init, type SessionResult } from '../session';
import { stream } from '../runner/stream';
import type { SubagentRequest, SubagentRuntime } from './types';

export async function runSubagent(
	runtime: SubagentRuntime,
	request: SubagentRequest,
	tools: SubagentRuntime['availableTools'],
	signal: AbortSignal
): Promise<SessionResult> {
	const session = createSessionState();
	const input = {
		type: 'background',
		runId: randomUUID(),
		task: request.task,
		message: request.task,
		agentId: 'subagent',
		contextMode: 'minimal',
		interactionMode: 'default',
		providerId: runtime.parentInput.providerId,
		model: runtime.parentInput.model,
		effort: runtime.parentInput.effort,
		maxTurns: request.maxTurns ?? 10,
		deferPersist: true,
	} as const;
	init(session, runtime.config, input, 'subagent');
	let result: SessionResult | undefined;
	for await (const event of stream(runtime.config, session, input, signal, {
		tools,
		streaming: false,
		resources: runtime.resources,
		providerLimiter: runtime.providerLimiter,
		ephemeral: true,
	})) {
		if (event.type === 'run_finished') result = event.result;
	}
	if (!result) throw new Error('Subagent did not produce a result.');
	return result;
}
