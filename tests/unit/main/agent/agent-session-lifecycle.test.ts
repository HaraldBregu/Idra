const SESSION_ID = '11111111-1111-4111-8111-111111111111';
const resolveSessionId = jest.fn(() => SESSION_ID);
const resolveStoredSessionId = jest.fn(() => SESSION_ID);
const clearMessages = jest.fn();
const deleteSession = jest.fn();
const init = jest.fn((state: { id: string }, _config: unknown, input: { sessionId: string }) => {
	state.id = input.sessionId;
});
let streamStarted: (() => void) | undefined;
const started = (): Promise<void> =>
	new Promise((resolve) => {
		streamStarted = resolve;
	});

jest.mock('../../../../src/main/shared/agent_location', () => ({
	agentLocation: () => '/tmp/friday-agent-session-lifecycle',
}));
jest.mock('../../../../src/main/tasks', () => ({
	initTask: jest.fn(),
	destroyTask: jest.fn(),
	getRuntime: jest.fn(),
	setTaskRunner: jest.fn(),
	startTask: jest.fn(),
}));
jest.mock('../../../../src/main/agent/health', () => ({
	startHealth: jest.fn(),
	stopHealth: jest.fn(),
}));
jest.mock('../../../../src/main/agent/permissions', () => ({
	rejectPendingToolPermissions: jest.fn(),
}));
jest.mock('../../../../src/main/agent/skills', () => ({
	parseSkillCommand: (message: string) => ({ message }),
}));
jest.mock('../../../../src/main/agent/session', () => ({
	clearMessages,
	deleteSession,
	createSessionState: () => ({
		id: '',
		category: 'main',
		messages: [],
		toolCalls: [],
		usage: { inputTokens: 0, outputTokens: 0 },
		maxTurns: 20,
		model: 'default',
		numTurns: 0,
		finalText: '',
		sessionsPath: '',
		folderName: '',
		runTraceBuffer: [],
		context: { toolsContext: {} },
	}),
	init,
	listSessions: jest.fn(() => []),
	loadMessages: jest.fn(() => []),
	resolveSessionId,
	resolveStoredSessionId,
	tryAppendRun: jest.fn(),
}));
jest.mock('../../../../src/main/agent/run/run_stream', () => ({
	stream: async function* (
		_config: unknown,
		_session: unknown,
		_input: unknown,
		signal: AbortSignal
	) {
		streamStarted?.();
		await new Promise<void>((resolve) => {
			if (signal.aborted) resolve();
			else signal.addEventListener('abort', () => resolve(), { once: true });
		});
		yield* [];
	},
}));

import { Agent } from '../../../../src/main/agent/agent';
import type { WindowFactory } from '../../../../src/main/window_factory';

beforeEach(() => {
	jest.clearAllMocks();
	streamStarted = undefined;
});

it.each([
	['clearMessages', clearMessages],
	['deleteSession', deleteSession],
] as const)(
	'resolves a legacy alias before scheduling and %s cancels that UUID run first',
	async (method, mutate) => {
		const agent = new Agent({} as WindowFactory);
		const running = started();
		const send = agent.send('health check', 'health', {
			category: 'health',
			sessionId: 'health',
		});
		await running;
		const mutation = agent[method]('health');
		await Promise.all([send, mutation]);

		expect(resolveSessionId).toHaveBeenCalledWith('health', expect.any(String), 'health');
		expect(init.mock.calls[0][2]).toMatchObject({
			sessionId: SESSION_ID,
			legacySessionId: 'health',
		});
		expect(resolveStoredSessionId).toHaveBeenCalledWith('health', expect.any(String));
		expect(mutate).toHaveBeenCalledWith(expect.any(Object), expect.any(Object), SESSION_ID);
	}
);
