import type { Disposable } from '../core/service-container';
import type { AppEvent, EventBus } from '../core/event-bus';
import type { LoggerService } from '../logger';
import type { StoreService } from '../store';
import type { AgentStartupFilesServicePort } from '../agent/startup-files';
import type { WorkspaceService } from '../workspace';
import type { ChannelRegistry } from '../channels';
import { normalizeChannelId } from '../channels';
import type { ChannelChatType, ChannelOutboundMessage } from '../channels/types';
import type { AgentService } from '../service';
import { DEFAULT_AGENT_ID } from '../constants';
import type {
	HeartbeatEventPayload,
	HeartbeatRunResult,
	HeartbeatStatus,
	HeartbeatStoreState,
	HeartbeatSystemEventRequest,
	HeartbeatSystemEventResult,
	HeartbeatTimingSettings,
	HeartbeatWakeOverride,
	HeartbeatWakeRequest,
} from '../../shared/heartbeat';
import { HEARTBEAT_OK } from '../../shared/heartbeat';
import type { ChannelType } from '../../shared/channels';
import { activeHoursIdentity, isWithinActiveHours } from './active-hours';
import {
	DEFAULT_HEARTBEAT_EVERY,
	resolveDefaultHeartbeatAgentId,
	resolveHeartbeatAgentSummaries,
	resolveHeartbeatSummaryForAgent,
	type HeartbeatSummary,
} from './config';
import { recordRunStart, shouldDeferWake } from './cooldown';
import {
	buildHeartbeatPrompt,
	isCronSystemEvent,
	isExecCompletionEvent,
	isHeartbeatContentEffectivelyEmpty,
	isHeartbeatTaskDue,
	parseHeartbeatTasks,
} from './prompt';
import {
	computeNextHeartbeatPhaseDueMs,
	resolveHeartbeatPhaseMs,
	resolveHeartbeatSchedulerSeed,
	resolveNextHeartbeatDueMs,
	safeHeartbeatTimeoutDelay,
	seekNextActivePhaseDueMs,
} from './schedule';
import {
	areHeartbeatsEnabled,
	HEARTBEAT_SKIP_REQUESTS_IN_FLIGHT,
	requestHeartbeat,
	setHeartbeatsEnabled,
	setHeartbeatWakeHandler,
} from './wake';
import { normalizeHeartbeatReply, type HeartbeatToolResponse } from './response';
import { resolveHeartbeatVisibility } from './visibility';

export interface HeartbeatServiceDependencies {
	store: StoreService;
	logger: LoggerService;
	eventBus: EventBus;
	startupFiles: AgentStartupFilesServicePort;
	workspace?: Pick<WorkspaceService, 'readWorkspaceFile'>;
	agentService?: AgentService;
	channelRegistry?: ChannelRegistry;
}

interface AgentSchedule {
	agentId: string;
	summary: HeartbeatSummary;
	intervalMs: number;
	phaseMs: number;
	nextDueMs: number;
	activeHoursKey: string;
	lastRunStartedAtMs?: number;
	recentRunStarts: number[];
	floodLogged: boolean;
}

interface QueuedSystemEvent {
	id: string;
	text: string;
	createdAtMs: number;
	source: HeartbeatWakeRequest['source'];
}

interface DeliveryRoute {
	channel: ChannelType;
	accountId?: string;
	to: string;
	threadId?: string;
	replyToMessageId?: string;
	chatType?: ChannelChatType;
	sessionKey?: string;
}

type DeliveryResolution =
	| { status: 'none' }
	| { status: 'skip'; reason: string; channel?: string; target?: string; accountId?: string }
	| {
			status: 'ok';
			message: Omit<ChannelOutboundMessage, 'text' | 'idempotencyKey'>;
			chatType?: ChannelChatType;
	  };

