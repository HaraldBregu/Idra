import 'reflect-metadata';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { AgentRuntime } from '../../../../src/main/agent/loop/loop';
import { Settings } from '../../../../src/main/agent/core/settings';
import { Workspace } from '../../../../src/main/agent/core/workspace';
import { AgentSession } from '../../../../src/main/services/agent-session';
import { Connector } from '../../../../src/main/connectors';
import { AgentModel } from '../../../../src/main/llm';
import type { ProviderEvent, ProviderStreamRequest } from '../../../../src/main/llm/types';
import type { Provider } from '../../../../src/main/agent/core/types';

class TestSettings extends Settings {
	private provider: Provider;
	private modelId = 'gpt-test';

	constructor(providerId = 'openai') {
		super();
		this.provider = { id: providerId, apiKey: 'key', baseURL: '' };
	}

	getProvider(): Provider | undefined {
		return this.provider;
	}

	setProvider(provider: Provider): void {
		this.provider = provider;
	}

	getProviderId(): string | undefined {
		return this.provider.id;
	}

	getModelId(): string | undefined {
		return this.modelId;
	}

	setModelId(modelId: string): void {
		this.modelId = modelId;
	}
}

class TestWorkspace extends Workspace {
	constructor(private readonly workspacePath: string) {
		super();
	}

	getPath(): string {
		return this.workspacePath;
	}

	getAgentText(): Promise<string> {
		return Promise.resolve('');
	}

	getBootstrapText(): Promise<string> {
		return Promise.resolve('');
	}

	getHeartbeatText(): Promise<string> {
		return Promise.resolve('');
	}

	getIdentityText(): Promise<string> {
		return Promise.resolve('');
	}

	getMemoryText(): Promise<string> {
		return Promise.resolve('');
	}

	getSoulText(): Promise<string> {
		return Promise.resolve('');
	}

	getToolsText(): Promise<string> {
		return Promise.resolve('');
	}

	getUserText(): Promise<string> {
		return Promise.resolve('Harald');
	}
}

