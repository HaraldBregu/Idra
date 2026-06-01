import { AgentCapabilityService } from '../../../../src/main/capabilities';
import type { AgentTool } from '../../../../src/main/capabilities/tools';
import type { SkillDetails, SkillSearchResult } from '../../../../src/shared/skills';
import { makeToolContext } from '../test-helpers';

function tool(name: string, description: string, overrides: Partial<AgentTool> = {}): AgentTool {
	return {
		name,
		description,
		schema: { type: 'object', properties: {}, additionalProperties: false },
		execute: jest.fn(),
		...overrides,
	};
}

function skill(name: string, reason = 'matched skill description'): SkillSearchResult {
	return {
		id: name,
		name,
		description: name + ' description',
		location: '/skills/' + name,
		score: 10,
		reason,
	};
}

function skillDetails(name: string): SkillDetails {
	return {
		id: name,
		name,
		description: name + ' description',
		location: '/skills/' + name,
		frontmatter: { name, description: name + ' description' },
		instructions: 'Use the ' + name + ' workflow.',
		supportFiles: [],
	};
}

function baseInput(overrides: Record<string, unknown> = {}) {
	return {
		userMessage: 'hello',
		localTools: [],
		ctx: makeToolContext(),
		providerId: 'test',
		model: 'test-model',
		shouldUseTools: true,
		bootstrapPending: false,
		directAnswer: false,
		...overrides,
	};
}

describe('AgentCapabilityService', () => {
	it('chooses direct answer when no tools or skills are available', async () => {
		const service = new AgentCapabilityService();

		await expect(service.resolveForPrompt(baseInput())).resolves.toMatchObject({
			tools: [],
			skills: [],
			directAnswer: true,
			decision: { mode: 'direct_answer' },
		});
	});

	it('searches skills and loads only selected skill instructions', async () => {
		const search = jest.fn(async () => [skill('research-brief')]);
		const load = jest.fn(async (name: string) => skillDetails(name));
		const service = new AgentCapabilityService({ skills: { search, load } as never });

		const result = await service.resolveForPrompt(baseInput({
			userMessage: 'prepare a research brief',
			configuredSkillNames: ['research-brief'],
		}));

		expect(search).toHaveBeenCalledWith('prepare a research brief', {
			names: ['research-brief'],
			limit: 3,
		});
		expect(load).toHaveBeenCalledWith('research-brief');
		expect(result).toMatchObject({
			directAnswer: false,
			decision: { mode: 'use_skills' },
			skills: [{ name: 'research-brief', reason: 'matched skill description' }],
		});
		expect(result.promptAdditions).toContain('Use the research-brief workflow.');
	});

	it('combines selected tools and selected skills when both match', async () => {
		const service = new AgentCapabilityService({
			skills: {
				search: jest.fn(async () => [skill('react-ui')]),
				load: jest.fn(async (name: string) => skillDetails(name)),
			} as never,
		});

		await expect(service.resolveForPrompt(baseInput({
			userMessage: 'build a react settings screen',
			localTools: [tool('read', 'Read workspace files.')],
		}))).resolves.toMatchObject({
			tools: [expect.objectContaining({ name: 'read' })],
			decision: { mode: 'use_tools_and_skills' },
			directAnswer: false,
		});
	});

	it('preserves MCP service kind metadata from connector tools', async () => {
		const streamEvent = jest.fn();
		const service = new AgentCapabilityService({
			connectors: {
				createAgentTools: jest.fn(() => [
					tool('search_docs', 'Search docs connector.'),
					tool('mcp_read_repo', 'Read repository through MCP.', {
						serviceKind: 'mcp',
						serviceId: 'github',
						displayName: 'GitHub MCP',
					}),
				]),
			} as never,
		});

		const result = await service.resolveForPrompt(baseInput({
			userMessage: 'read repository docs',
			streamEvent,
		}));

		expect(result.connectorTools).toEqual([
			expect.objectContaining({ name: 'search_docs', serviceKind: 'connector' }),
			expect.objectContaining({
				name: 'mcp_read_repo',
				serviceKind: 'mcp',
				serviceId: 'github',
			}),
		]);
		expect(streamEvent).toHaveBeenCalledWith(expect.objectContaining({
			type: 'capability_resolution_result',
			connectorTools: ['search_docs', 'mcp_read_repo'],
			mcpTools: ['mcp_read_repo'],
			services: expect.arrayContaining([
				expect.objectContaining({ name: 'mcp_read_repo', serviceKind: 'mcp', serviceId: 'github' }),
			]),
		}));
	});
});
