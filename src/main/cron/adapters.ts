import type {
	CronJobDelivery,
	CronJobDeliveryState,
	CronJobDefinition,
	CronJobRunRecord,
} from '../../shared/app/cron';
import type {
	CronJobDeliveryPort,
	CronJobExecutionOutcome,
	CronJobExecutor,
} from './jobs';
import { DEFAULT_CRON_AGENT_ID } from './constants';

export interface CronAgentSendOptions {
	sessionId?: string;
	cronContext?: {
		role: 'cron-self';
		jobId?: string;
		agentId?: string | null;
		sessionKey?: string | null;
	};
	effort?: string;
	lightContext?: boolean;
	toolsAllow?: string[];
}

export interface CronAgentPort {
	send(message: string, agentId?: string, options?: CronAgentSendOptions): Promise<string>;
}

export interface CronChannelPort {
	send(input: {
		type: string;
		accountId?: string;
		to: string;
		threadId?: string;
		text: string;
		idempotencyKey: string;
	}): Promise<void>;
}

export interface CronEventBusPort {
	broadcast(channel: string, ...args: unknown[]): void;
}

export interface CronLoggerPort {
	warn(scope: string, message: string, metadata?: unknown): void;
}

export class AgentCronJobExecutor implements CronJobExecutor {
	constructor(private readonly agent: CronAgentPort) {}

	async execute(input: {
		job: CronJobDefinition;
		signal: AbortSignal;
	}): Promise<CronJobExecutionOutcome> {
		if (input.signal.aborted) {
			return { status: 'skipped', skippedReason: 'aborted_before_start' };
		}
		const agentId = this.resolveAgentId(input.job);
		const sessionId = this.resolveSessionId(input.job);
		const message =
			input.job.payload.kind === 'systemEvent' ? input.job.payload.text : input.job.payload.message;
		const sendOptions: CronAgentSendOptions = {
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
			if (input.job.payload.toolsAllow) sendOptions.toolsAllow = input.job.payload.toolsAllow;
		}
		const output = await this.agent.send(message, agentId, sendOptions);
		return { status: 'ok', output };
	}

	private resolveAgentId(job: CronJobDefinition): string {
		return job.agentId ?? DEFAULT_CRON_AGENT_ID;
	}

	private resolveSessionId(job: CronJobDefinition): string {
		if (job.sessionTarget === 'main') return this.resolveAgentId(job);
		if (job.sessionTarget === 'isolated') return `cron:${job.id}`;
		if (job.sessionTarget.startsWith('session:')) return job.sessionTarget.slice('session:'.length);
		return this.resolveAgentId(job);
	}

}

export class GatewayCronJobDelivery implements CronJobDeliveryPort {
	constructor(
		private readonly dependencies: {
			eventBus?: CronEventBusPort;
			channel?: CronChannelPort;
			logger?: CronLoggerPort;
		}
	) {}

	async deliver(input: {
		job: CronJobDefinition;
		run: Pick<CronJobRunRecord, 'runId' | 'status' | 'error'>;
		output: string;
		delivery: CronJobDelivery;
		failure: boolean;
	}): Promise<CronJobDeliveryState> {
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
			job: CronJobDefinition;
			run: Pick<CronJobRunRecord, 'runId' | 'status' | 'error'>;
			output: string;
			delivery: CronJobDelivery;
			failure: boolean;
		},
		attemptedAtMs: number
	): Promise<CronJobDeliveryState> {
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
			job: CronJobDefinition;
			run: Pick<CronJobRunRecord, 'runId' | 'status' | 'error'>;
			output: string;
			delivery: CronJobDelivery;
			failure: boolean;
		},
		attemptedAtMs: number
	): Promise<CronJobDeliveryState> {
		const target = {
			channel: input.delivery.channel,
			to: input.delivery.to,
			threadId: input.delivery.threadId,
			accountId: input.delivery.accountId,
		};
		if (input.delivery.channel === 'telegram' && input.delivery.to) {
			try {
				await this.dependencies.channel?.send({
					type: input.delivery.channel,
					accountId: input.delivery.accountId,
					to: input.delivery.to,
					threadId: input.delivery.threadId,
					text: input.output,
					idempotencyKey: `cron:${input.job.id}:${input.run.runId}`,
				});
				return { mode: 'announce', status: 'sent', attemptedAtMs, target };
			} catch (error) {
				this.dependencies.logger?.warn('CronJobDelivery', 'Channel announce failed.', {
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
