type Level = 'debug' | 'info' | 'warn' | 'error';
const RANK: Record<Level, number> = { debug: 0, info: 1, warn: 2, error: 3 };
const MIN_RANK = RANK[(process.env['LOG_LEVEL']?.toLowerCase() as Level | undefined) ?? 'info'] ?? 1;

function emit(level: Level, ctx: string, msg: string, data?: Record<string, unknown>): void {
	if (RANK[level] < MIN_RANK) return;
	process.stderr.write(JSON.stringify({ ts: new Date().toISOString(), level, ctx, msg, ...data }) + '\n');
}

export const agentLogger = {
	debug: (ctx: string, msg: string, data?: Record<string, unknown>) => emit('debug', ctx, msg, data),
	info:  (ctx: string, msg: string, data?: Record<string, unknown>) => emit('info',  ctx, msg, data),
	warn:  (ctx: string, msg: string, data?: Record<string, unknown>) => emit('warn',  ctx, msg, data),
	error: (ctx: string, msg: string, data?: Record<string, unknown>) => emit('error', ctx, msg, data),
};
