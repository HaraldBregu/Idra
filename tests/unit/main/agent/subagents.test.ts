import {
	SubagentRegistry,
	SubagentSpawnService,
} from '../../../../src/main/agent';

describe('subagent orchestration', () => {
	function createSpawnService(options: {
		agents?: Record<string, unknown>;
		loadParentMetadata?: jest.Mock;
		idFactory?: () => string;
	}) {
		const registry = new SubagentRegistry();
		const agentService = {
			send: jest.fn(async () => 'child output'),
			cancel: jest.fn(),
		};
		const eventBus = { emit: jest.fn() };
		const agents = options.agents ?? {};
		const service = new SubagentSpawnService({
			agentSettings: {
				getAgentConfig: jest.fn((id: string) => agents[id]),
			} as never,
			agentService: agentService as never,
			registry,
			eventBus: eventBus as never,
			idFactory: options.idFactory ?? (() => 'run-1'),
			now: () => 1000,
			loadParentMetadata: options.loadParentMetadata ?? jest.fn(async () => undefined),
		});
		return { service, registry, agentService, eventBus };
	}

	it('registers a same-agent child run and starts an internal task', async () => {
		const { service, registry, agentService, eventBus } = createSpawnService({
			agents: {
				main: {
					id: 'main',
					subagents: { maxSpawnDepth: 2, runTimeoutSeconds: 30 },
					tools: { deny: ['delete_file'] },
				},
			},
			loadParentMetadata: jest.fn(async () => ({
				agentId: 'main',
				spawnDepth: 0,
				inheritedToolDeny: ['exec'],
			})),
		});

		const result = await service.spawn({
			requesterAgentId: 'main',
			requesterSessionKey: 'agent:main:main',
			input: {
				task: 'Research the release notes',
				taskName: 'Release research',
				model: 'openai/gpt-test',
			},
		});

		expect(result).toEqual({
			runId: 'run-1',
			taskId: 'subagent:run-1',
			childSessionKey: 'agent:main:subagent:run-1',
			agentId: 'main',
			status: 'queued',
			taskName: 'Release research',
			label: undefined,
		});
		expect(registry.getSubagentRun('run-1')).toMatchObject({
			runId: 'run-1',
			agentId: 'main',
			childSessionKey: 'agent:main:subagent:run-1',
			modelId: 'gpt-test',
			providerId: 'openai',
		});
		expect(registry.getSubagentRun('run-1')?.outcome).toBeUndefined();
		expect(agentService.send).toHaveBeenCalledWith('Research the release notes', 'main', {
			sessionId: 'agent:main:subagent:run-1',
			providerId: 'openai',
			model: 'gpt-test',
			effort: undefined,
			toolsAllow: undefined,
			toolsDeny: ['exec', 'delete_file'],
			sessionMetadata: expect.objectContaining({
				spawnDepth: 1,
				subagentRole: 'orchestrator',
			}),
		});
		expect(eventBus.emit).toHaveBeenCalledWith(
			'subagent:created',
			expect.objectContaining({ runId: 'run-1' })
		);
	});

	it('snapshots target agent model defaults for child runs', async () => {
		const { service, registry, agentService } = createSpawnService({
			agents: {
				main: { id: 'main', subagents: { allowAgents: ['research'] } },
				research: {
					id: 'research',
					model: { providerId: 'anthropic', modelId: 'claude-sonnet-4-6' },
				},
			},
		});

		await service.spawn({
			requesterAgentId: 'main',
			requesterSessionKey: 'agent:main:main',
			input: {
				task: 'Research the release notes',
				agentId: 'research',
			},
		});

		expect(registry.getSubagentRun('run-1')).toMatchObject({
			agentId: 'research',
			providerId: 'anthropic',
			modelId: 'claude-sonnet-4-6',
		});
		expect(agentService.send).toHaveBeenCalledWith(
			'Research the release notes',
			'research',
			expect.objectContaining({
				providerId: 'anthropic',
				model: 'claude-sonnet-4-6',
			})
		);
	});

	it('uses configured subagent model defaults including OpenAI effort', async () => {
		const { service, registry, agentService } = createSpawnService({
			agents: {
				main: {
					id: 'main',
					subagents: {
						model: { providerId: 'openai', modelId: 'gpt-5.4', effort: 'high' },
					},
				},
			},
		});

		await service.spawn({
			requesterAgentId: 'main',
			requesterSessionKey: 'agent:main:main',
			input: { task: 'Research the release notes' },
		});

		expect(registry.getSubagentRun('run-1')).toMatchObject({
			providerId: 'openai',
			modelId: 'gpt-5.4',
			effort: 'high',
		});
		expect(agentService.send).toHaveBeenCalledWith(
			'Research the release notes',
			'main',
			expect.objectContaining({
				providerId: 'openai',
				model: 'gpt-5.4',
				effort: 'high',
			})
		);
	});

	it('rejects cross-agent spawn unless the parent allowlists the target', async () => {
		const { service } = createSpawnService({
			agents: {
				main: { id: 'main', subagents: { allowAgents: [] } },
				research: { id: 'research' },
			},
		});

		await expect(
			service.spawn({
				requesterAgentId: 'main',
				requesterSessionKey: 'agent:main:main',
				input: { task: 'Research', agentId: 'research' },
			})
		).rejects.toThrow('Cross-agent spawn is not allowed: research');
	});

	it('rejects invalid spawn enum values before launching a task', async () => {
		const { service, agentService } = createSpawnService({
			agents: { main: { id: 'main' } },
		});

		await expect(
			service.spawn({
				requesterAgentId: 'main',
				requesterSessionKey: 'agent:main:main',
				input: { task: 'Research', mode: 'invalid' },
			})
		).rejects.toThrow('mode must be run or session.');
		expect(agentService.send).not.toHaveBeenCalled();
	});

	it('enforces max depth and active child limits before launching', async () => {
		const loadParentMetadata = jest.fn(async () => ({ agentId: 'main', spawnDepth: 1 }));
		const { service } = createSpawnService({
			agents: {
				main: { id: 'main', subagents: { maxSpawnDepth: 1 } },
			},
			loadParentMetadata,
		});

		await expect(
			service.spawn({
				requesterAgentId: 'main',
				requesterSessionKey: 'agent:main:main',
				input: { task: 'Too deep' },
			})
		).rejects.toThrow('Maximum subagent spawn depth reached: 1');

		const limited = createSpawnService({
			agents: {
				main: { id: 'main', subagents: { maxSpawnDepth: 2, maxChildrenPerAgent: 1 } },
			},
		});
		limited.registry.registerSubagentRun({
			runId: 'existing',
			childSessionKey: 'agent:main:subagent:existing',
			requesterSessionKey: 'agent:main:main',
			controllerSessionKey: 'agent:main:main',
			task: 'Existing',
			agentId: 'main',
			cleanup: 'keep',
			spawnMode: 'run',
			createdAt: 1,
		});

		await expect(
			limited.service.spawn({
				requesterAgentId: 'main',
				requesterSessionKey: 'agent:main:main',
				input: { task: 'Another child' },
			})
		).rejects.toThrow('Maximum active subagent children reached: 1');
	});

	it('lists, histories, and cancels only controlled child runs', async () => {
		const { service, registry, agentService, eventBus } = createSpawnService({
			agents: { main: { id: 'main' } },
		});
		registry.registerSubagentRun({
			runId: 'run-1',
			taskId: 'subagent:run-1',
			childSessionKey: 'agent:main:subagent:run-1',
			requesterSessionKey: 'agent:main:main',
			controllerSessionKey: 'agent:main:main',
			task: 'Child',
			agentId: 'main',
			cleanup: 'keep',
			spawnMode: 'run',
			createdAt: 1,
		});
		registry.registerSubagentRun({
			runId: 'sibling',
			childSessionKey: 'agent:main:subagent:sibling',
			requesterSessionKey: 'agent:main:other',
			controllerSessionKey: 'agent:main:other',
			task: 'Sibling',
			agentId: 'main',
			cleanup: 'keep',
			spawnMode: 'run',
			createdAt: 1,
		});

		await expect(
			service.control({
				requesterSessionKey: 'agent:main:main',
				input: { action: 'list' },
			})
		).resolves.toMatchObject({
			action: 'list',
			runs: [expect.objectContaining({ runId: 'run-1' })],
		});
		await expect(
			service.control({
				requesterSessionKey: 'agent:main:main',
				input: { action: 'history', runId: 'sibling' },
			})
		).rejects.toThrow('Subagent run not found: sibling');

		const cancelled = await service.control({
			requesterSessionKey: 'agent:main:main',
			input: { action: 'cancel', runId: 'run-1' },
		});

		expect(cancelled).toMatchObject({
			action: 'cancel',
			run: expect.objectContaining({ runId: 'run-1', outcome: 'cancelled' }),
		});
		expect(agentService.send).not.toHaveBeenCalled();
		expect(agentService.cancel).toHaveBeenCalledWith('agent:main:subagent:run-1');
		expect(eventBus.emit).toHaveBeenCalledWith(
			'subagent:completed',
			expect.objectContaining({ runId: 'run-1', outcome: 'cancelled' })
		);
	});

	it('does not overwrite terminal subagent outcomes during cancel', async () => {
		const { service, registry, agentService, eventBus } = createSpawnService({
			agents: { main: { id: 'main' } },
		});
		registry.registerSubagentRun({
			runId: 'done',
			taskId: 'subagent:done',
			childSessionKey: 'agent:main:subagent:done',
			requesterSessionKey: 'agent:main:main',
			controllerSessionKey: 'agent:main:main',
			task: 'Done',
			agentId: 'main',
			cleanup: 'keep',
			spawnMode: 'run',
			createdAt: 1,
		});
		registry.completeSubagentRun('done', 'ok');

		await expect(
			service.control({
				requesterSessionKey: 'agent:main:main',
				input: { action: 'cancel', runId: 'done' },
			})
		).resolves.toMatchObject({
			action: 'cancel',
			run: expect.objectContaining({ runId: 'done', outcome: 'ok' }),
		});
		expect(registry.getSubagentRun('done')).toMatchObject({ outcome: 'ok' });
		expect(agentService.cancel).not.toHaveBeenCalled();
		expect(eventBus.emit).not.toHaveBeenCalledWith(
			'subagent:completed',
			expect.objectContaining({ runId: 'done', outcome: 'cancelled' })
		);
	});

	it('denies control actions from leaf subagents', async () => {
		const { service } = createSpawnService({
			loadParentMetadata: jest.fn(async () => ({
				agentId: 'main',
				spawnDepth: 1,
				subagentControlScope: 'none',
			})),
		});

		await expect(
			service.control({
				requesterSessionKey: 'agent:main:subagent:leaf',
				input: { action: 'list' },
			})
		).rejects.toThrow('This subagent cannot control child runs.');
	});
});
