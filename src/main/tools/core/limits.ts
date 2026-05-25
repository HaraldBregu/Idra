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
	exec: {
		timeoutMs: 120_000,
		maxTimeoutMs: 600_000,
		maxOutputBytes: 16 * 1024,
		maxOutputLines: 200,
		rateLimitCalls: 10,
		rateLimitWindowMs: 60_000,
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
	webFetch: {
		maxResponseBytes: 1024 * 1024,
		rateLimitCalls: 20,
		rateLimitWindowMs: 60_000,
	},
	toolSearch: {
		compactionThreshold: 24,
		defaultLimit: 8,
		maxLimit: 25,
	},
} as const;
