import type { AgentContext, AppState, Logger, Metrics, PermissionContext, Tool } from './types';

export type CreateAgentContextInput = {
	tools: Tool<unknown, unknown>[];
	abortSignal?: AbortSignal;
	permissionContext?: Partial<PermissionContext>;
	logger?: Logger;
	metrics?: Metrics;
	state?: Partial<AppState>;
};

export function createAgentContext(input: CreateAgentContextInput): AgentContext {
	let state: AppState = {
		activeInstructions: input.state?.activeInstructions ?? [],
		readFileState: input.state?.readFileState ?? new Map(),
		metadata: input.state?.metadata ?? {},
	};
	const controller = new AbortController();
	return {
		messages: [],
		tools: input.tools,
		abortSignal: input.abortSignal ?? controller.signal,
		permissionContext: {
			mode: input.permissionContext?.mode ?? 'default',
			alwaysAllowRules: input.permissionContext?.alwaysAllowRules ?? [],
			alwaysDenyRules: input.permissionContext?.alwaysDenyRules ?? [],
			alwaysAskRules: input.permissionContext?.alwaysAskRules ?? [],
			additionalWorkingDirectories: input.permissionContext?.additionalWorkingDirectories ?? [],
			requestApproval: input.permissionContext?.requestApproval,
		},
		getState: () => state,
		setState(update) {
			state = update(state);
		},
		logger: input.logger ?? { event: () => undefined },
		metrics: input.metrics ?? { measure: async (_name, work) => work() },
	};
}