export class HeartbeatService implements Disposable {
	private readonly schedulerSeed = resolveHeartbeatSchedulerSeed();
	private schedules = new Map<string, AgentSchedule>();
	private timer: NodeJS.Timeout | null = null;
	private wakeDisposer: (() => void) | null = null;
	private routeDisposer: (() => void) | null = null;
	private runtimeEnabled = true;
	private started = false;
	private lastHeartbeat: HeartbeatEventPayload | null = null;
	private systemEvents = new Map<string, QueuedSystemEvent[]>();
	private lastRoute: DeliveryRoute | null = null;
	private routesBySession = new Map<string, DeliveryRoute>();

	constructor(private readonly dependencies: HeartbeatServiceDependencies) {}

	start(): void {
		if (this.started) return;
		this.started = true;
		this.updateConfig();
		this.wakeDisposer = setHeartbeatWakeHandler((wake) => this.runHeartbeatOnce(wake));
		this.routeDisposer = this.dependencies.eventBus.on('channel:route', (event: AppEvent) => {
			this.recordDeliveryRoute(event.payload as DeliveryRoute);
		});
		this.armTimer();
	}

	stop(): void {
		if (this.timer) clearTimeout(this.timer);
		this.timer = null;
		this.wakeDisposer?.();
		this.wakeDisposer = null;
		this.routeDisposer?.();
		this.routeDisposer = null;
		this.started = false;
	}

	destroy(): void {
		this.stop();
	}

	updateConfig(): void {
		const now = Date.now();
		const service = this.dependencies.store.getService();
		const summaries = resolveHeartbeatAgentSummaries(service);
		const next = new Map<string, AgentSchedule>();
		for (const summary of summaries) {
			if (!summary.enabled || !summary.everyMs) continue;
			const previous = this.schedules.get(summary.agentId);
			const phaseMs = resolveHeartbeatPhaseMs({
				schedulerSeed: this.schedulerSeed,
				agentId: summary.agentId,
				intervalMs: summary.everyMs,
			});
			const activeHoursKey = activeHoursIdentity(summary.activeHours);
			const rawNextDueMs = resolveNextHeartbeatDueMs({
				nowMs: now,
				intervalMs: summary.everyMs,
				phaseMs,
				activeHoursKey,
				prev: previous
					? {
							intervalMs: previous.intervalMs,
							phaseMs: previous.phaseMs,
							nextDueMs: previous.nextDueMs,
							activeHoursKey: previous.activeHoursKey,
					  }
					: undefined,
			});
			next.set(summary.agentId, {
				agentId: summary.agentId,
				summary,
				intervalMs: summary.everyMs,
				phaseMs,
				activeHoursKey,
				nextDueMs: seekNextActivePhaseDueMs({
					startMs: rawNextDueMs,
					intervalMs: summary.everyMs,
					activeHours: summary.activeHours,
				}),
				lastRunStartedAtMs: previous?.lastRunStartedAtMs,
				recentRunStarts: previous?.recentRunStarts ?? [],
				floodLogged: previous?.floodLogged ?? false,
			});
		}
		this.schedules = next;
		this.armTimer();
	}

	getStatus(): HeartbeatStatus {
		const nextDueMs = [...this.schedules.values()]
			.map((schedule) => schedule.nextDueMs)
			.sort((a, b) => a - b)[0];
		return {
			enabled: this.runtimeEnabled,
			runnerActive: this.started,
			agentCount: this.schedules.size,
			nextDueMs,
			lastHeartbeat: this.lastHeartbeat,
		};
	}

	getLastHeartbeat(): HeartbeatEventPayload | null {
		return this.lastHeartbeat;
	}

	setEnabled(enabled: boolean): HeartbeatStatus {
		this.runtimeEnabled = enabled;
		setHeartbeatsEnabled(enabled);
		if (enabled) {
			this.updateConfig();
		} else if (this.timer) {
			clearTimeout(this.timer);
			this.timer = null;
		}
		return this.getStatus();
	}

