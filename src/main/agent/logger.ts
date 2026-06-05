import { MIN_RANK, RANK } from './common';
import type { Level } from './types';

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
