import { randomUUID } from 'node:crypto';
import type { EventBus } from './core/event-bus';
import type { ApprovalStreamLike } from './tools/types';
import type { ApprovalDecision } from '../shared/service';

const DEFAULT_APPROVAL_TIMEOUT_MS = 5 * 60_000;
const RESOLVED_RETENTION_MS = 30_000;
const SECRET_KEY_PATTERN = /(token|secret|password|passwd|api[_-]?key|credential|private[_-]?key)/i;

export interface PendingApprovalView {
	id: string;
	kind: 'exec' | 'plugin' | 'api' | 'tool';
	toolName: string;
	question: string;
	title: string;
	description?: string;
	argsPreview?: unknown;
	command?: string;
	cwd?: string;
	envKeys?: string[];
	createdAtMs: number;
	expiresAtMs: number;
	allowedDecisions: ApprovalDecision[];
}

export interface PendingInputView {
	id: string;
	question: string;
	suggestions?: string[];
}

interface PendingApproval {
	resolve: (decision: ApprovalDecision | null) => void;
	reject: (err: Error) => void;
	view: PendingApprovalView;
	timer: ReturnType<typeof setTimeout>;
	resolvedAtMs?: number;
	decision?: ApprovalDecision | null;
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
	private readonly resolvedApprovals = new Map<string, PendingApproval>();
	private readonly inputs = new Map<string, PendingInput>();

	constructor(
		private readonly eventBus: EventBus,
		private readonly assistantId: string
	) {}

	/** Implements ApprovalStreamLike — used by tools/before-call. */
	ask(question: string, args?: unknown, toolName?: string): Promise<ApprovalDecision | null> {
		return this.requestApproval({ question, args, toolName: toolName ?? 'unknown' });
	}

	/** Distinct from `ask()` only via the typed alias below. */
	askInput(question: string, suggestions?: string[]): Promise<string> {
		return this.requestInput(question, suggestions);
	}

	requestApproval(opts: {
		toolName: string;
		question: string;
		args: unknown;
		kind?: PendingApprovalView['kind'];
		title?: string;
		description?: string;
		timeoutMs?: number;
		allowedDecisions?: ApprovalDecision[];
	}): Promise<ApprovalDecision | null> {
		return new Promise<ApprovalDecision | null>((resolve, reject) => {
			const id = randomUUID();
			const createdAtMs = Date.now();
			const timeoutMs = Math.max(1, opts.timeoutMs ?? DEFAULT_APPROVAL_TIMEOUT_MS);
			const expiresAtMs = createdAtMs + timeoutMs;
			const argsPreview = sanitizePreview(opts.args);
			const argRecord =
				opts.args && typeof opts.args === 'object' ? (opts.args as Record<string, unknown>) : {};
			const view: PendingApprovalView = {
				id,
				kind: opts.kind ?? inferApprovalKind(opts.toolName),
				toolName: opts.toolName,
				question: opts.question,
				title: opts.title ?? opts.question,
				description: opts.description,
				argsPreview,
				command: typeof argRecord.command === 'string' ? argRecord.command : undefined,
				cwd: typeof argRecord.workdir === 'string' ? argRecord.workdir : undefined,
				envKeys: envKeys(argRecord.env),
				createdAtMs,
				expiresAtMs,
				allowedDecisions: opts.allowedDecisions ?? ['allow-once', 'allow-always', 'deny'],
			};
			const timer = setTimeout(() => {
				this.expireApproval(id);
			}, timeoutMs);
			timer.unref?.();
			this.approvals.set(id, { resolve, reject, view, timer });
			this.broadcast();
		});
	}

	waitApprovalDecision(id: string): Promise<ApprovalDecision | null> | null {
		const entry = this.approvals.get(id) ?? this.resolvedApprovals.get(id);
		if (!entry) return null;
		if (entry.resolvedAtMs !== undefined) return Promise.resolve(entry.decision ?? null);
		return new Promise((resolve, reject) => {
			const originalResolve = entry.resolve;
			const originalReject = entry.reject;
			entry.resolve = (decision) => {
				originalResolve(decision);
				resolve(decision);
			};
			entry.reject = (err) => {
				originalReject(err);
				reject(err);
			};
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

	resolveApproval(id: string, decision: ApprovalDecision | boolean): boolean {
		const entry = this.approvals.get(id);
		if (!entry) return false;
		const normalized = normalizeDecision(decision);
		if (!entry.view.allowedDecisions.includes(normalized)) return false;
		this.approvals.delete(id);
		clearTimeout(entry.timer);
		entry.decision = normalized;
		entry.resolvedAtMs = Date.now();
		entry.resolve(normalized);
		this.retainResolved(id, entry);
		this.broadcast();
		return true;
	}

	expireApproval(id: string): boolean {
		const entry = this.approvals.get(id);
		if (!entry) return false;
		this.approvals.delete(id);
		entry.decision = null;
		entry.resolvedAtMs = Date.now();
		entry.resolve(null);
		this.retainResolved(id, entry);
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
		for (const entry of this.approvals.values()) {
			clearTimeout(entry.timer);
			entry.reject(new Error(reason));
		}
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

	private retainResolved(id: string, entry: PendingApproval): void {
		this.resolvedApprovals.set(id, entry);
		const timer = setTimeout(() => {
			this.resolvedApprovals.delete(id);
		}, RESOLVED_RETENTION_MS);
		timer.unref?.();
	}

	private broadcast(): void {
		this.eventBus.broadcast('assistant:pending', {
			assistantId: this.assistantId,
			...this.getPending(),
		});
	}
}

function inferApprovalKind(toolName: string): PendingApprovalView['kind'] {
	if (toolName === 'exec' || toolName === 'process') return 'exec';
	if (toolName.startsWith('connector:')) return 'api';
	return 'tool';
}

function normalizeDecision(decision: ApprovalDecision | boolean): ApprovalDecision {
	if (decision === true) return 'allow-once';
	if (decision === false) return 'deny';
	return decision;
}

function envKeys(value: unknown): string[] | undefined {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
	return Object.keys(value as Record<string, unknown>).sort();
}

function sanitizePreview(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(sanitizePreview);
	if (!value || typeof value !== 'object') return value;
	const out: Record<string, unknown> = {};
	for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
		if (SECRET_KEY_PATTERN.test(key)) {
			out[key] = '[redacted]';
		} else if (key === 'env' && raw && typeof raw === 'object' && !Array.isArray(raw)) {
			out[key] = Object.fromEntries(
				Object.keys(raw as Record<string, unknown>)
					.sort()
					.map((envKey) => [envKey, SECRET_KEY_PATTERN.test(envKey) ? '[redacted]' : '[set]'])
			);
		} else {
			out[key] = sanitizePreview(raw);
		}
	}
	return out;
}