	getTiming(): HeartbeatTimingSettings {
		const heartbeat = this.dependencies.store.getService()?.agents?.defaults?.heartbeat;
		return {
			every: typeof heartbeat?.every === 'string' && heartbeat.every.trim()
				? heartbeat.every.trim()
				: DEFAULT_HEARTBEAT_EVERY,
			...(heartbeat?.activeHours ? { activeHours: heartbeat.activeHours } : {}),
		};
	}

	updateTiming(request: HeartbeatTimingSettings): HeartbeatTimingSettings {
		const every = typeof request.every === 'string' ? request.every.trim() : '';
		if (!every) throw new Error('Heartbeat cadence is required.');
		this.dependencies.store.setDefaultHeartbeatConfig({
			every,
			activeHours: this.normalizeActiveHours(request.activeHours),
		});
		this.updateConfig();
		return this.getTiming();
	}

	request(wake: HeartbeatWakeRequest): void {
		requestHeartbeat(wake);
	}

	async systemEvent(request: HeartbeatSystemEventRequest): Promise<HeartbeatSystemEventResult> {
		const text = request.text?.trim();
		if (!text) throw new Error('system-event text is required.');
		const service = this.dependencies.store.getService();
		const agentId = request.agentId?.trim() || resolveDefaultHeartbeatAgentId(service);
		const sessionKey = request.sessionKey?.trim() || agentId;
		const mode = request.mode ?? 'next-heartbeat';
		this.enqueueSystemEvent(sessionKey, {
			id: `${Date.now()}:${Math.random().toString(16).slice(2)}`,
			text,
			createdAtMs: Date.now(),
			source: 'cron',
		});
		this.dependencies.eventBus.broadcast('heartbeat:system-event', {
			text,
			agentId,
			sessionKey,
			mode,
		});
		if (mode === 'now' || request.sessionKey) {
			requestHeartbeat({
				source: 'cron',
				intent: mode === 'now' ? 'immediate' : 'event',
				reason: 'system-event',
				agentId,
				sessionKey,
				heartbeat: request.heartbeat,
			});
		}
		return { queued: true, sessionKey, mode };
	}

