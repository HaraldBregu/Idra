import type { OperatorStoreState } from '../../../../src/shared/service';
import {
	HEARTBEAT_SKIP_REQUESTS_IN_FLIGHT,
	HeartbeatFileStore,
	HeartbeatRuntimeState,
	HeartbeatService,
	buildCronEventPrompt,
	buildExecEventPrompt,
	buildHeartbeatPrompt,
	computeNextHeartbeatPhaseDueMs,
	emptyHeartbeatStoreState,
	isHeartbeatContentEffectivelyEmpty,
	isHeartbeatTaskDue,
	normalizeHeartbeatReply,
	parseHeartbeatDurationMs,
	parseHeartbeatTasks,
	requestHeartbeat,
	resetHeartbeatWakeForTest,
	resolveHeartbeatAgentSummaries,
	resolveHeartbeatPhaseMs,
	resolveHeartbeatVisibility,
	resolveNextHeartbeatDueMs,
	seekNextActivePhaseDueMs,
	setHeartbeatWakeHandler,
	shouldDeferWake,
} from '../../../../src/main/heartbeat';
import type { AgentHeartbeatConfig, AgentsHeartbeatConfig, HeartbeatStoreState } from '../../../../src/shared/heartbeat';
import { makeLogger } from '../test-helpers';

function operatorConfig(overrides: Partial<OperatorStoreState> = {}): OperatorStoreState {
	return {
		rag: '',
		ocr: '',
		...overrides,
	};
}

function makeHeartbeatHarness(options: {
	service?: OperatorStoreState;
	heartbeatFile?: { missing: boolean; content?: string; path?: string };
	send?: jest.Mock<Promise<string>, [string, string?, unknown?]>;
	agents?: AgentsHeartbeatConfig;
}) {
	let heartbeatState: HeartbeatStoreState = emptyHeartbeatStoreState();
	let service = options.service ?? operatorConfig();
	let agents = options.agents;
	const eventBus = {
		emit: jest.fn(),
		broadcast: jest.fn(),
		on: jest.fn(() => jest.fn()),
	};
	const heartbeatStore = {
		getAgentsConfig: jest.fn(() => agents),
		setDefaultHeartbeatConfig: jest.fn((config) => {
			const currentAgents = agents ?? {};
			const currentDefaults = currentAgents.defaults ?? {};
			const currentHeartbeat = currentDefaults.heartbeat ?? {};
			const nextHeartbeat = { ...currentHeartbeat, ...config };
			if ('activeHours' in config && config.activeHours === undefined) {
				delete nextHeartbeat.activeHours;
			}
			agents = {
				...currentAgents,
				defaults: {
					...currentDefaults,
					heartbeat: nextHeartbeat,
				},
			};
			return nextHeartbeat;
		}),
		getHeartbeatState: jest.fn(() => heartbeatState),
		setHeartbeatState: jest.fn((next: HeartbeatStoreState) => {
			heartbeatState = next;
		}),
	};
	const channels = {
		getChannel: jest.fn(() => ({
			defaults: {},
			telegram: {
				token: '',
				allowFrom: [],
				enabled: true,
				defaultAccountId: 'default',
				defaultTarget: '123',
			},
		})),
		getChannelConfig: jest.fn(() => ({
			token: '',
			allowFrom: [],
			enabled: true,
			defaultAccountId: 'default',
			defaultTarget: '123',
		})),
	};
	const workspace = {
		readWorkspaceFile: jest.fn(async () => ({
			name: 'HEARTBEAT.md',
			path: options.heartbeatFile?.path ?? '/workspace/HEARTBEAT.md',
			missing: options.heartbeatFile?.missing ?? true,
			content: options.heartbeatFile?.content,
		})),
	};
	const send = options.send ?? jest.fn(async () => 'HEARTBEAT_OK');
	const agentService = {
		isBusy: jest.fn(() => false),
		send,
	};
	const heartbeat = new HeartbeatService({
		getOperator: jest.fn(() => service),
		heartbeatStore: heartbeatStore as never,
		channels: channels as never,
		logger: makeLogger() as never,
		eventBus: eventBus as never,
		workspace: workspace as never,
		agentService: agentService as never,
	});
	return { heartbeat, heartbeatStore, channels, workspace, eventBus, agentService, getHeartbeatState: () => heartbeatState };
}

