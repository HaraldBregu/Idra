import type { KeyedLimiter } from '../limiter';
import type { KeyedMutex } from '../mutex';
import type { Config, RuntimeInput, Tool } from '../types';

export interface SubagentRequest {
	id: string;
	task: string;
	tools?: string[];
	maxTurns?: number;
}

export interface SubagentResult {
	id: string;
	status: 'completed' | 'failed' | 'cancelled';
	text?: string;
	error?: string;
	stopReason?: string;
	durationMs: number;
}

export interface SubagentRuntime {
	config: Config;
	parentInput: RuntimeInput;
	availableTools: Tool[];
	limiter: KeyedLimiter;
	resources?: KeyedMutex;
	providerLimiter?: KeyedLimiter;
}
