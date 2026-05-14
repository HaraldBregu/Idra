import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import type { ResponseInputItem } from 'openai/resources/responses/responses';

export type ApprovalDecision = 'approve' | 'reject';

export interface PendingApproval {
	callId: string;
	toolName: string;
	arguments: string;
}

export interface PendingInputRequest {
	callId: string;
	toolName: string;
	question: string;
	suggestions?: string[];
}

export interface PendingToolCall {
	callId: string;
	name: string;
	arguments: string;
}

export interface ResolvedApproval {
	decision: ApprovalDecision;
	message?: string;
	editedArguments?: string;
}

export interface RunMeta {
	provider?: string;
	model?: string;
}

export interface RunStateData {
	runId: string;
	userMessage: string;
	systemPrompt?: string;
	provider?: string;
	model?: string;
	input: ResponseInputItem[];
	newMessages: ChatCompletionMessageParam[];
	iteration: number;
	pendingApprovals: PendingApproval[];
	pendingInputRequests: PendingInputRequest[];
	pendingToolCalls: PendingToolCall[];
	decisionsByCallId: Record<string, ResolvedApproval>;
	inputResponses: Record<string, string>;
	alwaysApproveTools: string[];
	alwaysRejectTools: string[];
}

export class RunState {
	private constructor(public data: RunStateData) {}

	static initial(params: {
		runId: string;
		userMessage: string;
		systemPrompt?: string;
		provider?: string;
		model?: string;
		input: ResponseInputItem[];
		newMessages: ChatCompletionMessageParam[];
	}): RunState {
		return new RunState({
			runId: params.runId,
			userMessage: params.userMessage,
			systemPrompt: params.systemPrompt,
			provider: params.provider,
			model: params.model,
			input: params.input,
			newMessages: params.newMessages,
			iteration: 0,
			pendingApprovals: [],
			pendingInputRequests: [],
			pendingToolCalls: [],
			decisionsByCallId: {},
			inputResponses: {},
			alwaysApproveTools: [],
			alwaysRejectTools: [],
		});
	}

	static fromJSON(raw: RunStateData): RunState {
		return new RunState({
			runId: raw.runId,
			userMessage: raw.userMessage,
			systemPrompt: raw.systemPrompt,
			provider: raw.provider,
			model: raw.model,
			input: raw.input ?? [],
			newMessages: raw.newMessages ?? [],
			iteration: raw.iteration ?? 0,
			pendingApprovals: raw.pendingApprovals ?? [],
			pendingInputRequests: raw.pendingInputRequests ?? [],
			pendingToolCalls: raw.pendingToolCalls ?? [],
			decisionsByCallId: raw.decisionsByCallId ?? {},
			inputResponses: raw.inputResponses ?? {},
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

	pendingInputs(): PendingInputRequest[] {
		return [...this.data.pendingInputRequests];
	}

	hasPending(): boolean {
		return this.data.pendingApprovals.length > 0;
	}

	hasPendingInputs(): boolean {
		return this.data.pendingInputRequests.length > 0;
	}

	hasAnyPending(): boolean {
		return this.hasPending() || this.hasPendingInputs();
	}

	approve(
		callId: string,
		opts: { alwaysApprove?: boolean; editedArguments?: string } = {}
	): void {
		const pending = this.data.pendingApprovals.find((p) => p.callId === callId);
		this.data.decisionsByCallId[callId] = {
			decision: 'approve',
			editedArguments: opts.editedArguments,
		};
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

	recordInputResponse(callId: string, answer: string): void {
		this.data.inputResponses[callId] = answer;
	}

	inputResponseFor(callId: string): string | undefined {
		return this.data.inputResponses[callId];
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

	setPendingInputs(pending: PendingInputRequest[]): void {
		this.data.pendingInputRequests = pending;
	}

	clearResolved(): void {
		this.data.pendingApprovals = this.data.pendingApprovals.filter(
			(p) => !this.decisionFor(p.callId, p.toolName)
		);
		this.data.pendingInputRequests = this.data.pendingInputRequests.filter(
			(p) => this.data.inputResponses[p.callId] === undefined
		);
	}
}
