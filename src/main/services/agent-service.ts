import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { app } from 'electron';
import { AgentSettingsStore } from './agent-settings-store';
import { AgentWorkspace } from './agent-workspace';
import { History } from './history';
import { AgentRuntime } from '../agent/loop/loop';
import { RuntimeEvent } from '../agent';
import { AgentResponseEvent, AgentRunStopReason } from '../../shared/agent/types';
import { toError } from '../ipc/core/error';

export interface AgentSendOptions {
	runId?: string;
	sessionId?: string;
	providerId?: string;
	modelId?: string;
	streamEvent?: (event: AgentResponseEvent) => void;
}

export class AgentService {
	private readonly activeRuns = new Map<string, AbortController>();
	private readonly defaultAgentId: string;
	private readonly agentWorkspace: AgentWorkspace;
	private readonly agentSettingsStore: AgentSettingsStore;
	private readonly history: History;
	private readonly runtime: AgentRuntime;

	constructor(agentSettingsStore: AgentSettingsStore, defaultAgentId = 'main') {
		this.defaultAgentId = defaultAgentId;
		const location = resolveAgentUsageLocation();

		this.agentWorkspace = new AgentWorkspace(location);
		this.agentSettingsStore = agentSettingsStore;
		this.history = new History(location);
		this.runtime = new AgentRuntime(this.agentWorkspace, this.agentSettingsStore, this.history);
	}

	async send(message: string, agentId?: string, options: AgentSendOptions = {}): Promise<string> {
		const resolvedAgentId = agentId?.trim() || this.defaultAgentId;

		this.cancel(resolvedAgentId);
		const runId = options.runId ?? randomUUID();
		const sessionId = options.sessionId ?? resolvedAgentId;

		let response = '';
		let providerId = options.providerId ?? '';
		let controller: AbortController | undefined;
		try {
			controller = new AbortController();
			const stream = this.runtime.run({
				task: 'chat',
				message,
				providerId: options.providerId,
				modelId: options.modelId,
				sessionId,
				maxRetries: 1,
				signal: controller.signal,
			});
			this.activeRuns.set(resolvedAgentId, controller);

			for await (const event of stream) {
				if (event.type === 'run_started')
					providerId = event.providerId;
				if (event.type === 'model_call_delta')
					response += event.delta;
				if (event.type === 'run_finished')
					response = event.result.text || response;

				for (const responseEvent of runtimeEventToAgentEvents(
					event,
					resolvedAgentId,
					runId,
					providerId
				)) {
					options.streamEvent?.(responseEvent);
				}
			}
			return response;
		} catch (error) {
			const cause = toError(error, 'Agent request failed.');
			const responseEvent = {
				type: 'run_state',
				state: 'error',
				label: cause.message,
				agentId: resolvedAgentId,
				runId,
			} satisfies AgentResponseEvent;
			options.streamEvent?.(responseEvent);
			throw cause;
		} finally {
			if (controller && this.activeRuns.get(resolvedAgentId) === controller)
				this.activeRuns.delete(resolvedAgentId);
		}
	}

	cancel(agentId?: string): void {
		if (agentId) {
			this.activeRuns.get(agentId)?.abort();
			this.activeRuns.delete(agentId);
			return;
		}
		for (const controller of this.activeRuns.values()) controller.abort();
		this.activeRuns.clear();
	}

	isBusy(agentId: string): boolean {
		return this.activeRuns.has(agentId);
	}
}

export function resolveAgentUsageLocation(): string {
	return path.join(resolveLocation(), 'agent');
}

function resolveLocation(): string {
	try {
		return app.getPath('userData');
	} catch {
		const base = process.env.APPDATA ?? process.env.XDG_CONFIG_HOME ?? process.env.HOME ?? process.cwd();
		return path.resolve(base, app?.getName?.() ?? 'Friday');
	}
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
	return [];
}
