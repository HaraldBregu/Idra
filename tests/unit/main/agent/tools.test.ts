import { createAgentToolController } from '../../../../src/main/agent/tools';
import type { AgentTool } from '../../../../src/main/agent/tooling';

function tool(name: string): AgentTool {
	return {
		name,
		description: `${name} tool`,
		schema: { type: 'object', properties: {} },
		execute: async () => ({ status: 'ok', content: [] }),
	};
}

describe('AgentToolController', () => {
	it('adds and filters local tools for an agent run', async () => {
		const readTool = tool('read');
		const writeTool = tool('write');
		const createDefaultTools = jest.fn(() => [readTool, writeTool]);
		const filterToolsByAllowlist = jest.fn((tools: AgentTool[], allowlist?: string[]) =>
			allowlist ? tools.filter((candidate) => allowlist.includes(candidate.name)) : tools
		);
		const toolService = {
			createDefaultTools,
			filterToolsByAllowlist,
		};
		const controller = createAgentToolController({ toolService: toolService as never });

		const result = await controller.buildTools({
			context: {
				agentId: 'agent-1',
				runId: 'run-1',
				providerId: 'openai',
				model: 'gpt-5',
				workspace: process.cwd(),
				session: {} as never,
				signal: new AbortController().signal,
				services: {} as never,
				toolContext: {} as never,
				toolsAllow: ['read'],
				toolsDeny: ['write'],
			},
			toolService,
		});

		expect(createDefaultTools).toHaveBeenCalledWith({
			explicitAllow: ['read'],
			denylist: ['write'],
		});
		expect(filterToolsByAllowlist).toHaveBeenCalledWith([readTool, writeTool], ['read']);
		expect(result.tools).toEqual([readTool]);
		expect(result.builtInTools).toEqual([]);
	});
});
