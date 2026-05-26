import type { ChannelRegistry } from '../../channels';
import type { EventBus } from '../../core/event-bus';
import type { LoggerService } from '../../logger';
import type { AgentSendOptions, AgentService } from '../../service';
import type { HeartbeatService } from '../../heartbeat';
import { AGENT_TASK_TYPE, type TaskManager } from '../../tasks';
import type { HeartbeatWakeOverride } from '../../../shared/heartbeat';
import type {
	FridayCronDelivery,
	FridayCronDeliveryState,
	FridayCronJobDefinition,
	FridayCronRunRecord,
} from '../../../shared/cron';
import type { TaskRecord } from '../../../shared/tasks';
import type {
	FridayCronDeliveryPort,
	FridayCronExecutionOutcome,
	FridayCronExecutor,
} from './scheduler';
import { DEFAULT_AGENT_ID } from '../../constants';

const DEFAULT_WEBHOOK_TIMEOUT_MS = 15_000;

type TerminalTaskRecord = TaskRecord & {
	status: 'succeeded' | 'failed' | 'cancelled';
};

function isTerminalTask(record: TaskRecord | undefined): record is TerminalTaskRecord {
	return (
		record?.status === 'succeeded' || record?.status === 'failed' || record?.status === 'cancelled'
	);
}

function taskOutput(record: TerminalTaskRecord): string {
	const result = record.result;
	if (result && typeof result === 'object' && 'text' in result) {
		const text = (result as { text?: unknown }).text;
		return typeof text === 'string' ? text : '';
	}
	return '';
}

function errorFromTask(record: TerminalTaskRecord): Error {
	const message = record.error?.message || 'Scheduled background task failed.';
	const error = new Error(message);
	error.name = record.error?.code || 'ScheduledBackgroundTaskError';
	return error;
}

export class TaskManagerFridayCronExecutor implements FridayCronExecutor {
	constructor(
		private readonly taskManager: TaskManager,
		private readonly eventBus: EventBus,
		private readonly fallback: FridayCronExecutor
	) {}

	async execute(input: {
		job: FridayCronJobDefinition;
		runId: string;
		scheduledForMs: number;
		signal: AbortSignal;
	}): Promise<FridayCronExecutionOutcome> {
		if (input.job.payload.kind !== 'agentTurn') return this.fallback.execute(input);
		if (input.signal.aborted) return { status: 'skipped', skippedReason: 'aborted_before_start' };

		const record = this.taskManager.startUserTask({
			type: AGENT_TASK_TYPE,
			title: input.job.name,
			input: { message: input.job.payload.message },
			metadata: {
				cronJobId: input.job.id,
				cronRunId: input.runId,
				scheduledForMs: input.scheduledForMs,
				cronSessionTarget: input.job.sessionTarget,
				cronAgentId: input.job.agentId ?? DEFAULT_AGENT_ID,
			},
		});
		const completed = await this.waitForTask(record.id, input.signal);
		if (completed.status === 'cancelled') {
			return { status: 'skipped', skippedReason: 'background_task_cancelled' };
		}
		if (completed.status === 'failed') throw errorFromTask(completed);
		return { status: 'ok', output: taskOutput(completed) };
	}

	private waitForTask(taskId: string, signal: AbortSignal): Promise<TerminalTaskRecord> {
		const current = this.taskManager.get(taskId);
		if (isTerminalTask(current)) return Promise.resolve(current);

		return new Promise((resolve) => {
			let done = false;
			const finish = (record: TerminalTaskRecord): void => {
				if (done) return;
				done = true;
				unsubscribeSucceeded();
				unsubscribeFailed();
				unsubscribeCancelled();
				signal.removeEventListener('abort', abort);
				resolve(record);
			};
			const maybeFinish = (event: { payload: unknown }): void => {
				const payload = event.payload as { task?: TaskRecord };
				if (payload.task?.id === taskId && isTerminalTask(payload.task)) finish(payload.task);
			};
			const abort = (): void => {
				const cancelled = this.taskManager.cancel(taskId);
				if (isTerminalTask(cancelled)) finish(cancelled);
			};
			const unsubscribeSucceeded = this.eventBus.on('task:succeeded', maybeFinish);
			const unsubscribeFailed = this.eventBus.on('task:failed', maybeFinish);
			const unsubscribeCancelled = this.eventBus.on('task:cancelled', maybeFinish);
			signal.addEventListener('abort', abort, { once: true });
			if (signal.aborted) abort();
		});
	}
}

export class AgentServiceFridayCronExecutor implements FridayCronExecutor {
	constructor(
		private readonly agentService: AgentService,
		private readonly heartbeat?: HeartbeatService
	) {}

	async execute(input: {
		job: FridayCronJobDefinition;
		signal: AbortSignal;
	}): Promise<FridayCronExecutionOutcome> {
		if (input.signal.aborted) {
			return { status: 'skipped', skippedReason: 'aborted_before_start' };
		}
		const agentId = this.resolveAgentId(input.job);
		const sessionId = this.resolveSessionId(input.job);
		const message =
			input.job.payload.kind === 'systemEvent' ? input.job.payload.text : input.job.payload.message;
		if (
			input.job.payload.kind === 'systemEvent' &&
			input.job.sessionTarget === 'main' &&
			this.heartbeat
		) {
			await this.heartbeat.systemEvent({
				text: message,
				agentId,
				sessionKey: input.job.sessionKey ?? agentId,
				mode: input.job.wakeMode,
				heartbeat: this.resolveHeartbeatOverride(input.job),
			});
			return { status: 'ok', output: '', alreadyDelivered: true };
		}
		const sendOptions: AgentSendOptions = {
			sessionId,
			cronContext: {
				role: 'cron-self',
				jobId: input.job.id,
				agentId,
				sessionKey: input.job.sessionKey,
			},
		};
		if (input.job.payload.kind === 'agentTurn') {
			if (input.job.payload.thinking) sendOptions.effort = input.job.payload.thinking;
			if (input.job.payload.lightContext !== undefined) {
				sendOptions.lightContext = input.job.payload.lightContext;
			}
		}
		const output = await this.agentService.send(message, agentId, sendOptions);
		return { status: 'ok', output };
	}

