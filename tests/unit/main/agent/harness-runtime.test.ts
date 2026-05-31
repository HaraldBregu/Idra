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

	it('runs semantic validation before permission checks and tool side effects', async () => {
		const execute = jest.fn(async () => ({
			status: 'ok' as const,
			content: [{ type: 'text' as const, text: 'should not run' }],
		}));
		const checkPermissions = jest.fn();
		const harness = await createAgentHarness({
			modelId: 'gpt-test',
			model: {
				async *stream() {
					yield { type: 'tool_call_start' as const, id: 'tc1', name: 'write_record' };
					yield { type: 'tool_call_args_delta' as const, id: 'tc1', jsonDelta: '{"value":""}' };
					yield { type: 'message_end' as const, stopReason: 'end_turn', usage: { inputTokens: 1, outputTokens: 1 } };
				},
			},
			tools: [
				{
					name: 'write_record',
					description: 'Write a record',
					schema: { type: 'object', properties: { value: { type: 'string' } } },
					validateInput: jest.fn(() => ({ ok: false as const, message: 'value is required' })),
					checkPermissions,
					execute,
				},
			],
		});

		const result = await harness.execute({ task: 'write', sessionId: 'validation' });

		expect(result.session.transcript[2]).toMatchObject({
			role: 'tool',
			status: 'error',
			content: [{ type: 'text', text: 'value is required' }],
		});
		expect(checkPermissions).not.toHaveBeenCalled();
		expect(execute).not.toHaveBeenCalled();
	});

	it('denies tool-specific permission decisions before execution', async () => {
		const execute = jest.fn(async () => ({
			status: 'ok' as const,
			content: [{ type: 'text' as const, text: 'should not run' }],
		}));
		const harness = await createAgentHarness({
			modelId: 'gpt-test',
			model: {
				async *stream() {
					yield { type: 'tool_call_start' as const, id: 'tc1', name: 'send_email' };
					yield { type: 'tool_call_args_delta' as const, id: 'tc1', jsonDelta: '{"to":"user@example.com"}' };
					yield { type: 'message_end' as const, stopReason: 'end_turn', usage: { inputTokens: 1, outputTokens: 1 } };
				},
			},
			tools: [
				{
					name: 'send_email',
					description: 'Send email',
					schema: { type: 'object', properties: { to: { type: 'string' } } },
					checkPermissions: jest.fn(() => ({ behavior: 'deny' as const, message: 'external email disabled' })),
					execute,
				},
			],
		});

		const result = await harness.execute({ task: 'email', sessionId: 'permission-deny' });

		expect(result.session.transcript[2]).toMatchObject({
			role: 'tool',
			status: 'rejected',
			content: [{ type: 'text', text: 'external email disabled' }],
		});
		expect(execute).not.toHaveBeenCalled();
	});

	it('supports ask permission decisions with rewritten tool input', async () => {
		const approval = jest.fn(async () => ({
			approved: true,
			updatedArgs: { path: 'approved.txt' },
		}));
		const execute = jest.fn(async () => ({
			status: 'ok' as const,
			content: [{ type: 'text' as const, text: 'written' }],
		}));
		const harness = await createAgentHarness({
			modelId: 'gpt-test',
			model: {
				async *stream(req) {
					if (!req.messages.some((entry) => entry.role === 'tool')) {
						yield { type: 'tool_call_start' as const, id: 'tc1', name: 'write_file' };
						yield { type: 'tool_call_args_delta' as const, id: 'tc1', jsonDelta: '{"path":"draft.txt"}' };
						yield { type: 'message_end' as const, stopReason: 'end_turn', usage: { inputTokens: 1, outputTokens: 1 } };
						return;
					}
					yield { type: 'text_delta' as const, text: 'done' };
					yield { type: 'message_end' as const, stopReason: 'end_turn', usage: { inputTokens: 1, outputTokens: 1 } };
				},
			},
			approvals: { checkpoint: approval },
			tools: [
				{
					name: 'write_file',
					description: 'Write file',
					schema: { type: 'object', properties: { path: { type: 'string' } } },
					checkPermissions: jest.fn(() => ({
						behavior: 'ask' as const,
						message: 'approve file write',
						input: { path: 'reviewed.txt' },
					})),
					execute,
				},
			],
		});

		await harness.execute({ task: 'write', sessionId: 'permission-ask' });

		expect(approval).toHaveBeenCalledWith(expect.objectContaining({
			args: { path: 'reviewed.txt' },
			reason: 'approve file write',
		}));
		expect(execute).toHaveBeenCalledWith({ path: 'approved.txt' }, expect.any(Object));
	});
});
