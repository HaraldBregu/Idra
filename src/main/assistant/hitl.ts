import { randomUUID } from 'node:crypto';
import type { EventBus } from '../core/event-bus';
import type { ApprovalStreamLike } from './tools/types';

export interface PendingApprovalView {
	id: string;
	toolName: string;
	question: string;
	args: unknown;
}

export interface PendingInputView {
	id: string;
	question: string;
	suggestions?: string[];
}

interface PendingApproval {
	resolve: (approved: boolean) => void;
	reject: (err: Error) => void;
	view: PendingApprovalView;
}

interface PendingInput {
	resolve: (answer: string) => void;
	reject: (err: Error) => void;
	view: PendingInputView;
}

/**
 * Pluggable HITL streams. The host's main process holds the registries
 * and bridges them to IPC: when a tool calls `ask()`, broadcast a
 * pending event; when the renderer responds (or the run is cancelled),
 * resolve/reject the pending Promise.
 */
export class HitlBridge implements ApprovalStreamLike {
	private readonly approvals = new Map<string, PendingApproval>();
	private readonly inputs = new Map<string, PendingInput>();

	constructor(
		private readonly eventBus: EventBus,
		private readonly assistantId: string
	) {}

	/** Implements ApprovalStreamLike — used by tools/before-call. */
	ask(question: string, args?: unknown, toolName?: string): Promise<boolean> {
		return this.requestApproval({ question, args, toolName: toolName ?? 'unknown' });
	}

	/** Distinct from `ask()` only via the typed alias below. */
	askInput(question: string, suggestions?: string[]): Promise<string> {
		return this.requestInput(question, suggestions);
	}

	requestApproval(opts: { toolName: string; question: string; args: unknown }): Promise<boolean> {
		return new Promise<boolean>((resolve, reject) => {
			const id = randomUUID();
			const view: PendingApprovalView = {
				id,
				toolName: opts.toolName,
				question: opts.question,
				args: opts.args,
			};
			this.approvals.set(id, { resolve, reject, view });
			this.broadcast();
		});
	}

	requestInput(question: string, suggestions?: string[]): Promise<string> {
		return new Promise<string>((resolve, reject) => {
			const id = randomUUID();
			const view: PendingInputView = { id, question, suggestions };
			this.inputs.set(id, { resolve, reject, view });
			this.broadcast();
		});
	}

	resolveApproval(id: string, approved: boolean): boolean {
		const entry = this.approvals.get(id);
		if (!entry) return false;
		this.approvals.delete(id);
		entry.resolve(approved);
		this.broadcast();
		return true;
	}

	resolveInput(id: string, answer: string): boolean {
		const entry = this.inputs.get(id);
		if (!entry) return false;
		this.inputs.delete(id);
		entry.resolve(answer);
		this.broadcast();
		return true;
	}

	/** Reject every outstanding ask — used when the user cancels the run. */
	cancelAll(reason = 'cancelled'): void {
		for (const entry of this.approvals.values()) entry.reject(new Error(reason));
		this.approvals.clear();
		for (const entry of this.inputs.values()) entry.reject(new Error(reason));
		this.inputs.clear();
		this.broadcast();
	}

	getPending(): { approvals: PendingApprovalView[]; inputs: PendingInputView[] } {
		return {
			approvals: [...this.approvals.values()].map((p) => p.view),
			inputs: [...this.inputs.values()].map((p) => p.view),
		};
	}

	hasPending(): boolean {
		return this.approvals.size > 0 || this.inputs.size > 0;
	}

	private broadcast(): void {
		this.eventBus.broadcast('assistant:pending', {
			assistantId: this.assistantId,
			...this.getPending(),
		});
	}
}
