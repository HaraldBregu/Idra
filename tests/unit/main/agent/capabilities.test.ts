import { AgentCapabilityService } from '../../../../src/main/agent/capabilities';
import type { AgentTool } from '../../../../src/main/agent/tools';
import type { SkillDetails, SkillSearchResult } from '../../../../src/shared/skills';
import { makeToolContext } from '../test-helpers';

function tool(name: string, description: string): AgentTool {
	return {
		name,
		description,
		schema: { type: 'object', properties: {}, additionalProperties: false },
		execute: jest.fn(),
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

	it('searches connector tools and executes them through connector exec commands', async () => {
		const connectors = {
			list: jest.fn(() => []),
			refreshTools: jest.fn(async () => []),
			searchTools: jest.fn(() => [
				{
					id: 'gmail:search',
					name: 'gmail_search',
					displayName: 'Gmail: search',
					description: 'Gmail: Search mail.',
					connectorId: 'gmail',
					connectorName: 'Gmail',
					connectorProviderId: 'google.gmail',
					toolName: 'search',
					inputSchema: { type: 'object', properties: { query: { type: 'string' } } },
					permission: 'always-allow',
					requiresApproval: false,
					score: 20,
				},
			]),
			execTool: jest.fn(async () => ({ messages: [] })),
		};
		const service = new AgentCapabilityService({ connectors: connectors as never });

		const result = await service.resolveForPrompt(baseInput({ userMessage: 'search gmail for invoices' }));

		expect(connectors.list).toHaveBeenCalled();
		expect(connectors.refreshTools).not.toHaveBeenCalled();
		expect(connectors.searchTools).toHaveBeenCalledWith({
			query: 'search gmail for invoices',
			limit: 8,
		});
		expect(result.connectorTools.map((entry) => entry.name)).toEqual(['gmail_search']);
		await expect(result.connectorTools[0]!.execute({ query: 'invoice' }, makeToolContext())).resolves.toMatchObject({
			status: 'ok',
			content: [expect.objectContaining({ text: expect.stringContaining('messages') })],
		});
		expect(connectors.execTool).toHaveBeenCalledWith({
			connectorId: 'gmail',
			toolName: 'search',
			args: { query: 'invoice' },
		});
	});

	it('refreshes configured connectors with missing tools before searching connector tools', async () => {
		const connectors = {
			list: jest.fn(() => [
				{
					id: 'google.gmail',
					name: 'Gmail',
					connectorId: 'google.gmail',
					enabled: true,
					status: 'configured',
					toolsCount: 0,
					tools: [],
				},
			]),
			refreshTools: jest.fn(async () => [
				{ name: 'search', permission: 'always-allow', requiresApproval: false },
			]),
			searchTools: jest.fn(() => []),
			execTool: jest.fn(),
		};
		const service = new AgentCapabilityService({ connectors: connectors as never });

		await service.resolveForPrompt(baseInput({ userMessage: 'search gmail' }));

		expect(connectors.refreshTools).toHaveBeenCalledWith('google.gmail');
		expect(connectors.searchTools).toHaveBeenCalledWith({ query: 'search gmail', limit: 8 });
	});
});
