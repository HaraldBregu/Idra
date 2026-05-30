import { runAgent } from '../run';
import type { AgentHarness } from './types';

export function createPiAgentHarness(): AgentHarness {
	return {
		id: 'pi',
		label: 'Friday default runtime',
		supports: () => ({ supported: true, priority: 0 }),
		runAttempt: (params) =>
			runAgent({
				runId: params.runId,
				userMessage: params.userMessage,
				systemPrompt: params.systemPrompt,
				session: params.session,
				provider: params.providerAdapter,
				model: params.model,
				tools: params.tools,
				ctx: params.ctx,
				signal: params.signal,
			}),
	};
}
