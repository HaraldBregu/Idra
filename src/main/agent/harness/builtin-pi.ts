import { runAgent } from '../run';
import type { AgentHarness } from './types';

export function createPiAgentHarness(): AgentHarness {
	return {
		id: 'pi',
		label: 'Friday default runtime',
		supports: () => ({ supported: true, priority: 0 }),
		runAttempt: async (params) =>
			runAgent({
				runId: params.runId,
				userMessage: params.userMessage,
				systemPrompt: params.systemPrompt,
				session: params.session,
				provider: params.providerAdapter,
				model: params.model,
				effort: params.effort,
				tools: params.tools,
				ctx: params.ctx,
				maxTokens: params.maxTokens,
				maxIterations: params.maxIterations,
				streamOutput: params.streamOutput,
				streamEvent: params.streamEvent,
				hooks: params.hooks,
				signal: params.signal,
				toolManagement: params.toolManagement,
			}),
	};
}