describe('heartbeat helpers', () => {
	it('parses heartbeat intervals and treats 0m, empty, and invalid values as disabled', () => {
		expect(parseHeartbeatDurationMs('30m')).toBe(30 * 60_000);
		expect(parseHeartbeatDurationMs('1h 30m')).toBe(90 * 60_000);
		expect(parseHeartbeatDurationMs('0m')).toBeNull();
		expect(parseHeartbeatDurationMs('')).toBeNull();
		expect(parseHeartbeatDurationMs('later')).toBeNull();
	});

	it('selects only explicit per-agent heartbeat blocks when any are present', () => {
		const summaries = resolveHeartbeatAgentSummaries(
			operatorConfig({
				agents: {
					defaults: { heartbeat: { every: '15m' } },
					list: [
						{ id: 'main' },
						{ id: 'ops', heartbeat: { every: '5m', target: 'none' } },
					],
				},
			})
		);

		expect(summaries.map((summary) => summary.agentId)).toEqual(['ops']);
		expect(summaries[0]?.everyMs).toBe(5 * 60_000);
	});

	it('updates default heartbeat timing and recomputes schedules', () => {
		const { heartbeat, store } = makeHeartbeatHarness({
			service: operatorConfig({
				agents: { defaults: { heartbeat: { every: '30m', target: 'none' } } },
			}),
		});

		const timing = heartbeat.updateTiming({
			every: '10m',
			activeHours: { start: '09:00', end: '17:00', timezone: 'Europe/Rome' },
		});

		expect(timing).toEqual({
			every: '10m',
			activeHours: { start: '09:00', end: '17:00', timezone: 'Europe/Rome' },
		});
		expect(store.setDefaultHeartbeatConfig).toHaveBeenCalledWith({
			every: '10m',
			activeHours: { start: '09:00', end: '17:00', timezone: 'Europe/Rome' },
		});
		expect(heartbeat.getStatus().agentCount).toBe(1);
	});

	it('stores heartbeat runtime state through the store service adapter', () => {
		let state: HeartbeatStoreState = emptyHeartbeatStoreState();
		const store = {
			getHeartbeatState: jest.fn(() => state),
			setHeartbeatState: jest.fn((next: HeartbeatStoreState) => {
				state = next;
			}),
		};
		const runtimeState = new HeartbeatRuntimeState(
			new StoreServiceHeartbeatStateStorage(store)
		);

		runtimeState.markTasksRun('main', 'main', [{ name: 'inbox' }], 100);
		expect(store.getHeartbeatState).toHaveBeenCalled();
		expect(store.setHeartbeatState).toHaveBeenLastCalledWith({
			version: 1,
			taskState: { 'main:main:inbox': { lastRunMs: 100 } },
			lastDelivered: {},
		});
		expect(runtimeState.getTaskLastRunMs('main', 'main', 'inbox')).toBe(100);

		runtimeState.recordDeliveredText('main', 'alert', 200);
		expect(runtimeState.isDuplicateAlert('main', 'alert', 201)).toBe(true);
		expect(state.lastDelivered.main).toEqual({ text: 'alert', atMs: 200 });
	});

	it('computes stable phase scheduling and preserves nextDueMs only when identity is unchanged', () => {
		const phase = resolveHeartbeatPhaseMs({
			schedulerSeed: 'seed',
			agentId: 'main',
			intervalMs: 60_000,
		});
		expect(phase).toBe(resolveHeartbeatPhaseMs({
			schedulerSeed: 'seed',
			agentId: 'main',
			intervalMs: 60_000,
		}));
		const next = computeNextHeartbeatPhaseDueMs({ nowMs: 100_000, intervalMs: 60_000, phaseMs: phase });
		expect(resolveNextHeartbeatDueMs({
			nowMs: 100_000,
			intervalMs: 60_000,
			phaseMs: phase,
			activeHoursKey: 'a',
			prev: { intervalMs: 60_000, phaseMs: phase, nextDueMs: next + 1_000, activeHoursKey: 'a' },
		})).toBe(next + 1_000);
		expect(resolveNextHeartbeatDueMs({
			nowMs: 100_000,
			intervalMs: 60_000,
			phaseMs: phase,
			activeHoursKey: 'b',
			prev: { intervalMs: 60_000, phaseMs: phase, nextDueMs: next + 1_000, activeHoursKey: 'a' },
		})).toBe(next);
	});

	it('seeks phase-aligned slots into active hours', () => {
		const start = Date.UTC(2026, 0, 1, 1, 30);
		const due = seekNextActivePhaseDueMs({
			startMs: start,
			intervalMs: 30 * 60_000,
			activeHours: { start: '02:00', end: '03:00', timezone: 'UTC' },
		});
		expect(new Date(due).toISOString()).toBe('2026-01-01T02:00:00.000Z');
	});

	it('applies cooldown and flood guard rules by wake intent', () => {
		expect(shouldDeferWake({
			intent: 'manual',
			now: 1,
			nextDueMs: 10,
		}).defer).toBe(false);
		expect(shouldDeferWake({
			intent: 'scheduled',
			now: 1,
			nextDueMs: 10,
		})).toEqual({ defer: true, reason: 'not-due' });
		expect(shouldDeferWake({
			intent: 'event',
			now: 10_000,
			nextDueMs: 1,
			lastRunStartedAtMs: 9_000,
			minSpacingMs: 5_000,
		})).toEqual({ defer: true, reason: 'min-spacing' });
		expect(shouldDeferWake({
			intent: 'immediate',
			now: 60_000,
			nextDueMs: 1,
			recentRunStarts: [1, 2, 3, 4, 59_000],
			floodThreshold: 5,
			floodWindowMs: 60_000,
		})).toEqual({ defer: true, reason: 'flood' });
	});

	it('parses HEARTBEAT.md tasks, due checks, and effective empty files', () => {
		const content = [
			'# Heartbeat',
			'tasks:',
			'  - name: inbox-triage',
			'    interval: 30m',
			'    prompt: "Check urgent unread messages."',
		].join('\n');
		expect(parseHeartbeatTasks(content)).toEqual([
			{ name: 'inbox-triage', interval: '30m', prompt: 'Check urgent unread messages.' },
		]);
		expect(isHeartbeatTaskDue(undefined, '30m', 100)).toBe(true);
		expect(isHeartbeatTaskDue(0, '30m', 29 * 60_000)).toBe(false);
		expect(isHeartbeatTaskDue(0, '30m', 30 * 60_000)).toBe(true);
		expect(isHeartbeatContentEffectivelyEmpty('# HEARTBEAT.md\n\n- [ ]\n```')).toBe(true);
		expect(isHeartbeatContentEffectivelyEmpty('Check the inbox')).toBe(false);
	});

	it('builds event prompts and heartbeat task prompts without reusing old output', () => {
		expect(buildExecEventPrompt(['exec completed (abc, code 0) :: done'], true)).toContain('done');
		expect(buildExecEventPrompt(['exec completed (abc, code 0)'], true)).toContain('Reply HEARTBEAT_OK only');
		expect(buildCronEventPrompt(['Reminder: review draft'], true)).toContain('Reminder: review draft');
		const prompt = buildHeartbeatPrompt({
			basePrompt: 'Read HEARTBEAT.md. If nothing needs attention, reply HEARTBEAT_OK.',
			heartbeatPath: '/workspace/HEARTBEAT.md',
			heartbeatContent: 'tasks:\n  - name: inbox\n    interval: 30m\n    prompt: "Check inbox."\n\nUse short alerts.',
			dueTasks: [{ name: 'inbox', interval: '30m', prompt: 'Check inbox.' }],
			deliverToUser: true,
			now: new Date('2026-05-18T12:00:00.000Z'),
		});
		expect(prompt).toContain('Only these HEARTBEAT.md tasks are due now');
		expect(prompt).toContain('Use short alerts.');
		expect(prompt).toContain('/workspace/HEARTBEAT.md');
	});

	it('normalizes structured and text heartbeat replies', () => {
		expect(normalizeHeartbeatReply({
			toolResponse: { outcome: 'no_change', notify: false, summary: 'nothing' },
			ackMaxChars: 300,
		})).toMatchObject({ kind: 'ok', status: 'ok-token' });
		expect(normalizeHeartbeatReply({
			toolResponse: {
				outcome: 'needs_attention',
				notify: true,
				summary: 'summary',
				notificationText: 'alert',
			},
			ackMaxChars: 300,
		})).toMatchObject({ kind: 'alert', text: 'alert' });
		expect(normalizeHeartbeatReply({ text: 'HEARTBEAT_OK small note', ackMaxChars: 20 })).toMatchObject({ kind: 'ok' });
		expect(normalizeHeartbeatReply({ text: 'Important HEARTBEAT_OK detail', ackMaxChars: 300 })).toMatchObject({ kind: 'alert' });
		expect(normalizeHeartbeatReply({ text: `HEARTBEAT_OK ${'x'.repeat(20)}`, ackMaxChars: 5 })).toMatchObject({ kind: 'alert' });
	});

	it('resolves visibility by account, channel, defaults, and built-in fallback', () => {
		expect(resolveHeartbeatVisibility({
			channel: {
				defaults: { heartbeat: { showOk: true, showAlerts: false, useIndicator: false } },
				telegram: {
					token: '',
					allowFrom: [],
					accounts: { default: { heartbeat: { showAlerts: true } } },
				},
			} as never,
			channelId: 'telegram',
			accountId: 'default',
		})).toEqual({ showOk: true, showAlerts: true, useIndicator: false });
	});
});

