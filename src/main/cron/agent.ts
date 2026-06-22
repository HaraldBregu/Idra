import { randomUUID } from 'node:crypto';
import type { AgentService } from '../agent/service';

export function handleAgentFire(agent: AgentService, scheduleId: string): void {
	const agentId = randomUUID();
	void agent.send('Hey whats up', agentId, {
		category: 'task',
		sessionId: scheduleId,
	});
}
