import {
	ToolService,
	localToolNamesForGroup,
	type AgentTool,
} from '../../../../src/main/agent/tools';
import { AGENT_DEFAULT_TOOL_GROUPS, AGENT_TOOL_NAMES } from '../../../../src/shared/tools';
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
			denylist: ['write_file'],
		});

		expect(tools.map((tool) => tool.name)).toContain('read_file');
		expect(tools.map((tool) => tool.name)).not.toContain('write_file');
	});

	it('uses injected policy and logger for service-managed tools', async () => {
		const logger = makeLogger();
		const policy = {
			evaluateTools: jest.fn((subjects: Array<{ name: string }>) => ({
				allowed: new Set(subjects.filter((subject) => subject.name === 'read_file').map((subject) => subject.name)),
				filtered: subjects
					.filter((subject) => subject.name !== 'read_file')
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

		expect(service.createDefaultTools({}).map((tool) => tool.name)).toEqual(['read_file']);
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

	it('exposes shared local tool groups through the tools service registry', () => {
		const service = new ToolService();

		expect(localToolNamesForGroup('coreWorkspace')).toEqual(
			AGENT_DEFAULT_TOOL_GROUPS.coreWorkspace.map((tool) => tool.name)
		);
		expect(service.getToolsByGroup('mcpConnector').map((tool) => tool.name)).toEqual(
			AGENT_DEFAULT_TOOL_GROUPS.mcpConnector.map((tool) => tool.name)
		);
		expect(service.createDefaultTools({}).map((tool) => tool.name)).toEqual([...AGENT_TOOL_NAMES]);
	});

	it('uses PolicyService before executing service-managed tools', async () => {
		const service = new ToolService();
		const runShell = service.getToolsByGroup('coreWorkspace').find((tool) => tool.name === 'run_shell');
		const ctx = makeToolContext();
		ctx.agentId = 'agent-1';
		ctx.services.policy = {
			createToolUseKey: jest.fn(() => 'run_shell::{"command":"echo hi"}'),
			evaluateToolUse: jest.fn(() => ({
				outcome: 'deny',
				key: 'run_shell::{}',
				callCount: 1,
				status: 'error',
				deniedReason: 'approval_required',
				reason: 'blocked by policy',
			})),
		} as never;

		const result = await service.beforeCall(
			runShell!,
			{ command: 'echo hi' },
			ctx,
			service.createCallTracker()
		);

		expect(result.proceed).toBe(false);
		expect(result.vetoResult?.content[0]?.text).toBe('blocked by policy');
	});
});
