import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import type { ResponseInputItem } from 'openai/resources/responses/responses';

export type ApprovalDecision = 'approve' | 'reject';

export interface PendingApproval {
	callId: string;
	toolName: string;
	arguments: string;
}

export interface PendingToolCall {
	callId: string;
	name: string;
	arguments: string;
}

export interface ResolvedApproval {
	decision: ApprovalDecision;
	message?: string;
}

export interface RunStateData {
	runId: string;
	userMessage: string;
	systemPrompt?: string;
	input: ResponseInputItem[];
	newMessages: ChatCompletionMessageParam[];
	iteration: number;
	pendingApprovals: PendingApproval[];
	pendingToolCalls: PendingToolCall[];
	decisionsByCallId: Record<string, ResolvedApproval>;
	alwaysApproveTools: string[];
	alwaysRejectTools: string[];
}

export class RunState {
	private constructor(public data: RunStateData) {}

	static initial(params: {
		runId: string;
		userMessage: string;
		systemPrompt?: string;
		input: ResponseInputItem[];
		newMessages: ChatCompletionMessageParam[];
	}): RunState {
		return new RunState({
			runId: params.runId,
			userMessage: params.userMessage,
			systemPrompt: params.systemPrompt,
			input: params.input,
			newMessages: params.newMessages,
			iteration: 0,
			pendingApprovals: [],
			pendingToolCalls: [],
			decisionsByCallId: {},
			alwaysApproveTools: [],
			alwaysRejectTools: [],
		});
	}

	static fromJSON(raw: RunStateData): RunState {
		return new RunState({
			runId: raw.runId,
			userMessage: raw.userMessage,
			systemPrompt: raw.systemPrompt,
			input: raw.input ?? [],
			newMessages: raw.newMessages ?? [],
			iteration: raw.iteration ?? 0,
			pendingApprovals: raw.pendingApprovals ?? [],
			pendingToolCalls: raw.pendingToolCalls ?? [],
			decisionsByCallId: raw.decisionsByCallId ?? {},
			alwaysApproveTools: raw.alwaysApproveTools ?? [],
			alwaysRejectTools: raw.alwaysRejectTools ?? [],
		});
	}

	toJSON(): RunStateData {
		return { ...this.data };
	}

	toString(): string {
		return JSON.stringify(this.data);
	}

	static fromString(serialized: string): RunState {
		return RunState.fromJSON(JSON.parse(serialized) as RunStateData);
	}

	pending(): PendingApproval[] {
		return [...this.data.pendingApprovals];
	}

	hasPending(): boolean {
		return this.data.pendingApprovals.length > 0;
	}

	approve(callId: string, opts: { alwaysApprove?: boolean } = {}): void {
		const pending = this.data.pendingApprovals.find((p) => p.callId === callId);
		this.data.decisionsByCallId[callId] = { decision: 'approve' };
		if (opts.alwaysApprove && pending && !this.data.alwaysApproveTools.includes(pending.toolName)) {
			this.data.alwaysApproveTools.push(pending.toolName);
		}
	}

	reject(callId: string, opts: { alwaysReject?: boolean; message?: string } = {}): void {
		const pending = this.data.pendingApprovals.find((p) => p.callId === callId);
		this.data.decisionsByCallId[callId] = { decision: 'reject', message: opts.message };
		if (opts.alwaysReject && pending && !this.data.alwaysRejectTools.includes(pending.toolName)) {
			this.data.alwaysRejectTools.push(pending.toolName);
		}
	}

	decisionFor(callId: string, toolName: string): ResolvedApproval | undefined {
		const explicit = this.data.decisionsByCallId[callId];
		if (explicit) return explicit;
		if (this.data.alwaysApproveTools.includes(toolName)) return { decision: 'approve' };
		if (this.data.alwaysRejectTools.includes(toolName)) return { decision: 'reject' };
		return undefined;
	}

	setPending(pending: PendingApproval[]): void {
		this.data.pendingApprovals = pending;
	}

	clearResolved(): void {
		const stillPending = this.data.pendingApprovals.filter(
			(p) => !this.decisionFor(p.callId, p.toolName)
		);
		this.data.pendingApprovals = stillPending;
	}
}
