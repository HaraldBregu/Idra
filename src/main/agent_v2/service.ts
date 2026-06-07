import { randomUUID } from 'node:crypto';
import type { AgentSessionMetadata } from '../../shared/store';
import type { EventBus } from '../services/event-bus';
import type { LoggerService } from '../observability';
import type { StoreService } from '../store';
import type { ModelReasoningEffort } from '../../shared/agents/service';
import type { AgentResponseEvent } from '../../shared/agents/events';
import type { AgentRunStopReason } from '../../shared/agents/constants';
import type { RuntimeEvent, RuntimeRun } from './runtime';
import { AgentRuntime } from './runtime';
import { SystemPrompt } from './system';

export interface AgentV2ServiceOptions {
	defaultAgentId?: string;
}

export interface AgentSendOptions {
	runId?: string;
	sessionId?: string;
	providerId?: string;
	model?: string;
	effort?: ModelReasoningEffort;
	lightContext?: boolean;
	streamEvent?: (event: AgentResponseEvent) => void;
	toolsAllow?: string[];
	toolsDeny?: string[];
	sessionMetadata?: Partial<AgentSessionMetadata>;
	cronContext?: unknown;
}

function normalizeStopReason(value: string | undefined): AgentRunStopReason {
	if (value === 'max_tokens') return 'max_tokens';
	if (value === 'max_iterations' || value === 'error_max_turns') return 'max_iterations';
	if (value === 'cancelled') return 'cancelled';
	if (value === 'error') return 'error';
	return 'end_turn';
}

function outputText(output: unknown): string {
	if (typeof output === 'string') return output;
	try {
		return JSON.stringify(output);
	} catch {
		return String(output);
	}
}

function runtimeEventToAgentEvents(
	event: RuntimeEvent,
	agentId: string,
	runId: string,
	providerId: string
): AgentResponseEvent[] {
	if (event.type === 'run_started') {
		return [{ type: 'run_state', state: 'thinking', agentId, runId }];
	}
	if (event.type === 'model_call_start') {
		return [{ type: 'model_selected', providerId, model: event.model, agentId, runId }];
	}
	if (event.type === 'model_call_delta') {
		return [{ type: 'text_delta', delta: event.delta, agentId, runId }];
	}
	if (event.type === 'tool_call_start') {
		return [
			{
				type: 'tool_call_start',
				iteration: 0,
				toolCallId: event.toolName,
				toolName: event.toolName,
				name: event.toolName,
				serviceKind: 'tool',
				agentId,
				runId,
			},
		];
	}
	if (event.type === 'tool_call_end') {
		return [
			{
				type: 'tool_call_result',
				iteration: 0,
				toolCallId: event.toolName,
				toolName: event.toolName,
				input: {},
				output: event.output,
				outputText: outputText(event.output),
				status: 'ok',
				durationMs: 0,
				name: event.toolName,
				serviceKind: 'tool',
				agentId,
				runId,
			},
		];
	}
	if (event.type === 'run_finished') {
		return [
			{
				type: 'run_finished',
				stopReason:
					event.result.subtype === 'error_max_turns'
						? 'max_iterations'
						: normalizeStopReason(event.result.stopReason),
				outputChars: event.result.text.length,
				agentId,
				runId,
			},
			{ type: 'run_state', state: 'completed', agentId, runId },
		];
	}
	if (event.type === 'run_stopped') {
		return [{ type: 'run_state', state: 'cancelled', label: event.reason, agentId, runId }];
	}
	return [];
}

export class AgentV2Service {
	private readonly runtime = new AgentRuntime();
	private readonly systemPrompt = new SystemPrompt();
	private readonly activeRuns = new Map<string, RuntimeRun>();
	private readonly defaultAgentId: string;

	constructor(
		private readonly store: StoreService,
		private readonly logger: LoggerService,
		private readonly eventBus: EventBus,
		options: AgentV2ServiceOptions = {}
	) {
		this.defaultAgentId = options.defaultAgentId ?? 'main';
	}

	async send(message: string, agentId?: string, options: AgentSendOptions = {}): Promise<string> {
		const resolvedAgentId = agentId?.trim() || this.defaultAgentId;
		const configured = this.store.getAgentService();
		const providerId = options.providerId ?? configured?.provider.id;
		const model = options.model ?? configured?.model.id;
		if (!providerId || !model) throw new Error('Agent v2 requires a configured provider and model.');

		const provider = this.dependencies.store.getProviderById(providerId);
		if (!provider) throw new Error(`Agent v2 provider is not configured: ${providerId}`);

		this.cancel(resolvedAgentId);
		const runId = options.runId ?? randomUUID();
		const sessionId = options.sessionId ?? resolvedAgentId;
		const system = await this.systemPrompt.build({});

		const run = this.runtime.run({
			task: 'chat',
			message,
			provider: {
				id: provider.id,
				apiKey: provider.apiKey,
				baseURL: provider.baseUrl,
			},
			model,
			sessionId,
			system,
			maxRetries: 1,
		});
		this.activeRuns.set(resolvedAgentId, run);

		let response = '';
		try {
			for await (const event of run.stream) {
				if (event.type === 'model_call_delta') response += event.delta;
				if (event.type === 'run_finished') response = event.result.text || response;
				for (const responseEvent of runtimeEventToAgentEvents(
					event,
					resolvedAgentId,
					runId,
					provider.id
				)) {
					options.streamEvent?.(responseEvent);
					this.dependencies.eventBus.broadcast('agent:response', responseEvent);
				}
			}
			return response;
		} catch (error) {
			const responseEvent = {
				type: 'run_state',
				state: 'error',
				label: error instanceof Error ? error.message : 'Agent v2 request failed.',
				agentId: resolvedAgentId,
				runId,
			} satisfies AgentResponseEvent;
			options.streamEvent?.(responseEvent);
			this.dependencies.eventBus.broadcast('agent:response', responseEvent);
			throw error;
		} finally {
			if (this.activeRuns.get(resolvedAgentId) === run) this.activeRuns.delete(resolvedAgentId);
		}
	}

	cancel(agentId?: string): void {
		if (agentId) {
			this.activeRuns.get(agentId)?.stop('cancelled');
			this.activeRuns.delete(agentId);
			return;
		}
		for (const run of this.activeRuns.values()) run.stop('cancelled');
		this.activeRuns.clear();
	}

	isBusy(agentId: string): boolean {
		return this.activeRuns.has(agentId);
	}
}