describe('AgentRuntime MCP connectors', () => {
	let cwd: string;

	beforeEach(async () => {
		cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'friday-agent-mcp-'));
	});

	afterEach(async () => {
		await fs.rm(cwd, { recursive: true, force: true });
	});

	it('passes enabled connector service entries as MCP servers', async () => {
		const requests: ProviderStreamRequest[] = [];
		const stream = jest.fn(async function* (
			request: ProviderStreamRequest
		): AsyncIterable<ProviderEvent> {
			requests.push(request);
			yield { type: 'text_delta', text: 'done' };
			yield {
				type: 'message_end',
				stopReason: 'end_turn',
				usage: { inputTokens: 1, outputTokens: 1 },
			};
		});
		const connectors = new Connector({ cwd });
		connectors.upsert({
			id: 'gmail',
			name: 'Gmail',
			authorization: ' token ',
		});
		connectors.upsert({
			id: 'calendar',
			name: 'Calendar',
			enabled: false,
		});

		const runtime = new AgentRuntime(
			new TestWorkspace(cwd),
			new TestSettings(),
			new AgentSession({ task: 'chat', message: 'check gmail' }),
			connectors,
			new AgentModel({ providerModelFactory: () => ({ stream }) })
		);

		const events: string[] = [];
		for await (const event of runtime.run({ task: 'chat', message: 'check gmail' })) {
			events.push(event.type);
		}

		expect(events).toContain('run_finished');
		expect(stream).toHaveBeenCalledTimes(1);
		expect(requests[0]?.mcp).toEqual([
			{
				serverLabel: 'gmail',
				serverUrl: 'https://gmailmcp.googleapis.com/mcp/v1',
				connectorId: 'connector_gmail',
				authorization: 'token',
				requireApproval: 'always',
				deferLoading: false,
				serverDescription: 'Read and search Gmail messages through the OpenAI Gmail connector.',
			},
		]);
	});

	it('passes reasoning effort through to the LLM request', async () => {
		const requests: ProviderStreamRequest[] = [];
		const stream = jest.fn(async function* (
			request: ProviderStreamRequest
		): AsyncIterable<ProviderEvent> {
			requests.push(request);
			yield { type: 'text_delta', text: 'done' };
			yield {
				type: 'message_end',
				stopReason: 'end_turn',
				usage: { inputTokens: 1, outputTokens: 1 },
			};
		});
		const runtime = new AgentRuntime(
			new TestWorkspace(cwd),
			new TestSettings(),
			new AgentSession({ task: 'chat', message: 'check gmail', effort: 'high' }),
			new Connector({ cwd }),
			new AgentModel({ providerModelFactory: () => ({ stream }) })
		);

		const events: string[] = [];
		for await (const event of runtime.run({
			task: 'chat',
			message: 'check gmail',
			effort: 'high',
		})) {
			events.push(event.type);
		}

		expect(events).toContain('run_finished');
		expect(requests[0]?.effort).toBe('high');
	});

	it('records OpenAI MCP output items in assistant history', async () => {
		const listItem = {
			id: 'mcpl_1',
			type: 'mcp_list_tools',
			server_label: 'gmail',
			tools: [{ name: 'search_emails', input_schema: { type: 'object' } }],
		};
		const callItem = {
			id: 'mcp_1',
			type: 'mcp_call',
			server_label: 'gmail',
			name: 'search_emails',
			arguments: '{"query":"from:alice"}',
			output: '{"messages":[]}',
		};
		const stream = jest.fn(async function* (): AsyncIterable<ProviderEvent> {
			yield {
				type: 'mcp_list_tools',
				serverLabel: 'gmail',
				item: listItem,
				tools: [{ name: 'search_emails', inputSchema: { type: 'object' } }],
			};
			yield {
				type: 'mcp_call',
				id: 'mcp_1',
				serverLabel: 'gmail',
				name: 'search_emails',
				arguments: '{"query":"from:alice"}',
				output: '{"messages":[]}',
				item: callItem,
			};
			yield { type: 'text_delta', text: 'No messages.' };
			yield {
				type: 'message_end',
				stopReason: 'end_turn',
				usage: { inputTokens: 1, outputTokens: 1 },
			};
		});
		const session = new AgentSession({ task: 'chat', message: 'check gmail' });
		const runtime = new AgentRuntime(
			new TestWorkspace(cwd),
			new TestSettings(),
			session,
			new Connector({ cwd }),
			new AgentModel({ providerModelFactory: () => ({ stream }) })
		);

		const events: string[] = [];
		for await (const event of runtime.run({ task: 'chat', message: 'check gmail' })) {
			events.push(event.type);
		}

		expect(events).toContain('run_finished');
		expect(session.messages[1]).toEqual({
			role: 'assistant',
			content: [
				{ type: 'provider_item', provider: 'openai', item: listItem },
				{ type: 'provider_item', provider: 'openai', item: callItem },
				{ type: 'text', text: 'No messages.' },
			],
			toolCalls: [],
		});
	});

	it('passes connector service entries without provider connector ids', async () => {
		const requests: ProviderStreamRequest[] = [];
		const stream = jest.fn(async function* (
			request: ProviderStreamRequest
		): AsyncIterable<ProviderEvent> {
			requests.push(request);
			yield { type: 'text_delta', text: 'done' };
			yield {
				type: 'message_end',
				stopReason: 'end_turn',
				usage: { inputTokens: 1, outputTokens: 1 },
			};
		});
		const connectors = new Connector({ cwd });
		connectors.upsert({
			id: 'calendar',
			name: 'Calendar',
			authorization: ' token ',
		});

		const runtime = new AgentRuntime(
			new TestWorkspace(cwd),
			new TestSettings('anthropic'),
			new AgentSession({ task: 'chat', message: 'check calendar' }),
			connectors,
			new AgentModel({ providerModelFactory: () => ({ stream }) })
		);

		const events: string[] = [];
		for await (const event of runtime.run({ task: 'chat', message: 'check calendar' })) {
			events.push(event.type);
		}

		expect(events).toContain('run_finished');
		expect(stream).toHaveBeenCalledTimes(1);
		expect(requests[0]?.mcp).toEqual([
			{
				serverLabel: 'calendar',
				serverUrl: 'https://www.googleapis.com/calendar/v3',
				connectorId: 'connector_googlecalendar',
				authorization: 'token',
				requireApproval: 'always',
				deferLoading: false,
				serverDescription:
					'Read Google Calendar events through the Google Calendar connector.',
			},
		]);
	});
});
