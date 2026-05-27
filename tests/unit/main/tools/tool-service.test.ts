import {
	ToolService,
	localToolNamesForGroup,
	type AgentTool,
} from '../../../../src/main/agent/tools';
import { makeLogger, makeToolContext } from '../test-helpers';

describe('ToolService', () => {
	it('prepares provider-safe tools and management through one service facade', () => {
		const service = new ToolService();
		const tool: AgentTool = {
			name: 'Bad Tool!',
			description: 'Unsafe provider name.',
			schema: {
				type: 'object',
				properties: { value: { type: 'string' } },
				patternProperties: { '^x-': { type: 'string' } },
			},
			execute: jest.fn(),
		};

		const prepared = service.prepareToolsForRun({
			tools: [tool],
			ctx: makeToolContext(),
			userMessage: 'use it',
			provider: 'openai',
			modelId: 'gpt-test',
			management: { maxPromptTools: 1 },
		});

		expect(prepared.toolsForPrompt).toHaveLength(1);
		expect(prepared.toolsForPrompt[0]).toMatchObject({
			name: 'bad_tool',
			description: expect.stringContaining('Provider-safe alias for Bad Tool!'),
			schema: {
				type: 'object',
				properties: { value: { type: 'string' } },
				required: [],
			},
		});
		expect(prepared.management.executor).toBeDefined();
	});

	it('creates default local tools and applies deny policy', () => {
		const service = new ToolService();

		const tools = service.createDefaultTools({
			denylist: ['write'],
		});

		expect(tools.map((tool) => tool.name)).toContain('read');
		expect(tools.map((tool) => tool.name)).not.toContain('write');
	});

	it('uses injected policy and logger for service-managed tools', async () => {
		const logger = makeLogger();
		const policy = {
			evaluateTools: jest.fn((subjects: Array<{ name: string }>) => ({
				allowed: new Set(subjects.filter((subject) => subject.name === 'read').map((subject) => subject.name)),
				filtered: subjects
					.filter((subject) => subject.name !== 'read')
					.map((subject) => ({
						toolName: subject.name,
						stage: 'test',
						reason: 'blocked in test',
					})),
				warnings: [],
			})),
			createToolUseKey: jest.fn((toolName: string) => `${toolName}::{}`),
			evaluateToolUse: jest.fn(() => ({
				outcome: 'allow',
				key: 'managed::{}',
				callCount: 1,
			})),
		};
		const service = new ToolService({ policy: policy as never, logger: logger as never });
		const managedTool: AgentTool = {
			name: 'managed',
			description: 'Managed test tool.',
			schema: {},
			execute: jest.fn(async (_args, ctx) => {
				expect(ctx.services.policy).toBe(policy);
				return { status: 'ok', content: [{ type: 'text', text: 'done' }] };
			}),
		};

		expect(service.createDefaultTools({}).map((tool) => tool.name)).toEqual(['read']);
		await expect(
			service.executeToolWithManagement(
				managedTool,
				{},
				makeToolContext(),
				service.createManagementOptions()
			)
		).resolves.toMatchObject({ status: 'ok' });

		expect(logger.info).toHaveBeenCalledWith('ToolService', 'Initialized tools service');
		expect(logger.info).toHaveBeenCalledWith(
			'ToolService',
			'Tool execution completed: managed',
			expect.objectContaining({ status: 'ok' })
		);
	});

	it('exposes filesystem and cron groups through the tools service registry', () => {
		const service = new ToolService();

		expect(localToolNamesForGroup('filesystem')).toEqual([
			'filesystem_create',
			'filesystem_read',
			'filesystem_update',
			'filesystem_delete',
			'filesystem_list',
			'filesystem_move',
			'filesystem_copy',
			'filesystem_search',
		]);
		expect(service.getToolsByGroup('cron').map((tool) => tool.name)).toEqual([
			'cron_create',
			'cron_read',
			'cron_update',
			'cron_delete',
			'cron_list',
			'cron_start',
			'cron_stop',
			'cron_run',
		]);
	});

	it('uses PolicyService before CronService for cron tools', async () => {
		const service = new ToolService();
		const cronCreate = service.getToolsByGroup('cron').find((tool) => tool.name === 'cron_create');
		const ctx = makeToolContext();
		const cron = {
			createSchedule: jest.fn(async () => ({ id: 'schedule-1' })),
		};
		ctx.agentId = 'agent-1';
		ctx.services.cron = cron as never;
		ctx.services.policy = {
			evaluateToolUse: jest.fn(() => ({
				outcome: 'deny',
				key: 'cron_create::{}',
				callCount: 1,
				status: 'error',
				deniedReason: 'approval_required',
				reason: 'blocked by policy',
			})),
		} as never;

		const result = await cronCreate?.execute(
			{
				name: 'Reminder',
				type: 'oneTime',
				runAt: '2026-05-27T10:00:00.000Z',
				taskType: 'agent',
				taskInput: { prompt: 'check in' },
			},
			ctx
		);

		expect(result).toMatchObject({ status: 'error' });
		expect(result?.content[0]?.text).toBe('blocked by policy');
		expect(cron.createSchedule).not.toHaveBeenCalled();
	});
});