describe('heartbeat wake queue', () => {
	beforeEach(() => {
		jest.useFakeTimers();
		resetHeartbeatWakeForTest();
	});

	afterEach(() => {
		resetHeartbeatWakeForTest();
		jest.useRealTimers();
	});

	it('coalesces targeted wakes and keeps the highest-priority reason and target override', async () => {
		const calls: unknown[] = [];
		setHeartbeatWakeHandler(async (wake) => {
			calls.push(wake);
			return { status: 'ran', durationMs: 1 };
		});

		requestHeartbeat({
			source: 'interval',
			intent: 'scheduled',
			reason: 'interval',
			agentId: 'main',
			sessionKey: 'main',
			heartbeat: { target: 'none' },
			coalesceMs: 10,
		});
		requestHeartbeat({
			source: 'manual',
			intent: 'manual',
			reason: 'manual wake',
			agentId: 'main',
			sessionKey: 'main',
			heartbeat: { target: 'telegram' },
			coalesceMs: 10,
		});

		await jest.advanceTimersByTimeAsync(20);
		expect(calls).toEqual([
			expect.objectContaining({
				source: 'manual',
				intent: 'manual',
				reason: 'manual wake',
				heartbeat: { target: 'telegram' },
			}),
		]);
	});

	it('retries retryable busy skips', async () => {
		const calls: unknown[] = [];
		setHeartbeatWakeHandler(async (wake) => {
			calls.push(wake);
			return calls.length === 1
				? { status: 'skipped', reason: HEARTBEAT_SKIP_REQUESTS_IN_FLIGHT }
				: { status: 'ran', durationMs: 1 };
		});

		requestHeartbeat({
			source: 'manual',
			intent: 'manual',
			agentId: 'main',
			coalesceMs: 0,
		});

		await jest.advanceTimersByTimeAsync(1);
		await jest.advanceTimersByTimeAsync(1_000);
		expect(calls).toHaveLength(2);
		expect(calls[1]).toEqual(expect.objectContaining({ source: 'retry' }));
	});
});

