import { createAgentHarness, type AgentHarnessEvent, type AgentHarnessModelRequest } from '../../../../src/main/agent';

describe('createAgentHarness', () => {
	it('runs a UI-independent harness with injected runtime layers', async () => {
		const requests: AgentHarnessModelRequest[] = [];
		const events: AgentHarnessEvent[] = [];
		const memoryStore = jest.fn();
		const approval = jest.fn(async () => ({ approved: true }));
		const tool = {
			name: 'external_lookup',
			description: 'Lookup',
			schema: { type: 'object', properties: { q: { type: 'string' } } },
			requiresApproval: true,
			execute: jest.fn(async () => ({
				status: 'ok' as const,
				content: [{ type: 'text' as const, text: 'raw result' }],
			})),
		};
		const harness = await createAgentHarness({
			id: 'core',
			label: 'Core',
			modelId: 'gpt-test',
			systemPrompt: 'base system',
			model: {
				async *stream(req) {
					requests.push(req);
					if (!req.messages.some((entry) => entry.role === 'tool')) {
						yield { type: 'reasoning_item' as const, item: { step: 'choose tool' } };
						yield { type: 'tool_call_start' as const, id: 'tc1', name: 'external_lookup' };
						yield { type: 'tool_call_args_delta' as const, id: 'tc1', jsonDelta: '{"q":"friday"}' };
						yield { type: 'tool_call_end' as const, id: 'tc1' };
						yield { type: 'message_end' as const, stopReason: 'end_turn', usage: { inputTokens: 2, outputTokens: 3 } };
						return;
					}
					yield { type: 'text_delta' as const, text: 'final answer' };
					yield { type: 'message_end' as const, stopReason: 'end_turn', usage: { inputTokens: 4, outputTokens: 5 } };
				},
			},
			planner: {
				plan: jest.fn(async () => [{ task: 'check external source', status: 'in_progress' }]),
			},
			context: {
				build: jest.fn(async () => ({ systemPromptAdditions: ['context layer'] })),
			},
			memory: {
				retrieve: jest.fn(async () => [
					{
						id: 'm1',
						text: 'durable memory',
						createdAt: '2026-01-01T00:00:00.000Z',
					},
				]),
				store: memoryStore,
			},
			approvals: { checkpoint: approval },
			externalTools: [{ discover: jest.fn(async () => [tool]) }],
			skills: {
				load: jest.fn(async (name) => ({ name, instructions: `skill:${name}` })),
			},
			events: { emit: (event) => events.push(event) },
			resultOptimizer: {
				optimize: jest.fn(async ({ content }) =>
					content.map((block) =>
						block.type === 'text' ? { ...block, text: `${block.text} optimized` } : block
					)
				),
			},
		});

		const result = await harness.execute({
			task: 'answer with tools',
			sessionId: 'session-1',
			requiredSkills: ['research'],
		});

		expect(result.finalText).toBe('final answer');
		expect(result.toolCalls).toBe(1);
		expect(result.usage).toEqual({ inputTokens: 6, outputTokens: 8 });
		expect(result.session.plan).toEqual([{ task: 'check external source', status: 'in_progress' }]);
		expect(result.session.transcript.map((entry) => entry.role)).toEqual([
			'user',
			'assistant',
			'tool',
			'assistant',
		]);
		expect(result.session.transcript[2]).toMatchObject({
			role: 'tool',
			status: 'ok',
			content: [{ type: 'text', text: 'raw result optimized' }],
		});
		expect(requests[0].system).toContain('base system');
		expect(requests[0].system).toContain('context layer');
		expect(requests[0].system).toContain('skill:research');
		expect(requests[0].system).toContain('durable memory');
		expect(tool.execute).toHaveBeenCalledWith({ q: 'friday' }, expect.any(Object));
		expect(approval).toHaveBeenCalledWith(expect.objectContaining({ toolName: 'external_lookup' }));
		expect(memoryStore).toHaveBeenCalledWith(expect.objectContaining({ result }));
		expect(events.map((event) => event.type)).toEqual(
			expect.arrayContaining([
				'run.started',
				'approval.requested',
				'tool.finished',
				'run.finished',
			])
		);
		await expect(harness.getSession('session-1')).resolves.toMatchObject({
			id: 'session-1',
			status: 'completed',
		});
	});

	it('restores undo snapshots and isolates subagent sessions', async () => {
		const harness = await createAgentHarness({
			modelId: 'gpt-test',
			model: {
				async *stream() {
					yield { type: 'text_delta' as const, text: 'ok' };
					yield { type: 'message_end' as const, stopReason: 'end_turn', usage: { inputTokens: 1, outputTokens: 1 } };
				},
			},
		});

		await harness.execute({ task: 'first', sessionId: 'main' });
		const snapshot = await harness.createSnapshot('main', 'checkpoint');
		await harness.execute({ task: 'second', sessionId: 'main' });
		await expect(harness.undo(snapshot.id)).resolves.toMatchObject({
			id: 'main',
			transcript: expect.arrayContaining([expect.objectContaining({ role: 'user', content: 'first' })]),
		});

		const child = await harness.runSubagent({ task: 'child', parentSessionId: 'main' });
		expect(child.session.parentSessionId).toBe('main');
		expect(child.session.id).not.toBe('main');
	});
});