	async runHeartbeatOnce(wake: HeartbeatWakeRequest): Promise<HeartbeatRunResult> {
		const startedAt = Date.now();
		const service = this.dependencies.store.getService();
		const agentId = wake.agentId?.trim() || resolveDefaultHeartbeatAgentId(service);
		const summary = this.mergeWakeOverride(resolveHeartbeatSummaryForAgent(service, agentId), wake.heartbeat);
		const schedule = this.ensureSchedule(summary);
		const baseSessionKey = this.resolveBaseSessionKey(summary, wake.sessionKey);
		const actualSessionKey = summary.isolatedSession
			? this.createIsolatedSessionKey(baseSessionKey)
			: baseSessionKey;

		if (!this.runtimeEnabled || !areHeartbeatsEnabled()) {
			this.emitHeartbeat({ status: 'skipped', reason: 'runtime-disabled', silent: true });
			return { status: 'skipped', reason: 'runtime-disabled' };
		}
		if (!summary.enabled) return this.skipAndAdvance(schedule, 'agent-disabled');
		if (!summary.everyMs) return this.skipAndAdvance(schedule, 'interval-disabled');
		if (!this.isSafeSessionKey(agentId, baseSessionKey)) return this.skipAndAdvance(schedule, 'subagent-session');
		if (!isWithinActiveHours(summary.activeHours, startedAt)) {
			return this.skipAndAdvance(schedule, 'outside-active-hours');
		}

		const defer = shouldDeferWake({
			intent: wake.intent,
			source: wake.source,
			reason: wake.reason,
			now: startedAt,
			nextDueMs: schedule.nextDueMs,
			lastRunStartedAtMs: schedule.lastRunStartedAtMs,
			recentRunStarts: schedule.recentRunStarts,
		});
		if (defer.defer) {
			if (defer.reason === 'flood' && !schedule.floodLogged) {
				schedule.floodLogged = true;
				this.dependencies.logger.warn('HeartbeatService', 'Heartbeat flood guard deferred a wake.', {
					agentId,
					source: wake.source,
				});
			}
			return { status: 'skipped', reason: defer.reason };
		}

		if (this.dependencies.agentService?.isBusy(agentId)) {
			return { status: 'skipped', reason: HEARTBEAT_SKIP_REQUESTS_IN_FLIGHT };
		}
		if (actualSessionKey !== agentId && this.dependencies.agentService?.isBusy(actualSessionKey)) {
			return { status: 'skipped', reason: HEARTBEAT_SKIP_REQUESTS_IN_FLIGHT };
		}

		const delivery = this.resolveDelivery(summary, baseSessionKey);
		if (delivery.status === 'skip') {
			return this.skipAndAdvance(schedule, delivery.reason, {
				channel: delivery.channel,
				target: delivery.target,
				accountId: delivery.accountId,
			});
		}
		const deliverToUser = delivery.status === 'ok';
		const visibility =
			delivery.status === 'ok'
				? resolveHeartbeatVisibility({
						channel: this.dependencies.store.getChannel(),
						channelId: delivery.message.type,
						accountId: delivery.message.accountId,
				  })
				: { showOk: false, showAlerts: false, useIndicator: true };
		if (delivery.status === 'ok' && !visibility.showOk && !visibility.showAlerts && !visibility.useIndicator) {
			return this.skipAndAdvance(schedule, 'alerts-disabled', {
				channel: delivery.message.type,
				target: delivery.message.to,
				accountId: delivery.message.accountId,
			});
		}

		const heartbeatFile = await this.readHeartbeatFile(agentId);
		const pendingEvents = this.inspectPendingEvents(baseSessionKey, wake);
		const hasPromptEvents = pendingEvents.exec.length > 0 || pendingEvents.cron.length > 0;
		if (
			heartbeatFile.exists &&
			!this.bypassesFileGates(wake) &&
			!hasPromptEvents &&
			isHeartbeatContentEffectivelyEmpty(heartbeatFile.content)
		) {
			return this.skipAndAdvance(schedule, 'empty-heartbeat-file');
		}

		const tasks = parseHeartbeatTasks(heartbeatFile.content ?? '');
		const dueTasks = tasks.filter((task) =>
			isHeartbeatTaskDue(
				this.getHeartbeatState().taskState[this.taskStateKey(agentId, baseSessionKey, task.name)]?.lastRunMs,
				task.interval,
				startedAt
			)
		);
		if (tasks.length > 0 && dueTasks.length === 0 && !hasPromptEvents) {
			return this.skipAndAdvance(schedule, 'no-tasks-due');
		}

		const prompt = buildHeartbeatPrompt({
			basePrompt: summary.prompt,
			heartbeatPath: heartbeatFile.path,
			heartbeatContent: heartbeatFile.exists ? heartbeatFile.content : undefined,
			dueTasks,
			execEvents: pendingEvents.exec,
			cronEvents: pendingEvents.cron,
			deliverToUser,
			useResponseTool: true,
			now: new Date(startedAt),
		});

		let toolResponse: HeartbeatToolResponse | undefined;
		schedule.lastRunStartedAtMs = startedAt;
		recordRunStart(schedule.recentRunStarts, startedAt);
		schedule.floodLogged = false;

		const typingTarget = delivery.status === 'ok' ? delivery.message.to : undefined;
		const typingPlugin = delivery.status === 'ok' ? this.dependencies.channelRegistry?.getPlugin(delivery.message.type) : undefined;
		if (typingTarget && typingPlugin?.heartbeat?.sendTyping) {
			await Promise.resolve(typingPlugin.heartbeat.sendTyping(typingTarget)).catch(() => undefined);
		}

		try {
			if (!this.dependencies.agentService) return this.skipAndAdvance(schedule, 'no-agent-service');
			const text = await this.dependencies.agentService.send(prompt, agentId, {
				sessionId: actualSessionKey,
				heartbeat: {
					model: summary.model,
					timeoutSeconds: summary.timeoutSeconds,
					lightContext: summary.lightContext,
					suppressToolErrorWarnings: summary.suppressToolErrorWarnings,
					enableHeartbeatTool: true,
					forceHeartbeatTool: true,
					suppressAgentEvents: true,
					onToolResponse: (response) => {
						toolResponse = response;
					},
				},
			});
			const normalized = normalizeHeartbeatReply({
				text,
				toolResponse,
				ackMaxChars: summary.ackMaxChars,
			});
			let sent = false;
			let silent = normalized.kind === 'ok';
			if (delivery.status === 'ok') {
				if (normalized.kind === 'alert' && visibility.showAlerts) {
					if (!this.isDuplicateAlert(baseSessionKey, normalized.text, startedAt)) {
						await this.dependencies.channelRegistry?.send({
							...delivery.message,
							text: normalized.text,
							idempotencyKey: `heartbeat:${agentId}:${startedAt}`,
						});
						this.recordDeliveredText(baseSessionKey, normalized.text, startedAt);
						sent = true;
						silent = false;
					} else {
						silent = true;
					}
				} else if (normalized.kind === 'ok' && visibility.showOk) {
					await this.dependencies.channelRegistry?.send({
						...delivery.message,
						text: HEARTBEAT_OK,
						idempotencyKey: `heartbeat:${agentId}:${startedAt}:ok`,
					});
					sent = true;
					silent = false;
				}
			}
			this.consumePendingEvents(baseSessionKey, pendingEvents.ids);
			this.markDueTasks(agentId, baseSessionKey, dueTasks, Date.now());
			this.advanceSchedule(schedule, Date.now());
			const durationMs = Date.now() - startedAt;
			this.emitHeartbeat({
				status: normalized.status,
				channel: delivery.status === 'ok' ? delivery.message.type : undefined,
				target: delivery.status === 'ok' ? delivery.message.to : undefined,
				accountId: delivery.status === 'ok' ? delivery.message.accountId : undefined,
				preview: normalized.kind === 'alert' ? normalized.text.slice(0, 300) : undefined,
				durationMs,
				silent: !sent || silent,
				indicatorType:
					normalized.kind === 'alert' && visibility.useIndicator
						? 'alert'
						: normalized.kind === 'ok' && visibility.useIndicator
							? 'ok'
							: undefined,
			});
			return { status: 'ran', durationMs };
		} catch (error) {
			this.advanceSchedule(schedule, Date.now());
			this.emitHeartbeat({
				status: 'failed',
				reason: error instanceof Error ? error.message : String(error),
				durationMs: Date.now() - startedAt,
				indicatorType: 'error',
			});
			this.dependencies.logger.error('HeartbeatService', 'Heartbeat run failed', error);
			return { status: 'failed', reason: error instanceof Error ? error.message : String(error) };
		} finally {
			if (typingTarget && typingPlugin?.heartbeat?.clearTyping) {
				await Promise.resolve(typingPlugin.heartbeat.clearTyping(typingTarget)).catch(() => undefined);
			}
			this.armTimer();
		}
	}

