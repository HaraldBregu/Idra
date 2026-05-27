export const TOOL_LIMITS = {
	agent: {
		maxTokens: 4096,
		maxIterations: 25,
	},
	prompt: {
		defaultMaxTools: 9,
		hardMaxTools: 12,
		useSelectionWhenToolCountExceeds: 12,
	},
	execution: {
		defaultTimeoutMs: 30_000,
		maxRetries: 2,
		backoffMs: 100,
		maxCallsPerTurn: 16,
	},
	read: {
		defaultLines: 2_000,
		maxLines: 50_000,
	},
	inspectFile: {
		defaultBytes: 8 * 1024 * 1024,
		maxBytes: 16 * 1024 * 1024,
		previewBytes: 256,
	},
	find: {
		defaultLimit: 1_000,
		maxLimit: 10_000,
	},
	workspaceList: {
		defaultDepth: 2,
		maxDepth: 8,
		defaultLimit: 200,
		maxLimit: 1_000,
	},
} as const;
