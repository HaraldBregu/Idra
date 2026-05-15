import { promises as fs } from 'node:fs';
import path from 'node:path';
import { resolveDefaultUserDataPath } from './user-data';

export interface RunLogStart {
	runId: string;
	assistantId: string;
	provider: string;
	model: string;
	systemPromptChars: number;
	userMessageChars: number;
	tools: string[];
	mcpToolCount: number;
}

export interface RunLogIteration {
	runId: string;
	assistantId: string;
	iteration: number;
	usage?: TokenUsage;
	durationMs: number;
}

export interface RunLogToolCall {
	runId: string;
	assistantId: string;
	iteration: number;
	callId: string;
	tool: string;
	arguments: string;
	durationMs: number;
	status: 'ok' | 'error' | 'rejected';
	outputChars: number;
}

export interface RunLogApprovalRequest {
	runId: string;
	assistantId: string;
	iteration: number;
	pending: Array<{ callId: string; tool: string; arguments: string }>;
}

export interface RunLogApprovalResolution {
	runId: string;
	assistantId: string;
	callId: string;
	tool: string;
	decision: 'approve' | 'reject';
	alwaysApply: boolean;
	editedArguments?: string;
}

export interface RunLogInputRequest {
	runId: string;
	assistantId: string;
	iteration: number;
	pending: Array<{ callId: string; tool: string; question: string }>;
}

export interface RunLogInputResolution {
	runId: string;
	assistantId: string;
	callId: string;
	tool: string;
	answerChars: number;
}

export interface TokenUsage {
	inputTokens: number;
	outputTokens: number;
	totalTokens: number;
}

export interface RunLogFinish {
	runId: string;
	assistantId: string;
	provider: string;
	model: string;
	status:
		| 'completed'
		| 'awaiting_approval'
		| 'awaiting_input'
		| 'cancelled'
		| 'error'
		| 'max_iterations';
	iterations: number;
	durationMs: number;
	usage: TokenUsage;
	outputChars: number;
	error?: { message: string; stack?: string };
}

export type RunLogRecord =
	| ({ event: 'start'; ts: string } & RunLogStart)
	| ({ event: 'iteration'; ts: string } & RunLogIteration)
	| ({ event: 'tool_call'; ts: string } & RunLogToolCall)
	| ({ event: 'approval_request'; ts: string } & RunLogApprovalRequest)
	| ({ event: 'approval_resolution'; ts: string } & RunLogApprovalResolution)
	| ({ event: 'input_request'; ts: string } & RunLogInputRequest)
	| ({ event: 'input_resolution'; ts: string } & RunLogInputResolution)
	| ({ event: 'finish'; ts: string } & RunLogFinish);

export interface RunLoggerOptions {
	baseDir?: string;
}

/**
 * Append-only JSONL audit trail of every assistant run.
 * One file per assistant id under `.friday/assistant/runs/<id>.jsonl`.
 * Each line is a typed RunLogRecord — start, iteration, tool_call,
 * approval_request, approval_resolution, finish.
 */
export class AssistantRunLogger {
	readonly filePath: string;
	private writeQueue: Promise<void> = Promise.resolve();

	constructor(assistantId: string, opts: RunLoggerOptions = {}) {
		const baseDir = opts.baseDir ?? resolveDefaultUserDataPath('assistant', 'runs');
		this.filePath = path.join(baseDir, `${assistantId}.jsonl`);
	}

	private async ensureDir(): Promise<void> {
		await fs.mkdir(path.dirname(this.filePath), { recursive: true });
	}

	private append(record: RunLogRecord): Promise<void> {
		const line = JSON.stringify(record) + '\n';
		this.writeQueue = this.writeQueue
			.catch(() => undefined)
			.then(async () => {
				await this.ensureDir();
				await fs.appendFile(this.filePath, line, 'utf8');
			});
		return this.writeQueue;
	}

	private now(): string {
		return new Date().toISOString();
	}

	logStart(data: RunLogStart): Promise<void> {
		return this.append({ event: 'start', ts: this.now(), ...data });
	}

	logIteration(data: RunLogIteration): Promise<void> {
		return this.append({ event: 'iteration', ts: this.now(), ...data });
	}

	logToolCall(data: RunLogToolCall): Promise<void> {
		return this.append({ event: 'tool_call', ts: this.now(), ...data });
	}

	logApprovalRequest(data: RunLogApprovalRequest): Promise<void> {
		return this.append({ event: 'approval_request', ts: this.now(), ...data });
	}

	logApprovalResolution(data: RunLogApprovalResolution): Promise<void> {
		return this.append({ event: 'approval_resolution', ts: this.now(), ...data });
	}

	logInputRequest(data: RunLogInputRequest): Promise<void> {
		return this.append({ event: 'input_request', ts: this.now(), ...data });
	}

	logInputResolution(data: RunLogInputResolution): Promise<void> {
		return this.append({ event: 'input_resolution', ts: this.now(), ...data });
	}

	logFinish(data: RunLogFinish): Promise<void> {
		return this.append({ event: 'finish', ts: this.now(), ...data });
	}

	async readAll(): Promise<RunLogRecord[]> {
		try {
			const raw = await fs.readFile(this.filePath, 'utf8');
			return raw
				.split('\n')
				.filter(Boolean)
				.map((line) => JSON.parse(line) as RunLogRecord);
		} catch (err) {
			if ((err as NodeJS.ErrnoException).code === 'ENOENT') return [];
			throw err;
		}
	}

	async flush(): Promise<void> {
		await this.writeQueue;
	}
}