	private ensureSchedule(summary: HeartbeatSummary): AgentSchedule {
		const existing = this.schedules.get(summary.agentId);
		if (existing) {
			existing.summary = summary;
			return existing;
		}
		const intervalMs = summary.everyMs ?? 1;
		const phaseMs = resolveHeartbeatPhaseMs({
			schedulerSeed: this.schedulerSeed,
			agentId: summary.agentId,
			intervalMs,
		});
		const rawNextDueMs = computeNextHeartbeatPhaseDueMs({
			nowMs: Date.now(),
			intervalMs,
			phaseMs,
		});
		const schedule: AgentSchedule = {
			agentId: summary.agentId,
			summary,
			intervalMs,
			phaseMs,
			activeHoursKey: activeHoursIdentity(summary.activeHours),
			nextDueMs: seekNextActivePhaseDueMs({
				startMs: rawNextDueMs,
				intervalMs,
				activeHours: summary.activeHours,
			}),
			recentRunStarts: [],
			floodLogged: false,
		};
		this.schedules.set(summary.agentId, schedule);
		return schedule;
	}

	private armTimer(): void {
		if (!this.started || !this.runtimeEnabled) return;
		if (this.timer) clearTimeout(this.timer);
		const nextDue = [...this.schedules.values()].map((schedule) => schedule.nextDueMs).sort((a, b) => a - b)[0];
		if (nextDue === undefined) return;
		this.timer = setTimeout(() => {
			this.timer = null;
			const now = Date.now();
			for (const schedule of this.schedules.values()) {
				if (schedule.nextDueMs <= now) {
					requestHeartbeat({
						source: 'interval',
						intent: 'scheduled',
						reason: 'interval',
						agentId: schedule.agentId,
					});
				}
			}
			this.armTimer();
		}, safeHeartbeatTimeoutDelay(nextDue));
		this.timer.unref?.();
	}