describe('HeartbeatService', () => {
	it('runs when HEARTBEAT.md is missing and suppresses OK-only replies', async () => {
		const { heartbeat, agentService, eventBus } = makeHeartbeatHarness({
			service: operatorConfig({ agents: { defaults: { heartbeat: { every: '1m', target: 'none' } } } }),
			heartbeatFile: { missing: true },
		});

		await expect(heartbeat.runHeartbeatOnce({ source: 'manual', intent: 'manual' })).resolves.toMatchObject({ status: 'ran' });
		expect(agentService.send).toHaveBeenCalled();
		expect(eventBus.emit).toHaveBeenCalledWith('heartbeat:event', expect.objectContaining({ status: 'ok-token', silent: true }));
	});

	it('skips effectively empty HEARTBEAT.md files before model calls', async () => {
		const { heartbeat, agentService } = makeHeartbeatHarness({
			service: operatorConfig({ agents: { defaults: { heartbeat: { every: '1m', target: 'none' } } } }),
			heartbeatFile: { missing: false, content: '# HEARTBEAT.md\n\n- [ ]' },
		});

		await expect(heartbeat.runHeartbeatOnce({ source: 'manual', intent: 'manual' })).resolves.toEqual({
			status: 'skipped',
			reason: 'empty-heartbeat-file',
		});
		expect(agentService.send).not.toHaveBeenCalled();
	});

	it('updates due task timestamps after successful heartbeat runs', async () => {
		const { heartbeat, getHeartbeatState } = makeHeartbeatHarness({
			service: operatorConfig({ agents: { defaults: { heartbeat: { every: '1m', target: 'none' } } } }),
			heartbeatFile: {
				missing: false,
				content: 'tasks:\n  - name: inbox\n    interval: 30m\n    prompt: "Check inbox."',
			},
		});

		await expect(heartbeat.runHeartbeatOnce({ source: 'manual', intent: 'manual' })).resolves.toMatchObject({ status: 'ran' });
		expect(Object.keys(getHeartbeatState().taskState)).toEqual(['main:main:inbox']);
	});
});
