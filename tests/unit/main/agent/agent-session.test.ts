import type { RuntimeEvent } from '../../../../src/main/agent/types';

const sessionState = {
	id: '',
	messages: [],
	toolCalls: [],
	usage: { inputTokens: 0, outputTokens: 0 },
	maxTurns: 20,
	model: 'default',
	numTurns: 0,
	finalText: '',
	sessionsPath: '',
	folderName: '',
};

const initMock = jest.fn();

jest.mock('../../../../src/main/agent/session', () => ({
	clearMessages: jest.fn(),
	createSessionState: jest.fn(() => sessionState),
	init: initMock,
	loadMessages: jest.fn(() => []),
}));

jest.mock('../../../../src/main/agent/loop/runner', () => ({
	run: jest.fn(async function* (): AsyncGenerator<RuntimeEvent> {
		yield {
			type: 'run_finished',
			result: {
				text: 'ok',
				model: 'test-model',
				toolCalls: [],
				numTurns: 1,
				subtype: 'success',
				sessionId: 'home',
			},
		};
	}),
}));

jest.mock('../../../../src/main/agent/shared/agent-location', () => ({
	agentLocation: jest.fn(() => '/tmp/friday-agent-test'),
}));

jest.mock('../../../../src/main/agent/cron', () => ({
	destroyCron: jest.fn(),
	initCron: jest.fn(),
	startCron: jest.fn(),
}));

const { Agent } = require('../../../../src/main/agent/agent') as typeof import('../../../../src/main/agent/agent');

describe('Agent session handling', () => {
	beforeEach(() => {
		initMock.mockClear();
	});

	it('passes the requested session id into session initialization', async () => {
		const agent = new Agent();

		await agent.send('hello', 'main', { sessionId: 'home' });

		expect(initMock).toHaveBeenCalledWith(
			agent.session,
			agent.config,
			expect.objectContaining({
				message: 'hello',
				sessionId: 'home',
				task: 'chat',
			})
		);
	});
});
