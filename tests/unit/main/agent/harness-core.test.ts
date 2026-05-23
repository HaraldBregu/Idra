import { collectConfiguredAgentHarnessRuntimes } from '../../../../src/main/agent/harness-runtimes';
import { maybeCompactAgentHarnessSession } from '../../../../src/main/agent/harness/selection';
import {
	clearRegisteredAgentHarnesses,
	registerAgentHarness,
	resetRegisteredAgentHarnesses,
} from '../../../../src/main/agent/harness/registry';
import { adaptAgentHarnessToV2, runAgentHarnessV2LifecycleAttempt } from '../../../../src/main/agent/harness/v2';
import type {
	AgentHarness,
	AgentHarnessAttemptParams,
	AgentHarnessAttemptResult,
} from '../../../../src/main/agent/harness/types';
import type { SessionFile } from '../../../../src/main/session/store';

function clearHarnessActivationState(): void {
	delete (globalThis as { [key: symbol]: unknown })[Symbol.for('friday.agentHarnessRuntimeActivationState')];
}

function session(): SessionFile {
	return {
		id: 's1',
		createdAt: '2026-01-01T00:00:00.000Z',
		updatedAt: '2026-01-01T00:00:00.000Z',
		model: 'gpt-test',
		provider: 'openai',
		transcript: [],
		plan: [],
		compactionMarkers: [],
	};
}

function result(): AgentHarnessAttemptResult {
	return {
		finalText: 'done',
		toolCalls: 0,
		usage: { inputTokens: 0, outputTokens: 0 },
		stopReason: 'end_turn',
		session: session(),
	};
}

function params(): AgentHarnessAttemptParams {
	return {
		runId: 'r1',
		provider: 'openai',
		model: 'gpt-test',
		userMessage: 'hello',
		systemPrompt: 'sys',
		session: session(),
		tools: [],
		ctx: {} as AgentHarnessAttemptParams['ctx'],
		providerAdapter: {} as AgentHarnessAttemptParams['providerAdapter'],
	};
}

describe('agent harness core', () => {
	beforeEach(() => {
		clearRegisteredAgentHarnesses();
		clearHarnessActivationState();
	});

	it('stamps harness results and applies optional classification', async () => {
		const harness: AgentHarness = {
			id: 'classified',
			label: 'Classified',
			supports: () => ({ supported: true }),
			runAttempt: jest.fn(async () => result()),
			classify: jest.fn(() => 'complete'),
		};

		const output = await runAgentHarnessV2LifecycleAttempt(
			adaptAgentHarnessToV2(harness),
			params()
		);

		expect(output.agentHarnessId).toBe('classified');
		expect(output.agentHarnessResultClassification).toBe('complete');
		expect(harness.classify).toHaveBeenCalledWith(
			expect.not.objectContaining({ agentHarnessResultClassification: expect.anything() }),
			expect.objectContaining({ runId: 'r1' })
		);
	});

	it('isolates reset failures across registered harnesses', async () => {
		const resetOk = jest.fn();
		registerAgentHarness({
			id: 'broken',
			label: 'Broken',
			supports: () => ({ supported: true }),
			runAttempt: jest.fn(async () => result()),
			reset: () => {
				throw new Error('reset failed');
			},
		});
		registerAgentHarness({
			id: 'ok',
			label: 'Ok',
			supports: () => ({ supported: true }),
			runAttempt: jest.fn(async () => result()),
			reset: resetOk,
		});

		await expect(resetRegisteredAgentHarnesses({ reason: 'reset' })).resolves.toBeUndefined();
		expect(resetOk).toHaveBeenCalledWith({ reason: 'reset' });
	});

	it('delegates compaction to a forced harness that implements compact', async () => {
		const compactResult = { ok: true, compacted: true };
		const compact = jest.fn(async () => compactResult);
		registerAgentHarness({
			id: 'compact-runtime',
			label: 'Compact runtime',
			supports: () => ({ supported: true }),
			runAttempt: jest.fn(async () => result()),
			compact,
		});

		await expect(
			maybeCompactAgentHarnessSession({
				requestedRuntime: 'compact-runtime',
				provider: 'openai',
				modelId: 'gpt-test',
				sessionKey: 's1',
			})
		).resolves.toBe(compactResult);
		expect(compact).toHaveBeenCalledWith(
			expect.objectContaining({ provider: 'openai', modelId: 'gpt-test', sessionKey: 's1' })
		);
	});

	it('collects configured harness runtimes from env and nested agent options', () => {
		expect(
			collectConfiguredAgentHarnessRuntimes(
				{
					llmAgent: { options: { agentRuntime: ' codex ' } },
					agents: [{ options: { agentHarnessId: 'remote' } }],
					models: [{ options: { agentRuntime: 'pi' } }],
				},
				{ FRIDAY_AGENT_RUNTIME: ' sidecar ' }
			)
		).toEqual(['codex', 'remote', 'sidecar']);
	});
});
