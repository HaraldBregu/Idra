export interface TokenUsage {
	inputTokens: number;
	outputTokens: number;
	totalTokens: number;
}
export interface RunLogFinish {
	finalText: string;
	toolCalls: number;
	usage: TokenUsage;
	stopReason: string;
}
export class AgentRunLogger {
	constructor(readonly agentId: string, readonly options: { baseDir?: string } = {}) {}
	start(): void {}
	event(): void {}
	finish(_finish: RunLogFinish): void {}
	error(_error: unknown): void {}
}
