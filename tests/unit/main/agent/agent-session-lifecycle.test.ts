const SESSION_ID = '11111111-1111-4111-8111-111111111111';
const resolveSessionId = jest.fn(() => SESSION_ID);
const resolveStoredSessionId = jest.fn(() => SESSION_ID);
const clearMessages = jest.fn();
const deleteSession = jest.fn();
const order: string[] = [];

interface ControlledRun {
	started: Promise<void>;
	release: () => void;
	signal?: AbortSignal;
}

const controls = new Map<string, ControlledRun>();

function deferred(): { promise: Promise<void>; resolve: () => void } {
	let resolve = () => {};
	const promise = new Promise<void>((done) => {
		resolve = done;
	});
	return { promise, resolve };
}

function controlRun(runId: string): ControlledRun {
	const started = deferred();
	const release = deferred();
	const control: ControlledRun = { started: started.promise, release: release.resolve };
	controls.set(runId, control);
	(control as ControlledRun & { markStarted: () => void; wait: Promise<void> }).markStarted =
		started.resolve;
	(control as ControlledRun & { wait: Promise<void> }).wait = release.promise;
	return control;
}

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
jest.mock('../../../../src/main/agent/session', () => {
	const actual = jest.requireActual('../../../../src/main/agent/session');
	return {
		...actual,
		clearMessages: (...args: unknown[]) => {
			order.push('clear');
			clearMessages(...args);
		},
		deleteSession: (...args: unknown[]) => {
			order.push('delete');
			deleteSession(...args);
		},
		init: (state: { id: string }, _config: unknown, input: { sessionId: string; runId: string }) => {
			state.id = input.sessionId;
			order.push(`init:${input.runId}`);
		},
		listSessions: jest.fn(() => []),
		loadMessages: jest.fn(() => []),
		resolveSessionId,
		resolveStoredSessionId,
		tryAppendRun: jest.fn(),
	};
});
jest.mock('../../../../src/main/agent/runner/run_stream', () => ({
	stream: async function* (
		_config: unknown,
		_session: unknown,
		input: { runId: string; sessionId: string },
		signal: AbortSignal
	) {
		const control = controls.get(input.runId) as ControlledRun & {
			markStarted: () => void;
			wait: Promise<void>;
		};
		control.signal = signal;
		order.push(`start:${input.runId}`);
		control.markStarted();
		await control.wait;
		order.push(`settle:${input.runId}`);
		if (signal.aborted) return;
		yield {
			type: 'run_finished',
			result: {
				text: `${input.runId} reply`,
				model: 'model',
				toolCalls: [],
				numTurns: 1,
				subtype: 'success',
				sessionId: input.sessionId,
				stopReason: 'end_turn',
			},
		};
	},
}));

import { Agent } from '../../../../src/main/agent/agent';
import type { ExecSandbox } from '../../../../src/main/agent/sandbox';
import type { WindowFactory } from '../../../../src/main/window_factory';

beforeEach(() => {
	jest.clearAllMocks();
	controls.clear();
	order.length = 0;
});

it.each([
	['clearMessages', clearMessages, 'clear'],
	['deleteSession', deleteSession, 'delete'],
] as const)(
	'enqueues %s before a replacement send while the cancelled run settles',
	async (method, mutate, mutationEvent) => {
		const agent = new Agent(
			{} as WindowFactory,
			{ reset: jest.fn() } as unknown as ExecSandbox
		);
		const old = controlRun('old');
		const oldResponse = agent.send('old', 'health', {
			type: 'background',
			runId: 'old',
			sessionId: 'health',
		});
		await old.started;

		const maintenance = agent[method]('health');
		expect(old.signal?.aborted).toBe(true);
		const replacement = controlRun('replacement');
		const replacementResponse = agent.send('replacement', 'health', {
			type: 'background',
			runId: 'replacement',
			sessionId: 'health',
		});
		expect(mutate).not.toHaveBeenCalled();
		expect(order).not.toContain('start:replacement');

		old.release();
		await oldResponse;
		await replacement.started;
		expect(order).toEqual([
			'init:old',
			'start:old',
			'settle:old',
			mutationEvent,
			'init:replacement',
			'start:replacement',
		]);
		replacement.release();

		await expect(maintenance).resolves.toBeUndefined();
		await expect(replacementResponse).resolves.toBe('replacement reply');
		expect(resolveSessionId).toHaveBeenCalledWith('health', expect.any(String), 'health');
		expect(resolveStoredSessionId).toHaveBeenCalledWith('health', expect.any(String));
		expect(mutate).toHaveBeenCalledWith(expect.any(Object), expect.any(Object), SESSION_ID);
	}
);
