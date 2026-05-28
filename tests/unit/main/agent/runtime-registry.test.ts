import {
	clearRegisteredAgentRuntimes,
	clearAgentRuntimeHookProviders,
	collectConfiguredAgentRuntimes,
	maybeCompactAgentRuntimeSession,
	registerAgentRuntime,
	registerAgentRuntimeHookHandler,
	resetRegisteredAgentRuntimes,
	selectAgentRuntime,
	adaptAgentRuntimeToV2,
	runAgentRuntimeV2LifecycleAttempt,
	type AgentRuntime,
	type AgentRuntimeAttemptParams,
	type AgentRuntimeAttemptResult,
} from '../../../../src/main/agent';
import type { SessionFile } from '../../../../src/main/agent/context/session/store';

function clearRuntimeActivationState(): void {
	delete (globalThis as { [key: symbol]: unknown })[
		Symbol.for('friday.agentRuntimeActivationState')
	];
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

function result(): AgentRuntimeAttemptResult {
	return {
		finalText: 'done',
		toolCalls: 0,
		usage: { inputTokens: 0, outputTokens: 0 },
		stopReason: 'end_turn',
		session: session(),
	};
}

function params(): AgentRuntimeAttemptParams {
	return {
		runId: 'r1',
		provider: 'openai',
		model: 'gpt-test',
		userMessage: 'hello',
		systemPrompt: 'sys',
		session: session(),
		tools: [],
		ctx: {} as AgentRuntimeAttemptParams['ctx'],
		providerAdapter: {} as AgentRuntimeAttemptParams['providerAdapter'],
	};
}

describe('agent runtime core', () => {
	beforeEach(() => {
		clearRegisteredAgentRuntimes();
		clearAgentRuntimeHookProviders();
		clearRuntimeActivationState();
	});

	it('stamps runtime results and applies optional classification', async () => {
		const runtime: AgentRuntime = {
			id: 'classified',
			label: 'Classified',
			supports: () => ({ supported: true }),
			runAttempt: jest.fn(async () => result()),
			classify: jest.fn(() => 'complete'),
		};

		const output = await runAgentRuntimeV2LifecycleAttempt(
			adaptAgentRuntimeToV2(runtime),
			params()
		);

		expect(output.agentRuntimeId).toBe('classified');
		expect(output.agentRuntimeResultClassification).toBe('complete');
		expect(runtime.classify).toHaveBeenCalledWith(
			expect.not.objectContaining({ agentRuntimeResultClassification: expect.anything() }),
			expect.objectContaining({ runId: 'r1' })
		);
	});

	it('fires the before-agent-start hook for every lifecycle attempt', async () => {
		const handler = jest.fn();
		registerAgentRuntimeHookHandler('before_agent_start', handler);
		const runtime: AgentRuntime = {
			id: 'hooked',
			label: 'Hooked',
			supports: () => ({ supported: true }),
			runAttempt: jest.fn(async () => result()),
		};

		await runAgentRuntimeV2LifecycleAttempt(adaptAgentRuntimeToV2(runtime), params());

		expect(handler).toHaveBeenCalledWith(
			expect.objectContaining({
				runId: 'r1',
				userMessage: 'hello',
				provider: 'openai',
				modelId: 'gpt-test',
			})
		);
	});

	it('selects auto runtimes by priority and id while keeping missing forced runtimes strict', () => {
		registerAgentRuntime({
			id: 'zeta',
			label: 'Zeta',
			supports: () => ({ supported: true, priority: 50 }),
			runAttempt: jest.fn(async () => result()),
		});
		registerAgentRuntime({
			id: 'alpha',
			label: 'Alpha',
			supports: () => ({ supported: true, priority: 50 }),
			runAttempt: jest.fn(async () => result()),
		});
		registerAgentRuntime({
			id: 'low',
			label: 'Low',
			supports: () => ({ supported: true, priority: 1 }),
			runAttempt: jest.fn(async () => result()),
		});

		expect(selectAgentRuntime({ provider: 'openai', modelId: 'gpt-test' }).id).toBe('alpha');
		expect(() =>
			selectAgentRuntime({
				provider: 'openai',
				modelId: 'gpt-test',
				requestedRuntime: 'missing',
			})
		).toThrow('Requested agent runtime "missing" is not registered.');
	});

	it('isolates reset failures across registered runtimes', async () => {
		const resetOk = jest.fn();
		registerAgentRuntime({
			id: 'broken',
			label: 'Broken',
			supports: () => ({ supported: true }),
			runAttempt: jest.fn(async () => result()),
			reset: () => {
				throw new Error('reset failed');
			},
		});
		registerAgentRuntime({
			id: 'ok',
			label: 'Ok',
			supports: () => ({ supported: true }),
			runAttempt: jest.fn(async () => result()),
			reset: resetOk,
		});

		await expect(resetRegisteredAgentRuntimes({ reason: 'reset' })).resolves.toBeUndefined();
		expect(resetOk).toHaveBeenCalledWith({ reason: 'reset' });
	});

	it('delegates compaction to a forced runtime that implements compact', async () => {
		const compactResult = { ok: true, compacted: true };
		const compact = jest.fn(async () => compactResult);
		registerAgentRuntime({
			id: 'compact-runtime',
			label: 'Compact runtime',
			supports: () => ({ supported: true }),
			runAttempt: jest.fn(async () => result()),
			compact,
		});

		await expect(
			maybeCompactAgentRuntimeSession({
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

	it('collects configured runtime runtimes from env and nested agent options', () => {
		expect(
			collectConfiguredAgentRuntimes(
				{
					assistant: { options: { agentRuntime: ' codex ' } },
					agents: [{ options: { agentRuntimeId: 'remote' } }],
					models: [{ options: { agentRuntime: 'pi' } }],
				},
				{ FRIDAY_AGENT_RUNTIME: ' sidecar ' }
			)
		).toEqual(['codex', 'remote', 'sidecar']);
	});
});
