export const TOOL_LIMITS = {
	exec: {
		timeoutMs: 120_000,
		maxTimeoutMs: 600_000,
		maxOutputBytes: 16 * 1024,
		maxOutputLines: 200,
	},
	read: {
		defaultLines: 2_000,
		maxLines: 50_000,
	},
	find: {
		defaultLimit: 1_000,
		maxLimit: 10_000,
	},
} as const;
