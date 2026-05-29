import { agentLogger } from '../logger';
import { emitAgentHarnessLifecycleHook } from './hook-runner';
import type {
	AgentHarness,
	AgentHarnessAttemptParams,
	AgentHarnessAttemptResult,
} from './types';

export async function runAgentHarnessV2LifecycleAttempt(
	harness: AgentHarness,
	params: AgentHarnessAttemptParams
): Promise<AgentHarnessAttemptResult> {
	const startedAt = Date.now();

	agentLogger.debug('agents/harness/v2', 'harness run started', {
		harnessId: harness.id,
		provider: params.provider,
		model: params.model,
		runId: params.runId,
	});

	await emitAgentHarnessLifecycleHook('before_agent_start', {
		runId: params.runId,
		userMessage: params.userMessage,
		provider: params.provider,
		modelId: params.model,
	});

	try {
		const base = harness.runAttempt
			? await harness.runAttempt(params)
			: await runExecutableHarnessAttempt(harness, params);

		const classification = harness.classify?.(base, params);
		const result: AgentHarnessAttemptResult = {
			...base,
			agentHarnessId: harness.id,
			...(classification ? { agentHarnessResultClassification: classification } : {}),
		};

		agentLogger.debug('agents/harness/v2', 'harness run completed', {
			harnessId: harness.id,
			provider: params.provider,
			model: params.model,
			runId: params.runId,
			durationMs: Date.now() - startedAt,
			stopReason: result.stopReason,
			classification: result.agentHarnessResultClassification,
		});

		return result;
	} catch (error) {
		agentLogger.warn('agents/harness/v2', 'harness run error', {
			harnessId: harness.id,
			provider: params.provider,
			model: params.model,
			runId: params.runId,
			durationMs: Date.now() - startedAt,
			error: error instanceof Error ? error.message : String(error),
		});
		throw error;
	}
}

async function runExecutableHarnessAttempt(
	harness: AgentHarness,
	params: AgentHarnessAttemptParams
): Promise<AgentHarnessAttemptResult> {
	if (!harness.execute) throw new Error(`Agent harness "${harness.id}" does not implement runAttempt.`);
	const result = await harness.execute({
		runId: params.runId,
		sessionId: params.session.id,
		task: params.userMessage,
		signal: params.signal,
	});
	return {
		finalText: result.finalText,
		toolCalls: result.toolCalls,
		usage: result.usage,
		stopReason: result.stopReason,
		session: params.session,
	};
}
