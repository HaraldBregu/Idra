import { randomUUID } from 'node:crypto';
import type { AgentService } from '../agent/service';
import type { CronAction } from './types';

type AgentCronAction = Extract<CronAction, { type: 'agent' }>;

export function handleAgentFire(
	agent: AgentService,
	scheduleId: string,
	action: AgentCronAction
): void {
	const agentId = randomUUID();
	void agent.send(action.prompt, agentId, {
		category: 'task',
		sessionId: scheduleId,
		effort: action.effort,
	});
}
