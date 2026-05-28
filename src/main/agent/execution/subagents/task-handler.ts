import type { TaskContext, TaskHandler } from '../../../shared/tasks';
import type { AgentService } from '../../orchestrator/service';
import type { SubagentRegistry } from './registry';
import type { SubagentRunTaskInput, SubagentRunTaskResult } from './types';

export const SUBAGENT_RUN_TASK_TYPE = 'agent.subagent.run';

export class SubagentRunTaskHandler implements TaskHandler<SubagentRunTaskInput, SubagentRunTaskResult> {
	readonly type = SUBAGENT_RUN_TASK_TYPE;
	constructor(private readonly agentService: Pick<AgentService, 'send' | 'cancel'>, private readonly registry: SubagentRegistry, _eventBus?: unknown) {}
	validateInput(input: unknown): SubagentRunTaskInput {
		if (!input || typeof input !== 'object') throw new Error('Subagent task input must be an object.');
		return input as SubagentRunTaskInput;
	}
	async run(context: TaskContext<SubagentRunTaskInput>): Promise<SubagentRunTaskResult> {
		const input = context.input;
		const started = this.registry.startSubagentRun(input.runId);
		const text = await this.agentService.send(input.task, input.agentId, { sessionId: input.childSessionKey, providerId: input.providerId, model: input.modelId, effort: input.effort });
		const run = this.registry.completeSubagentRun(started.runId, 'ok');
		return { text, run };
	}
}
