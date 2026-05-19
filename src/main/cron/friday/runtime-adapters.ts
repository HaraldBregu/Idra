import type { ChannelRegistry } from '../../channels';
import type { EventBus } from '../../core/event-bus';
import type { LoggerService } from '../../logger';
import type { AgentSendOptions, AgentService } from '../../service';
import type { HeartbeatService } from '../../heartbeat';
import type { HeartbeatWakeOverride } from '../../../shared/heartbeat';
import type {
	FridayCronDelivery,
	FridayCronDeliveryState,
	FridayCronJobDefinition,
	FridayCronRunRecord,
} from '../../../shared/cron';
import type {
	FridayCronDeliveryPort,
	FridayCronExecutionOutcome,
	FridayCronExecutor,
} from './scheduler';
import { DEFAULT_AGENT_ID } from '../../constants';

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
		const message = input.job.payload.kind === 'systemEvent'
			? input.job.payload.text
			: input.job.payload.message;
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
			if (input.job.payload.model) sendOptions.model = input.job.payload.model;
			if (input.job.payload.thinking) sendOptions.effort = input.job.payload.thinking;
			if (input.job.payload.lightContext !== undefined) {
				sendOptions.lightContext = input.job.payload.lightContext;
			}
			if (input.job.payload.toolsAllow) sendOptions.toolsAllow = input.job.payload.toolsAllow;
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
		const response = await fetch(input.delivery.to, {
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
		});
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
