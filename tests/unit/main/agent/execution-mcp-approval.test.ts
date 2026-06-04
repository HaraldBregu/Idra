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

describe('executeAgentRun MCP approval continuation', () => {
	it('records runtime connector tools and continues approved OpenAI MCP calls', async () => {
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
				yield { type: 'message_start' };
				yield {
					type: 'mcp_call',
					id: 'mcp_1',
					serverLabel: 'gmail',
					name: 'search_emails',
					arguments: '{"query":"from:openai"}',
					output: '{"threads":[{"id":"thread_1"}]}',
					status: 'completed',
					item: {
						id: 'mcp_1',
						type: 'mcp_call',
						server_label: 'gmail',
						name: 'search_emails',
						arguments: '{"query":"from:openai"}',
						output: '{"threads":[{"id":"thread_1"}]}',
						status: 'completed',
					},
				};
				yield { type: 'text_delta', text: 'Found matching threads.' };
				yield {
					type: 'message_end',
					stopReason: 'end_turn',
					usage: { inputTokens: 7, outputTokens: 3 },
				};
			},
		};
		const connectorTools = {
			updateOpenAiConnectorTools: jest.fn(),
			canApproveOpenAiConnectorTool: jest.fn(() => true),
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
				services: { connectorTools },
			} as never,
			maxTokens: 100,
			maxIterations: 3,
		});

		expect(connectorTools.updateOpenAiConnectorTools).toHaveBeenCalledWith('gmail', [
			{
				name: 'search_emails',
				description: 'Search Gmail messages.',
				inputSchema: undefined,
				permission: 'always-allow',
				requiresApproval: false,
			},
		]);
		expect(connectorTools.canApproveOpenAiConnectorTool).toHaveBeenCalledWith(
			'gmail',
			'search_emails'
		);
		expect(requests[1]).toMatchObject({
			previousResponseId: 'resp_1',
			inputItems: [
				{
					type: 'mcp_approval_response',
					approve: true,
					approval_request_id: 'approval_1',
				},
			],
			builtInTools: [
				{
					type: 'mcp',
					server_label: 'gmail',
					connector_id: 'connector_gmail',
					authorization: 'gmail-token',
					require_approval: 'always',
				},
			],
		});
		expect(result.session.transcript[1]).toMatchObject({
			role: 'assistant',
			content: [
				{ type: 'provider_item', provider: 'openai' },
				{ type: 'provider_item', provider: 'openai' },
				{ type: 'text', text: 'Found matching threads.' },
			],
		});
		expect(result.finalText).toBe('Found matching threads.');
	});
});
