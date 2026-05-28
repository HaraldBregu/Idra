import {
	buildAgentSessionKey,
	channelMessageRouteInput,
	normalizeAgentRoutingSettings,
	resolveAgentIntentRoute,
	resolveAgentRoute,
	shouldExposeStartupFilesTool,
} from '../../../../src/main/agent';

describe('agent routing', () => {
	it('falls back to the synthetic main agent when no agents are configured', () => {
		const route = resolveAgentRoute({});

		expect(route).toEqual({
			agentId: 'main',
			sessionKey: 'agent:main:main',
			sessionScope: 'main',
		});
	});

	it('selects deterministic bindings by priority', () => {
		const settings = normalizeAgentRoutingSettings({
			agents: [{ id: 'main', default: true }, { id: 'support' }, { id: 'sales' }],
			bindings: [
				{ agentId: 'support', match: { channel: 'telegram' } },
				{ agentId: 'sales', match: { peer: { kind: 'group', id: 'chat-1' } } },
			],
		});

		const route = resolveAgentRoute({
			settings,
			channel: 'telegram',
			accountId: 'default',
			peer: { kind: 'group', id: 'chat-1' },
		});

		expect(route.agentId).toBe('sales');
		expect(route.sessionKey).toBe('agent:sales:channel:telegram:account:default:peer:chat-1');
	});

	it('uses parent peer routes for thread inheritance', () => {
		const settings = normalizeAgentRoutingSettings({
			agents: [{ id: 'main' }, { id: 'threads' }],
			bindings: [
				{
					agentId: 'threads',
					match: { parentPeer: { kind: 'channel', id: 'channel-1' } },
					session: { scope: 'per-channel-peer' },
				},
			],
		});

		const route = resolveAgentRoute({
			settings,
			channel: 'slack',
			accountId: 'workspace',
			peer: { kind: 'thread', id: 'thread-1' },
			parentPeer: { kind: 'channel', id: 'channel-1' },
		});

		expect(route.agentId).toBe('threads');
		expect(route.sessionKey).toBe('agent:threads:channel:slack:peer:thread-1');
	});

	it('builds route input from normalized channel messages', () => {
		const input = channelMessageRouteInput({
			channelId: 'telegram',
			accountId: 'default',
			senderId: 'user-1',
			targetId: 'chat-1',
			chatType: 'thread',
			messageId: 'message-1',
			threadId: 'thread-1',
			text: 'hello',
			media: [],
			provenance: { roleIds: ['maintainer'] },
			idempotencyKey: 'key',
			receivedAt: 1,
		});

		expect(input).toMatchObject({
			channel: 'telegram',
			accountId: 'default',
			peer: { kind: 'thread', id: 'thread-1' },
			parentPeer: { kind: 'channel', id: 'chat-1' },
			roleIds: ['maintainer'],
		});
	});

	it('constructs stable session keys for task and subagent sessions', () => {
		expect(buildAgentSessionKey({ agentId: 'main', kind: 'task', id: 'abc 123' })).toBe(
			'agent:main:task:abc+123'
		);
		expect(buildAgentSessionKey({ agentId: 'research', kind: 'subagent', id: 'run-1' })).toBe(
			'agent:research:subagent:run-1'
		);
	});

	it('routes simple prompts directly through the LLM', () => {
		expect(resolveAgentIntentRoute('Explain dependency injection in simple terms')).toMatchObject({
			mode: 'direct_answer',
			useLocalTools: false,
			useConnectorTools: false,
		});
	});

	it('routes workspace work to local tools only', () => {
		expect(resolveAgentIntentRoute('Read the package.json file and summarize it')).toMatchObject({
			mode: 'use_tools',
			useLocalTools: true,
			useConnectorTools: false,
		});
	});

	it('routes remote service work to connector tools', () => {
		expect(resolveAgentIntentRoute('Search GitHub issues assigned to me')).toMatchObject({
			mode: 'use_tools',
			useLocalTools: false,
			useConnectorTools: true,
		});
	});

	it('exposes startup files only for agent identity and memory prompts', () => {
		expect(shouldExposeStartupFilesTool('Do not call me Harry anymore')).toBe(true);
		expect(shouldExposeStartupFilesTool('Explain dependency injection')).toBe(false);
	});
});
