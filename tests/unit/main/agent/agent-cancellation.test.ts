const mockRejectPendingToolPermissions = jest.fn();
const mockStream = jest.fn();

jest.mock('../../../../src/main/shared/agent_location', () => ({
	agentLocation: () => '/tmp/friday-agent-cancellation',
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
	rejectPendingToolPermissions: (...args: unknown[]) => mockRejectPendingToolPermissions(...args),
}));
jest.mock('../../../../src/main/agent/skills', () => ({
	parseSkillCommand: (message: string) => ({ message }),
}));
jest.mock('../../../../src/main/agent/session', () => ({
	clearMessages: jest.fn(),
	deleteSession: jest.fn(),
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
	init: (state: { id: string }, _config: unknown, input: { sessionId: string }) => {
		state.id = input.sessionId;
	},
	listSessions: jest.fn(() => []),
	loadMessages: jest.fn(() => []),
	resolveSessionId: (sessionId: string | undefined, _location: string, category: string) =>
		sessionId ?? `${category}-session`,
	resolveStoredSessionId: (sessionId: string) => sessionId,
	tryAppendRun: jest.fn(),
}));
jest.mock('../../../../src/main/agent/runner/run_stream', () => ({
	stream: (...args: unknown[]) => mockStream(...args),
}));

import { Agent } from '../../../../src/main/agent/agent';
import type { WindowFactory } from '../../../../src/main/window_factory';

interface ControlledRun {
	started: Promise<void>;
	release: () => void;
	signal?: AbortSignal;
}

function deferred(): { promise: Promise<void>; resolve: () => void } {
	let resolve = () => {};
	const promise = new Promise<void>((done) => {
		resolve = done;
	});
	return { promise, resolve };
}

function controlRun(controls: Map<string, ControlledRun>, runId: string): ControlledRun {
	const started = deferred();
	const release = deferred();
	const control: ControlledRun = { started: started.promise, release: release.resolve };
	controls.set(runId, control);
	(control as ControlledRun & { markStarted: () => void; wait: Promise<void> }).markStarted =
		started.resolve;
	(control as ControlledRun & { wait: Promise<void> }).wait = release.promise;
	return control;
}

describe('Agent scoped cancellation', () => {
	let controls: Map<string, ControlledRun>;

	beforeEach(() => {
		controls = new Map();
		mockRejectPendingToolPermissions.mockReset();
		mockStream
			.mockReset()
			.mockImplementation(
				(
					_config: unknown,
					_session: unknown,
					input: { runId: string; origin: string; sessionId: string },
					signal: AbortSignal
				) =>
					(async function* () {
						const control = controls.get(input.runId) as ControlledRun & {
							markStarted: () => void;
							wait: Promise<void>;
						};
						control.signal = signal;
						control.markStarted();
						await Promise.race([
							control.wait,
							new Promise<void>((resolve) => {
								if (signal.aborted) resolve();
								else signal.addEventListener('abort', () => resolve(), { once: true });
							}),
						]);
						if (signal.aborted) return;
						yield {
							type: 'run_finished',
							result: {
								text: `${input.origin} reply`,
								model: 'model',
								toolCalls: [],
								numTurns: 1,
								subtype: 'success',
								sessionId: input.sessionId,
								stopReason: 'end_turn',
							},
						};
					})()
			);
	});

	it('cancels only the owned UI run and leaves a simultaneous bot reply running', async () => {
		const agent = new Agent({} as WindowFactory);
		const ui = controlRun(controls, 'ui-run');
		const bot = controlRun(controls, 'bot-run');
		const uiResponse = agent.send('ui', 'main', {
			runId: 'ui-run',
			sessionId: 'ui-session',
			windowId: 11,
		});
		const botResponse = agent.send('bot', 'channels', {
			runId: 'bot-run',
			sessionId: 'bot-session',
			category: 'bot',
		});
		await Promise.all([ui.started, bot.started]);

		expect(agent.cancel('ui-run', 12)).toBe(false);
		expect(ui.signal?.aborted).toBe(false);
		expect(agent.cancel('ui-run', 11)).toBe(true);
		await expect(uiResponse).resolves.toBe('');
		expect(bot.signal?.aborted).toBe(false);
		expect(mockRejectPendingToolPermissions).toHaveBeenCalledWith('ui-run');
		expect(mockRejectPendingToolPermissions).not.toHaveBeenCalledWith('bot-run');

		bot.release();
		await expect(botResponse).resolves.toBe('bot reply');
		expect(agent.cancel('ui-run', 11)).toBe(false);
	});

	it('removes a cancelled queued run before a later run for the same session', async () => {
		const agent = new Agent({} as WindowFactory);
		const activeControls = ['active-1', 'active-2', 'active-3'].map((runId) =>
			controlRun(controls, runId)
		);
		const active = activeControls.map((control, index) =>
			agent
				.send('active', 'main', {
					runId: `active-${index + 1}`,
					sessionId: `session-${index + 1}`,
					windowId: index + 1,
				})
				.then((value) => {
					control.release();
					return value;
				})
		);
		await Promise.all(activeControls.map((control) => control.started));

		controlRun(controls, 'queued');
		const queued = agent.send('queued', 'main', {
			runId: 'queued',
			sessionId: 'queued-session',
			windowId: 20,
		});
		expect(agent.cancel('queued', 20)).toBe(true);
		await expect(queued).rejects.toThrow('Run cancelled');

		const replacement = controlRun(controls, 'replacement');
		const replacementResponse = agent.send('replacement', 'main', {
			runId: 'replacement',
			sessionId: 'queued-session',
			windowId: 20,
		});
		activeControls[0].release();
		await replacement.started;
		replacement.release();
		for (const control of activeControls.slice(1)) control.release();
		await Promise.all(active);
		await expect(replacementResponse).resolves.toBe('main reply');
	});

	it('retains global cancellation only for shutdown', async () => {
		const agent = new Agent({} as WindowFactory);
		const ui = controlRun(controls, 'ui-run');
		const bot = controlRun(controls, 'bot-run');
		const runs = [
			agent.send('ui', 'main', { runId: 'ui-run', sessionId: 'ui', windowId: 1 }),
			agent.send('bot', 'channels', {
				runId: 'bot-run',
				sessionId: 'bot',
				category: 'bot',
			}),
		];
		await Promise.all([ui.started, bot.started]);

		agent.cancelAll();
		await Promise.all(runs);
		expect(ui.signal?.aborted).toBe(true);
		expect(bot.signal?.aborted).toBe(true);
		expect(mockRejectPendingToolPermissions).toHaveBeenCalledWith();
	});
});