	private skipAndAdvance(
		schedule: AgentSchedule,
		reason: string,
		meta: { channel?: string; target?: string; accountId?: string } = {}
	): HeartbeatRunResult {
		this.advanceSchedule(schedule, Date.now());
		this.emitHeartbeat({
			status: 'skipped',
			reason,
			silent: true,
			channel: meta.channel,
			target: meta.target,
			accountId: meta.accountId,
		});
		return { status: 'skipped', reason };
	}

	private advanceSchedule(schedule: AgentSchedule, nowMs: number): void {
		const rawNext = computeNextHeartbeatPhaseDueMs({
			nowMs,
			intervalMs: schedule.intervalMs,
			phaseMs: schedule.phaseMs,
		});
		schedule.nextDueMs = seekNextActivePhaseDueMs({
			startMs: rawNext,
			intervalMs: schedule.intervalMs,
			activeHours: schedule.summary.activeHours,
		});
	}

	private mergeWakeOverride(summary: HeartbeatSummary, override?: HeartbeatWakeOverride): HeartbeatSummary {
		if (!override) return summary;
		return {
			...summary,
			target: override.target?.trim() || summary.target,
			to: override.to?.trim() || summary.to,
			accountId: override.accountId?.trim() || summary.accountId,
		};
	}

	private resolveBaseSessionKey(summary: HeartbeatSummary, forcedSessionKey?: string): string {
		if (forcedSessionKey?.trim()) return forcedSessionKey.trim();
		if (!summary.session || summary.session === 'main') return summary.agentId;
		if (summary.session === 'global') return DEFAULT_AGENT_ID;
		return summary.session;
	}

	private createIsolatedSessionKey(baseSessionKey: string): string {
		const base = baseSessionKey.replace(/(?::heartbeat)+$/g, '');
		return `${base}:heartbeat:${Date.now()}`;
	}

	private isSafeSessionKey(agentId: string, sessionKey: string): boolean {
		if (!sessionKey.trim()) return false;
		if (sessionKey.includes('/') || sessionKey.includes('\\')) return false;
		if (sessionKey.startsWith('subagent:') || sessionKey.includes(':subagent:')) return false;
		if (sessionKey.startsWith('cron:')) return false;
		return sessionKey === agentId || !sessionKey.startsWith('agent:') || sessionKey.startsWith(`agent:${agentId}:`);
	}

	private normalizeActiveHours(
		activeHours: HeartbeatTimingSettings['activeHours']
	): HeartbeatTimingSettings['activeHours'] {
		const start = activeHours?.start?.trim();
		const end = activeHours?.end?.trim();
		const timezone = activeHours?.timezone?.trim();
		if (!start && !end && !timezone) return undefined;
		return {
			...(start ? { start } : {}),
			...(end ? { end } : {}),
			...(timezone ? { timezone } : {}),
		};
	}

