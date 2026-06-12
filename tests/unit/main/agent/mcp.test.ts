import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { AgentRuntime } from '../../../../src/main/agent/loop/loop';
import { Settings } from '../../../../src/main/agent/core/settings';
import { Workspace } from '../../../../src/main/agent/core/workspace';
import { AgentSession } from '../../../../src/main/services/agent-session';
import { ConnectorSettingsService } from '../../../../src/main/services/connector-settings-service';
import { LlmService } from '../../../../src/main/llm';
import type {
	ProviderAdapter,
	ProviderEvent,
	ProviderStreamRequest,
} from '../../../../src/main/llm/types';
import type { Provider } from '../../../../src/main/agent/core/types';

class TestSettings extends Settings {
	private provider: Provider = { id: 'openai', apiKey: 'key', baseURL: '' };
	private modelId = 'gpt-test';

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

	it('passes enabled connector service entries to the model as MCP servers', async () => {
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
		jest.spyOn(LlmService.prototype, 'build').mockReturnValue({
			stream,
		} as ProviderAdapter);

		const connectors = new ConnectorSettingsService({ cwd });
		connectors.upsert({
			id: 'gmail',
			name: 'Gmail',
			connectorId: 'connector_gmail',
			authorization: ' token ',
		});
		connectors.upsert({
			id: 'calendar',
			name: 'Calendar',
			connectorId: 'connector_calendar',
			enabled: false,
		});

		const runtime = new AgentRuntime(
			new TestWorkspace(cwd),
			new TestSettings(),
			new AgentSession({ task: 'chat', message: 'check gmail' }),
			connectors
		);

		for await (const _event of runtime.run({ task: 'chat', message: 'check gmail' })) {
		}

		expect(stream).toHaveBeenCalledTimes(1);
		expect(requests[0]?.mcp).toEqual([
			{
				type: 'mcp',
				server_label: 'gmail',
				server_url: 'https://gmailmcp.googleapis.com/mcp/v1',
				authorization: 'token',
				require_approval: 'always',
				defer_loading: false,
				server_description: 'Read and search Gmail messages through the OpenAI Gmail connector.',
			},
		]);
	});
});
