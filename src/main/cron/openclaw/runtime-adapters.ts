import type { ChannelRegistry } from '../../channels';
import type { EventBus } from '../../core/event-bus';
import type { LoggerService } from '../../logger';
import type { AgentService } from '../../service';
import type {
	OpenClawCronDelivery,
	OpenClawCronDeliveryState,
	OpenClawCronJobDefinition,
	OpenClawCronRunRecord,
} from '../../../shared/cron';
import type {
	OpenClawCronDeliveryPort,
	OpenClawCronExecutionOutcome,
	OpenClawCronExecutor,
} from './scheduler';
import { DEFAULT_AGENT_ID } from '../../constants';

export class AgentServiceOpenClawCronExecutor implements OpenClawCronExecutor {
	constructor(private readonly agentService: AgentService) {}

	async execute(input: {
		job: OpenClawCronJobDefinition;
		signal: AbortSignal;
	}): Promise<OpenClawCronExecutionOutcome> {
		if (input.signal.aborted) {
			return { status: 'skipped', skippedReason: 'aborted_before_start' };
		}
		const agentId = this.resolveAgentId(input.job);
		const message = input.job.payload.kind === 'systemEvent'
			? input.job.payload.text
			: input.job.payload.message;
		const output = await this.agentService.send(message, agentId, {
			cronContext: {
				role: 'cron-self',
				jobId: input.job.id,
				agentId: input.job.agentId,
				sessionKey: input.job.sessionKey,
			},
		});
		return { status: 'ok', output };
	}

	private resolveAgentId(job: OpenClawCronJobDefinition): string {
		if (job.agentId) return job.agentId;
		if (job.sessionTarget === 'main') return DEFAULT_AGENT_ID;
		if (job.sessionTarget === 'isolated') return `cron:${job.id}:${Date.now()}`;
		if (job.sessionTarget.startsWith('session:')) return job.sessionTarget.slice('session:'.length);
		return DEFAULT_AGENT_ID;
	}
}

export class GatewayOpenClawCronDelivery implements OpenClawCronDeliveryPort {
	constructor(
		private readonly dependencies: {
			eventBus?: EventBus;
			channelRegistry?: ChannelRegistry;
			logger?: LoggerService;
		}
	) {}

	async deliver(input: {
		job: OpenClawCronJobDefinition;
		run: Pick<OpenClawCronRunRecord, 'runId' | 'status' | 'error'>;
		output: string;
		delivery: OpenClawCronDelivery;
		failure: boolean;
	}): Promise<OpenClawCronDeliveryState> {
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
			job: OpenClawCronJobDefinition;
			run: Pick<OpenClawCronRunRecord, 'runId' | 'status' | 'error'>;
			output: string;
			delivery: OpenClawCronDelivery;
			failure: boolean;
		},
		attemptedAtMs: number
	): Promise<OpenClawCronDeliveryState> {
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
			job: OpenClawCronJobDefinition;
			run: Pick<OpenClawCronRunRecord, 'runId' | 'status' | 'error'>;
			output: string;
			delivery: OpenClawCronDelivery;
			failure: boolean;
		},
		attemptedAtMs: number
	): Promise<OpenClawCronDeliveryState> {
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
				this.dependencies.logger?.warn('OpenClawCronDelivery', 'Channel announce failed.', {
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