	private async readHeartbeatFile(agentId: string): Promise<{
		exists: boolean;
		path?: string;
		content?: string;
	}> {
		try {
			const file = this.dependencies.workspace
				? await this.dependencies.workspace.readWorkspaceFile('HEARTBEAT.md')
				: await this.dependencies.startupFiles.readFile(agentId, 'HEARTBEAT.md');
			return {
				exists: !file.missing,
				path: file.path,
				content: file.content,
			};
		} catch {
			return { exists: false };
		}
	}

	private bypassesFileGates(wake: HeartbeatWakeRequest): boolean {
		return (
			wake.source === 'exec-event' ||
			wake.source === 'cron' ||
			wake.source === 'hook' ||
			wake.source === 'background-task' ||
			wake.source === 'background-task-blocked' ||
			wake.source === 'acp-spawn' ||
			wake.source === 'restart-sentinel'
		);
	}

	private enqueueSystemEvent(sessionKey: string, event: QueuedSystemEvent): void {
		const current = this.systemEvents.get(sessionKey) ?? [];
		current.push(event);
		this.systemEvents.set(sessionKey, current.slice(-50));
	}

	private inspectPendingEvents(sessionKey: string, wake: HeartbeatWakeRequest): {
		ids: string[];
		exec: string[];
		cron: string[];
	} {
		const shouldInspect =
			wake.intent !== 'scheduled' ||
			wake.source === 'cron' ||
			wake.source === 'exec-event' ||
			wake.source === 'notifications-event';
		if (!shouldInspect) return { ids: [], exec: [], cron: [] };
		const events = this.systemEvents.get(sessionKey) ?? [];
		const ids: string[] = [];
		const exec: string[] = [];
		const cron: string[] = [];
		for (const event of events) {
			if (isExecCompletionEvent(event.text)) {
				exec.push(event.text);
				ids.push(event.id);
			} else if (isCronSystemEvent(event.text)) {
				cron.push(event.text);
				ids.push(event.id);
			}
		}
		return { ids, exec, cron };
	}

	private consumePendingEvents(sessionKey: string, ids: string[]): void {
		if (ids.length === 0) return;
		const remove = new Set(ids);
		const remaining = (this.systemEvents.get(sessionKey) ?? []).filter((event) => !remove.has(event.id));
		if (remaining.length > 0) this.systemEvents.set(sessionKey, remaining);
		else this.systemEvents.delete(sessionKey);
	}

	private taskStateKey(agentId: string, sessionKey: string, taskName: string): string {
		return `${agentId}:${sessionKey}:${taskName}`;
	}

	private getHeartbeatState(): HeartbeatStoreState {
		return this.dependencies.store.getHeartbeatState();
	}

	private saveHeartbeatState(state: HeartbeatStoreState): void {
		this.dependencies.store.setHeartbeatState(state);
	}

	private markDueTasks(
		agentId: string,
		sessionKey: string,
		tasks: Array<{ name: string }>,
		nowMs: number
	): void {
		if (tasks.length === 0) return;
		const state = this.getHeartbeatState();
		for (const task of tasks) {
			state.taskState[this.taskStateKey(agentId, sessionKey, task.name)] = { lastRunMs: nowMs };
		}
		this.saveHeartbeatState(state);
	}

	private recordDeliveredText(sessionKey: string, text: string, atMs: number): void {
		const state = this.getHeartbeatState();
		state.lastDelivered[sessionKey] = { text, atMs };
		this.saveHeartbeatState(state);
	}

	private isDuplicateAlert(sessionKey: string, text: string, nowMs: number): boolean {
		const previous = this.getHeartbeatState().lastDelivered[sessionKey];
		return Boolean(previous && previous.text === text && nowMs - previous.atMs < 24 * 60 * 60_000);
	}

