import { executeAgentRun } from '../../../../src/main/agent/execution';
import type { ProviderAdapter, ProviderStreamRequest } from '../../../../src/main/llm/types';
import type { SessionFile } from '../../../../src/main/agent/session';

function session(): SessionFile {
	const now = new Date().toISOString();
	return {
		id: 'session-1',
		createdAt: now,
		updatedAt: now,
		model: 'gpt-5.4',
		provider: 'openai',
		transcript: [],
		plan: [],
		compactionMarkers: [],
	};
}

describe('executeAgentRun MCP approval requests', () => {
	it('blocks OpenAI MCP approval requests without connector tool policy', async () => {
		const requests: ProviderStreamRequest[] = [];
		const provider: ProviderAdapter = {
			async *stream(request) {
				requests.push(request);
				if (requests.length === 1) {
					yield { type: 'message_start' };
					yield { type: 'response_created', id: 'resp_1' };
					yield {
						type: 'mcp_list_tools',
						serverLabel: 'gmail',
						item: {
							id: 'list_1',
							type: 'mcp_list_tools',
							server_label: 'gmail',
							tools: [{ name: 'search_emails', description: 'Search Gmail messages.' }],
						},
						tools: [{ name: 'search_emails', description: 'Search Gmail messages.' }],
					};
					yield {
						type: 'mcp_approval_request',
						id: 'approval_1',
						serverLabel: 'gmail',
						name: 'search_emails',
						arguments: '{"query":"from:openai"}',
					};
					return;
				}
			},
		};

		const result = await executeAgentRun({
			runId: 'run-1',
			userMessage: 'Search Gmail',
			systemPrompt: '',
			session: session(),
			provider,
			providerId: 'openai',
			model: 'gpt-5.4',
			tools: [],
			builtInTools: [
				{
					type: 'mcp',
					server_label: 'gmail',
					connector_id: 'connector_gmail',
					authorization: 'gmail-token',
					require_approval: 'always',
				},
			],
			ctx: {
				workspace: process.cwd(),
				sessionId: 'session-1',
				readState: new Map(),
				plan: { entries: [] },
				services: {},
			} as never,
			maxTokens: 100,
			maxIterations: 3,
		});

		expect(requests).toHaveLength(1);
		expect(result.session.transcript[1]).toMatchObject({
			role: 'assistant',
			content: [
				{ type: 'provider_item', provider: 'openai' },
				{
					type: 'text',
					text: 'OpenAI connector "gmail" requested approval to run "search_emails", but connector policy did not allow automatic approval.',
				},
			],
		});
		expect(result.finalText).toBe(
			'OpenAI connector "gmail" requested approval to run "search_emails", but connector policy did not allow automatic approval.'
		);
	});
});
