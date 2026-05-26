import type { Disposable } from '../core/service-container';
import type { AgentService } from '../agent';
import {
	getModelReasoningEfforts,
	isModelReasoningEffort,
	requireModelReasoningEffort,
	type ModelReasoningEffort,
	type OperatorStoreState,
} from '../../shared/agents/service';
import {
	normalizeChannelId,
	type ChannelChatType,
	type ChannelOutboundMessage,
} from '../channels';
import { DEFAULT_AGENT_ID } from '../constants';
import type {
	AgentHeartbeatConfig,
	HeartbeatEventPayload,
	HeartbeatRunResult,
	HeartbeatSettings,
	HeartbeatSettingsUpdate,
	HeartbeatStatus,
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
import { normalizeHeartbeatReply } from './response';
import { HeartbeatRuntimeState } from './state';
import { resolveHeartbeatVisibility } from './visibility';

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
	private readonly runtimeState: HeartbeatRuntimeState;

	constructor(private readonly agentService: AgentService) {
		this.runtimeState = new HeartbeatRuntimeState(agentService.getHeartbeatStore());
	}

	start(): void {
		if (this.started) return;
		this.started = true;
		this.updateConfig();
		this.wakeDisposer = setHeartbeatWakeHandler((wake) => this.runHeartbeatOnce(wake));
		this.routeDisposer = this.agentService.onHeartbeatRoute((payload) => {
			this.recordDeliveryRoute(payload as DeliveryRoute);
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
		const operator = this.getHeartbeatOperator();
		const summaries = resolveHeartbeatAgentSummaries(operator);
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

	getSettings(): HeartbeatSettings {
		const heartbeat = this.getDefaultHeartbeatConfig();
		const providerId = this.normalizeString(heartbeat.providerId)?.toLowerCase();
		const modelId = this.normalizeString(heartbeat.modelId) ?? this.normalizeString(heartbeat.model);
		const reasoningEffort =
			providerId &&
			modelId &&
			isModelReasoningEffort(heartbeat.reasoningEffort) &&
			getModelReasoningEfforts(modelId, providerId).includes(heartbeat.reasoningEffort)
				? heartbeat.reasoningEffort
				: undefined;
		return {
			every: this.normalizeString(heartbeat.every) ?? DEFAULT_HEARTBEAT_EVERY,
			...(heartbeat.activeHours ? { activeHours: heartbeat.activeHours } : {}),
			...(providerId ? { providerId } : {}),
			...(modelId ? { modelId } : {}),
			...(reasoningEffort ? { reasoningEffort } : {}),
		};
	}

	saveSettings(request: HeartbeatSettingsUpdate): HeartbeatSettings {
		this.assertObject(request);
		const patch = this.normalizeSettingsUpdate(request);
		const current = this.getSettings();
		const hasProviderId = Object.prototype.hasOwnProperty.call(patch, 'providerId');
		const hasModelId = Object.prototype.hasOwnProperty.call(patch, 'modelId');
		const hasReasoningEffort = Object.prototype.hasOwnProperty.call(patch, 'reasoningEffort');
		const nextProviderId = hasProviderId ? patch.providerId : current.providerId;
		const nextModelId = hasModelId ? patch.modelId : current.modelId;

		if (hasProviderId && patch.providerId) this.requireProvider(patch.providerId);
		if (hasModelId && patch.modelId) this.requireModel(nextProviderId, patch.modelId);

		if (hasReasoningEffort) {
			patch.reasoningEffort = patch.reasoningEffort
				? this.requireReasoningEffort(nextProviderId, nextModelId, patch.reasoningEffort)
				: undefined;
		} else if ((hasProviderId || hasModelId) && current.reasoningEffort) {
			patch.reasoningEffort = this.isReasoningEffortSupported(
				nextProviderId,
				nextModelId,
				current.reasoningEffort
			)
				? current.reasoningEffort
				: undefined;
		}

		if (hasModelId) patch.model = undefined;
		this.agentService.getHeartbeatStore().setDefaultHeartbeatConfig(patch);
		this.updateConfig();
		return this.getSettings();
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
		const settings = this.getSettings();
		return {
			every: settings.every,
			...(settings.activeHours ? { activeHours: settings.activeHours } : {}),
		};
	}

	updateTiming(request: HeartbeatTimingSettings): HeartbeatTimingSettings {
		this.saveSettings({ every: request.every, activeHours: request.activeHours });
		return this.getTiming();
	}

	setProviderId(providerId: string): HeartbeatSettings {
		return this.saveSettings({ providerId });
	}

	setModelId(modelId: string): HeartbeatSettings {
		return this.saveSettings({ modelId });
	}

	setReasoningEffort(reasoningEffort: ModelReasoningEffort): HeartbeatSettings {
		return this.saveSettings({ reasoningEffort });
	}

	request(wake: HeartbeatWakeRequest): void {
		requestHeartbeat(wake);
	}

	async systemEvent(request: HeartbeatSystemEventRequest): Promise<HeartbeatSystemEventResult> {
		const text = request.text?.trim();
		if (!text) throw new Error('system-event text is required.');
		const operator = this.getHeartbeatOperator();
		const agentId = request.agentId?.trim() || resolveDefaultHeartbeatAgentId(operator);
		const sessionKey = request.sessionKey?.trim() || agentId;
		const mode = request.mode ?? 'next-heartbeat';
		this.enqueueSystemEvent(sessionKey, {
			id: `${Date.now()}:${Math.random().toString(16).slice(2)}`,
			text,
			createdAtMs: Date.now(),
			source: 'cron',
		});
		this.agentService.broadcastHeartbeatSystemEvent({
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
		const operator = this.getHeartbeatOperator();
		const agentId = wake.agentId?.trim() || resolveDefaultHeartbeatAgentId(operator);
		const summary = this.mergeWakeOverride(resolveHeartbeatSummaryForAgent(operator, agentId), wake.heartbeat);
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
				this.agentService.warnHeartbeat('Heartbeat flood guard deferred a wake.', {
					agentId,
					source: wake.source,
				});
			}
			return { status: 'skipped', reason: defer.reason };
		}

		if (this.agentService.isBusy(agentId)) {
			return { status: 'skipped', reason: HEARTBEAT_SKIP_REQUESTS_IN_FLIGHT };
		}
		if (actualSessionKey !== agentId && this.agentService.isBusy(actualSessionKey)) {
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
		const channelSettings = delivery.status === 'ok'
			? this.agentService.getHeartbeatChannel()
			: undefined;
		if (delivery.status === 'ok' && !channelSettings) {
			return this.skipAndAdvance(schedule, 'no-target', {
				channel: delivery.message.type,
				target: delivery.message.to,
				accountId: delivery.message.accountId,
			});
		}
		const visibility =
			delivery.status === 'ok' && channelSettings
				? resolveHeartbeatVisibility({
						channel: channelSettings,
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
				this.runtimeState.getTaskLastRunMs(agentId, baseSessionKey, task.name),
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
			now: new Date(startedAt),
		});

		schedule.lastRunStartedAtMs = startedAt;
		recordRunStart(schedule.recentRunStarts, startedAt);
		schedule.floodLogged = false;

		const typingTarget = delivery.status === 'ok' ? delivery.message.to : undefined;
		const typingPlugin = delivery.status === 'ok'
			? this.agentService.getHeartbeatChannelRegistry()?.getPlugin(delivery.message.type)
			: undefined;
		if (typingTarget && typingPlugin?.heartbeat?.sendTyping) {
			await Promise.resolve(typingPlugin.heartbeat.sendTyping(typingTarget)).catch(() => undefined);
		}

		try {
			const model = summary.modelId ?? summary.model;
			const text = await this.agentService.send(prompt, agentId, {
				sessionId: actualSessionKey,
				providerId: summary.providerId,
				model,
				effort: summary.reasoningEffort,
				heartbeat: {
					model,
					timeoutSeconds: summary.timeoutSeconds,
					lightContext: summary.lightContext,
					suppressToolErrorWarnings: summary.suppressToolErrorWarnings,
					suppressAgentEvents: true,
				},
			});
			const normalized = normalizeHeartbeatReply({
				text,
				ackMaxChars: summary.ackMaxChars,
			});
			let sent = false;
			let silent = normalized.kind === 'ok';
			if (delivery.status === 'ok') {
				if (normalized.kind === 'alert' && visibility.showAlerts) {
					if (!this.runtimeState.isDuplicateAlert(baseSessionKey, normalized.text, startedAt)) {
						await this.agentService.getHeartbeatChannelRegistry()?.send({
							...delivery.message,
							text: normalized.text,
							idempotencyKey: `heartbeat:${agentId}:${startedAt}`,
						});
						this.runtimeState.recordDeliveredText(baseSessionKey, normalized.text, startedAt);
						sent = true;
						silent = false;
					} else {
						silent = true;
					}
				} else if (normalized.kind === 'ok' && visibility.showOk) {
					await this.agentService.getHeartbeatChannelRegistry()?.send({
						...delivery.message,
						text: HEARTBEAT_OK,
						idempotencyKey: `heartbeat:${agentId}:${startedAt}:ok`,
					});
					sent = true;
					silent = false;
				}
			}
			this.consumePendingEvents(baseSessionKey, pendingEvents.ids);
			this.runtimeState.markTasksRun(agentId, baseSessionKey, dueTasks, Date.now());
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
			this.agentService.errorHeartbeat('Heartbeat run failed', error);
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

	private getDefaultHeartbeatConfig(): AgentHeartbeatConfig {
		return this.agentService.getHeartbeatStore().getAgentsConfig()?.defaults?.heartbeat ?? {};
	}

	private assertObject(value: unknown): asserts value is Record<string, unknown> {
		if (!value || typeof value !== 'object' || Array.isArray(value)) {
			throw new Error('Invalid heartbeat request.');
		}
	}

	private normalizeString(value: unknown): string | undefined {
		return typeof value === 'string' && value.trim() ? value.trim() : undefined;
	}

	private normalizeSettingsUpdate(request: HeartbeatSettingsUpdate): Partial<AgentHeartbeatConfig> {
		const patch: Partial<AgentHeartbeatConfig> = {};
		if ('every' in request) {
			const every = this.normalizeString(request.every);
			if (!every) throw new Error('Heartbeat cadence is required.');
			patch.every = every;
		}
		if ('activeHours' in request) {
			patch.activeHours = this.normalizeActiveHours(request.activeHours);
		}
		if ('providerId' in request) {
			const providerId = this.normalizeString(request.providerId)?.toLowerCase();
			if (!providerId) throw new Error('Heartbeat provider id is required.');
			patch.providerId = providerId;
		}
		if ('modelId' in request) {
			const modelId = this.normalizeString(request.modelId);
			if (!modelId) throw new Error('Heartbeat model id is required.');
			patch.modelId = modelId;
		}
		if ('reasoningEffort' in request) {
			if (request.reasoningEffort === undefined || request.reasoningEffort === null) {
				patch.reasoningEffort = undefined;
			} else if (isModelReasoningEffort(request.reasoningEffort)) {
				patch.reasoningEffort = request.reasoningEffort;
			} else {
				throw new Error('Heartbeat reasoning effort is not supported.');
			}
		}
		return patch;
	}

	private requireProvider(providerId: string | undefined): asserts providerId is string {
		if (!providerId) throw new Error('Heartbeat provider id is required.');
		const provider = this.agentService.getHeartbeatProvider(providerId);
		if (!provider) throw new Error(`Provider not configured: ${providerId}`);
	}

	private requireModel(providerId: string | undefined, modelId: string): void {
		this.requireProvider(providerId);
		const model = this.agentService.getHeartbeatModel(providerId, modelId);
		if (!model) throw new Error(`Model is not supported for heartbeat: ${modelId}`);
	}

	private requireReasoningEffort(
		providerId: string | undefined,
		modelId: string | undefined,
		reasoningEffort: ModelReasoningEffort
	): ModelReasoningEffort {
		if (!providerId || !modelId) {
			throw new Error('Heartbeat provider id and model id are required for reasoning effort.');
		}
		this.requireModel(providerId, modelId);
		return requireModelReasoningEffort(modelId, reasoningEffort, providerId);
	}

	private isReasoningEffortSupported(
		providerId: string | undefined,
		modelId: string | undefined,
		reasoningEffort: ModelReasoningEffort
	): boolean {
		return Boolean(
			providerId &&
				modelId &&
				getModelReasoningEfforts(modelId, providerId).includes(reasoningEffort)
		);
	}

	private normalizeActiveHours(
		activeHours: HeartbeatTimingSettings['activeHours'] | unknown
	): HeartbeatTimingSettings['activeHours'] {
		if (activeHours === undefined || activeHours === null) return undefined;
		this.assertObject(activeHours);
		const start = this.normalizeString(activeHours.start);
		const end = this.normalizeString(activeHours.end);
		const timezone = this.normalizeString(activeHours.timezone);
		if (!start && !end && !timezone) return undefined;
		return {
			...(start ? { start } : {}),
			...(end ? { end } : {}),
			...(timezone ? { timezone } : {}),
		};
	}

	private getHeartbeatOperator(): OperatorStoreState | undefined {
		const operator = this.agentService.getHeartbeatOperatorConfig();
		const agents = this.agentService.getHeartbeatStore().getAgentsConfig();
		if (!operator) return agents ? { agents } : undefined;
		const { agents: _legacyAgents, ...baseOperator } = operator;
		return agents ? { ...baseOperator, agents } : baseOperator;
	}

	private async readHeartbeatFile(_agentId: string): Promise<{
		exists: boolean;
		path?: string;
		content?: string;
	}> {
		try {
			const file = await this.agentService.readHeartbeatWorkspaceFile('HEARTBEAT.md');
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


	private resolveDelivery(summary: HeartbeatSummary, sessionKey: string): DeliveryResolution {
		if (summary.target === 'none') return { status: 'none' };
		const registry = this.agentService.getHeartbeatChannelRegistry();
		if (!registry) return { status: 'skip', reason: 'no-target' };
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
		const plugin = registry.getPlugin(channelId);
		if (!plugin) return { status: 'skip', reason: 'no-target', channel: channelId };
		const channelConfig = this.agentService.getHeartbeatChannelConfig(channelId);
		if (!channelConfig) return { status: 'skip', reason: 'no-target', channel: channelId };
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
		for (const plugin of this.agentService.getHeartbeatChannelRegistry()?.listPlugins() ?? []) {
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
		this.agentService.emitHeartbeatEvent(payload);
	}
}

export class NoopHeartbeatService implements Disposable {
	start(): void {
		return;
	}
	stop(): void {
		return;
	}
	destroy(): void {
		return;
	}
	updateConfig(): void {
		return;
	}
	getStatus(): HeartbeatStatus {
		return { enabled: false, runnerActive: false, agentCount: 0, lastHeartbeat: null };
	}
	getLastHeartbeat(): HeartbeatEventPayload | null {
		return null;
	}
	getSettings(): HeartbeatSettings {
		return { every: DEFAULT_HEARTBEAT_EVERY };
	}
	saveSettings(): HeartbeatSettings {
		return this.getSettings();
	}
	setEnabled(): HeartbeatStatus {
		return this.getStatus();
	}
	getTiming(): HeartbeatTimingSettings {
		return { every: DEFAULT_HEARTBEAT_EVERY };
	}
	updateTiming(): HeartbeatTimingSettings {
		return this.getTiming();
	}
	setProviderId(): HeartbeatSettings {
		return this.getSettings();
	}
	setModelId(): HeartbeatSettings {
		return this.getSettings();
	}
	setReasoningEffort(): HeartbeatSettings {
		return this.getSettings();
	}
	request(): void {
		return;
	}
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