	private resolveDelivery(summary: HeartbeatSummary, sessionKey: string): DeliveryResolution {
		if (summary.target === 'none') return { status: 'none' };
		if (!this.dependencies.channelRegistry) return { status: 'skip', reason: 'no-target' };
		if (summary.target === 'last') {
			const route = this.routesBySession.get(sessionKey) ?? this.lastRoute;
			if (!route) return { status: 'skip', reason: 'no-target' };
			const accountId = summary.accountId ?? route.accountId;
			const to = summary.to ?? route.to;
			if (summary.directPolicy === 'block' && route.chatType === 'dm') {
				return { status: 'skip', reason: 'dm-blocked', channel: route.channel, target: to, accountId };
			}
			return {
				status: 'ok',
				chatType: route.chatType,
				message: {
					type: route.channel,
					accountId,
					to,
					threadId: route.threadId,
					replyToMessageId: route.replyToMessageId,
				},
			};
		}

		const explicit = this.parseExplicitTarget(summary.target);
		const channelId = explicit?.channelId ?? normalizeChannelId(summary.target);
		if (!channelId) return { status: 'skip', reason: 'no-target' };
		const plugin = this.dependencies.channelRegistry.getPlugin(channelId);
		if (!plugin) return { status: 'skip', reason: 'no-target', channel: channelId };
		const channelConfig = this.dependencies.store.getChannel()[channelId];
		const accountId = summary.accountId ?? explicit?.accountId ?? plugin.config.defaultAccountId(channelConfig) ?? 'default';
		const account = plugin.config.resolveAccount(channelConfig, accountId);
		if (!account) return { status: 'skip', reason: 'unknown-account', channel: channelId, accountId };
		const to =
			summary.to ??
			(explicit && plugin.messaging ? plugin.messaging.resolveDeliveryTarget(explicit) : undefined) ??
			plugin.config.resolveDefaultTo(channelConfig, accountId) ??
			undefined;
		if (!to) return { status: 'skip', reason: 'no-target', channel: channelId, accountId };
		const chatType = explicit?.chatType ?? plugin.messaging?.inferTargetChatType(to);
		if (summary.directPolicy === 'block' && chatType === 'dm') {
			return { status: 'skip', reason: 'dm-blocked', channel: channelId, target: to, accountId };
		}
		return {
			status: 'ok',
			chatType,
			message: {
				type: channelId,
				accountId,
				to,
				threadId: explicit?.threadId,
			},
		};
	}

	private parseExplicitTarget(target: string) {
		for (const plugin of this.dependencies.channelRegistry?.listPlugins() ?? []) {
			const parsed = plugin.messaging?.parseExplicitTarget(target);
			if (parsed) return parsed;
		}
		return null;
	}

	private recordDeliveryRoute(route: DeliveryRoute): void {
		if (!route?.channel || !route.to) return;
		this.lastRoute = route;
		if (route.sessionKey) this.routesBySession.set(route.sessionKey, route);
	}

	private emitHeartbeat(event: Omit<HeartbeatEventPayload, 'timestamp'>): void {
		const payload: HeartbeatEventPayload = {
			timestamp: Date.now(),
			...event,
		};
		this.lastHeartbeat = payload;
		this.dependencies.eventBus.emit('heartbeat:event', payload);
		this.dependencies.eventBus.broadcast('heartbeat:event', payload);
	}
}

export class NoopHeartbeatService implements Disposable {
	start(): void {}
	stop(): void {}
	destroy(): void {}
	updateConfig(): void {}
	getStatus(): HeartbeatStatus {
		return { enabled: false, runnerActive: false, agentCount: 0, lastHeartbeat: null };
	}
	getLastHeartbeat(): HeartbeatEventPayload | null {
		return null;
	}
	setEnabled(): HeartbeatStatus {
		return this.getStatus();
	}
	request(): void {}
	async systemEvent(request: HeartbeatSystemEventRequest): Promise<HeartbeatSystemEventResult> {
		if (!request.text?.trim()) throw new Error('system-event text is required.');
		return {
			queued: true,
			sessionKey: request.sessionKey ?? DEFAULT_AGENT_ID,
			mode: request.mode ?? 'next-heartbeat',
		};
	}
	async runHeartbeatOnce(): Promise<HeartbeatRunResult> {
		return { status: 'skipped', reason: 'noop' };
	}
}
