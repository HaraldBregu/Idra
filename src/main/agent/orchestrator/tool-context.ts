import type { SessionFile } from '../context/session/store';
import type { CronToolContext, ToolContext } from '../capabilities/local';
import type { AgentServiceDependencies } from './service';

export interface AgentToolContextInput {
	agentId: string;
	sessionId: string;
	session: SessionFile;
	signal: AbortSignal;
	workspace: string;
	sessionBaseDir?: string;
	cronContext?: CronToolContext;
	services: AgentServiceDependencies;
}

export function createAgentToolContext(input: AgentToolContextInput): ToolContext {
	return {
		workspace: input.workspace,
		agentId: input.agentId,
		sessionId: input.sessionId,
		sessionBaseDir: input.sessionBaseDir,
		cronContext: input.cronContext,
		readState: new Map(),
		plan: { entries: input.session.plan },
		signal: input.signal,
		services: input.services as never,
	};
}
