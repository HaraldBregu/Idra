import { randomUUID } from 'node:crypto';
import type { TasksService } from '../../../tasks';
import type { AgentSettingsStorePort } from '../../settings';
import { SubagentRegistry } from './registry';
import type { SessionsSpawnResult, SubagentsControlResult, SubagentRunRecord } from './types';

export interface SubagentSpawnRequest {
	requesterSessionKey: string;
	task: string;
	agentId?: string;
	mode?: 'run' | 'session';
	cleanup?: 'delete' | 'keep';
}
export interface SubagentsControlRequest {
	requesterSessionKey: string;
	action: 'list' | 'cancel' | 'history';
	runId?: string;
}
export interface SubagentSpawnPort {
	spawn(request: SubagentSpawnRequest): Promise<SessionsSpawnResult>;
	control(request: SubagentsControlRequest): Promise<SubagentsControlResult>;
}
export interface SubagentSpawnServiceDependencies {
	agentSettings: Pick<AgentSettingsStorePort, 'getAgentConfig'>;
	taskManager: Pick<TasksService, 'run' | 'cancel'>;
	registry: SubagentRegistry;
	eventBus?: { emit(type: string, payload: unknown): void };
	logger?: { info(source: string, message: string, data?: unknown): void; warn(source: string, message: string, data?: unknown): void };
}
export class SubagentSpawnService implements SubagentSpawnPort {
	constructor(private readonly dependencies: SubagentSpawnServiceDependencies) {}
	async spawn(request: SubagentSpawnRequest): Promise<SessionsSpawnResult> {
		const runId = randomUUID();
		const record: SubagentRunRecord = {
			runId,
			requesterSessionKey: request.requesterSessionKey,
			childSessionKey: `${request.requesterSessionKey}:subagent:${runId}`,
			agentId: request.agentId ?? 'main',
			task: request.task,
			status: 'queued',
			cleanup: request.cleanup ?? 'keep',
			spawnMode: request.mode ?? 'run',
			createdAt: Date.now(),
		};
		const run = this.dependencies.registry.registerSubagentRun(record);
		this.dependencies.eventBus?.emit('subagent:created', run);
		return { run };
	}
	async control(request: SubagentsControlRequest): Promise<SubagentsControlResult> {
		if (request.action === 'list') return { action: request.action, runs: this.dependencies.registry.listSubagentRunsForRequester(request.requesterSessionKey) };
		if (request.action === 'cancel' && request.runId) return { action: request.action, run: this.dependencies.registry.cancelSubagentRun(request.runId) };
		return { action: request.action };
	}
}