	private resolveAgentId(job: FridayCronJobDefinition): string {
		return job.agentId ?? DEFAULT_AGENT_ID;
	}

	private resolveSessionId(job: FridayCronJobDefinition): string {
		if (job.sessionTarget === 'main') return this.resolveAgentId(job);
		if (job.sessionTarget === 'isolated') return `cron:${job.id}`;
		if (job.sessionTarget.startsWith('session:')) return job.sessionTarget.slice('session:'.length);
		return this.resolveAgentId(job);
	}

	private resolveHeartbeatOverride(job: FridayCronJobDefinition): HeartbeatWakeOverride {
		if (job.delivery.mode === 'none') return { target: 'none' };
		if (job.delivery.mode === 'announce') {
			return {
				target: job.delivery.channel ?? 'last',
				to: job.delivery.to,
				accountId: job.delivery.accountId,
			};
		}
		return { target: 'last' };
	}
}

export class GatewayFridayCronDelivery implements FridayCronDeliveryPort {
	constructor(
		private readonly dependencies: {
			eventBus?: EventBus;
			channelRegistry?: ChannelRegistry;
			logger?: LoggerService;
			fetch?: typeof fetch;
			webhookTimeoutMs?: number;
		}
	) {}

	async deliver(input: {
		job: FridayCronJobDefinition;
		run: Pick<FridayCronRunRecord, 'runId' | 'status' | 'error'>;
		output: string;
		delivery: FridayCronDelivery;
		failure: boolean;
	}): Promise<FridayCronDeliveryState> {
		const attemptedAtMs = Date.now();
		if (input.delivery.mode === 'none') {
			return { mode: 'none', status: 'skipped', attemptedAtMs };
		}
		if (input.delivery.mode === 'webhook') {
			return this.deliverWebhook(input, attemptedAtMs);
		}
		return this.deliverAnnounce(input, attemptedAtMs);
	}

	private async deliverWebhook(
		input: {
			job: FridayCronJobDefinition;
			run: Pick<FridayCronRunRecord, 'runId' | 'status' | 'error'>;
			output: string;
			delivery: FridayCronDelivery;
			failure: boolean;
		},
		attemptedAtMs: number
	): Promise<FridayCronDeliveryState> {
		if (!input.delivery.to) {
			return {
				mode: 'webhook',
				status: 'failed',
				attemptedAtMs,
				error: 'webhook URL is missing',
			};
		}
		const controller = new AbortController();
		const timeout = setTimeout(
			() => controller.abort(),
			this.dependencies.webhookTimeoutMs ?? DEFAULT_WEBHOOK_TIMEOUT_MS
		);
		let response: Response;
		try {
			const fetcher = this.dependencies.fetch ?? fetch;
			response = await fetcher(input.delivery.to, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					jobId: input.job.id,
					runId: input.run.runId,
					status: input.run.status,
					output: input.output,
					error: input.run.error,
					failure: input.failure,
				}),
				signal: controller.signal,
			});
		} catch (error) {
			return {
				mode: 'webhook',
				status: 'failed',
				attemptedAtMs,
				error: controller.signal.aborted
					? 'Webhook request timed out.'
					: error instanceof Error
						? error.message
						: String(error),
			};
		} finally {
			clearTimeout(timeout);
		}
		if (!response.ok) {
			return {
				mode: 'webhook',
				status: 'failed',
				attemptedAtMs,
				error: `Webhook returned ${response.status}`,
			};
		}
		return { mode: 'webhook', status: 'sent', attemptedAtMs };
	}

	private async deliverAnnounce(
		input: {
			job: FridayCronJobDefinition;
			run: Pick<FridayCronRunRecord, 'runId' | 'status' | 'error'>;
			output: string;
			delivery: FridayCronDelivery;
			failure: boolean;
		},
		attemptedAtMs: number
	): Promise<FridayCronDeliveryState> {
		const target = {
			channel: input.delivery.channel,
			to: input.delivery.to,
			threadId: input.delivery.threadId,
			accountId: input.delivery.accountId,
		};
		if (input.delivery.channel === 'telegram' && input.delivery.to) {
			try {
				await this.dependencies.channelRegistry?.send({
					type: input.delivery.channel,
					accountId: input.delivery.accountId,
					to: input.delivery.to,
					threadId: input.delivery.threadId,
					text: input.output,
					idempotencyKey: `cron:${input.job.id}:${input.run.runId}`,
				});
				return { mode: 'announce', status: 'sent', attemptedAtMs, target };
			} catch (error) {
				this.dependencies.logger?.warn('FridayCronDelivery', 'Channel announce failed.', {
					jobId: input.job.id,
					error: error instanceof Error ? error.message : String(error),
				});
				return {
					mode: 'announce',
					status: 'failed',
					attemptedAtMs,
					target,
					error: error instanceof Error ? error.message : String(error),
				};
			}
		}
		this.dependencies.eventBus?.broadcast('cron:delivery', {
			jobId: input.job.id,
			runId: input.run.runId,
			output: input.output,
			target,
			failure: input.failure,
		});
		return {
			mode: 'announce',
			status: this.dependencies.eventBus ? 'sent' : 'skipped',
			attemptedAtMs,
			target,
		};
	}
}
