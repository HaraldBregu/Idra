import { randomUUID } from 'node:crypto';
import { ApprovalGateway, type ApprovalKind, type ApprovalRecord } from './approval/gateway';
import type { EventBus } from './core/event-bus';
import type { ApprovalStreamLike } from './tools/types';
import type { ApprovalDecision } from '../shared/agents/service';

const DEFAULT_APPROVAL_TIMEOUT_MS = 5 * 60_000;
const SECRET_KEY_PATTERN = /(token|secret|password|passwd|api[_-]?key|credential|private[_-]?key)/i;

export interface PendingApprovalView {
	id: string;
	kind: 'exec' | 'plugin' | 'api' | 'tool';
	toolName: string;
	runId?: string;
	toolCallId?: string;
	question: string;
	title: string;
	description?: string;
	argsPreview?: unknown;
	derivedPaths?: string[];
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
	private readonly gateway = new ApprovalGateway((event) => {
		this.eventBus.broadcast(event.type, event);
		this.broadcast();
	});
	private readonly inputs = new Map<string, PendingInput>();

	constructor(
		private readonly eventBus: EventBus,
		private readonly agentId: string
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
		runId?: string;
		toolCallId?: string;
		derivedPaths?: string[];
		timeoutMs?: number;
		allowedDecisions?: ApprovalDecision[];
	}): Promise<ApprovalDecision | null> {
		const argsPreview = sanitizePreview(opts.args);
		const argRecord =
			opts.args && typeof opts.args === 'object' ? (opts.args as Record<string, unknown>) : {};
		const kind = opts.kind ?? inferApprovalKind(opts.toolName);
		const record = this.gateway.request({
			kind: toGatewayKind(kind),
			title: opts.title ?? opts.question,
			description: opts.description,
			requestPayload: {
				toolName: opts.toolName,
				runId: opts.runId,
				toolCallId: opts.toolCallId,
				question: opts.question,
				argsPreview,
				derivedPaths: normalizePaths(opts.derivedPaths),
			},
			agentId: this.agentId,
			sessionId: this.agentId,
			timeoutMs: opts.timeoutMs ?? DEFAULT_APPROVAL_TIMEOUT_MS,
			allowedDecisions: opts.allowedDecisions,
			execBinding:
				kind === 'exec' && typeof argRecord.command === 'string'
					? {
							command: argRecord.command,
							rawCommand: argRecord.command,
							cwd: typeof argRecord.workdir === 'string' ? argRecord.workdir : undefined,
							agentId: this.agentId,
							sessionKey: this.agentId,
							envKeys: envKeys(argRecord.env),
						}
					: undefined,
		});
		return this.gateway.waitDecision(record.kind, record.id).then((decision) => {
			return decision === 'allow-once' || decision === 'allow-always' || decision === 'deny'
				? decision
				: null;
		});
	}

	waitApprovalDecision(id: string): Promise<ApprovalDecision | null> | null {
		const record =
			this.gateway.get('exec', id) ??
			this.gateway.get('tool', id) ??
			this.gateway.get('api', id) ??
			this.gateway.get('plugin', id);
		if (!record) return null;
		return this.gateway.waitDecision(record.kind, id).then((decision) => {
			return decision === 'allow-once' || decision === 'allow-always' || decision === 'deny'
				? decision
				: null;
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
		const normalized = normalizeDecision(decision);
		const result = this.gateway.resolveAny(id, normalized, this.agentId);
		return result.ok;
	}

	expireApproval(id: string): boolean {
		const record =
			this.gateway.get('exec', id) ??
			this.gateway.get('tool', id) ??
			this.gateway.get('api', id) ??
			this.gateway.get('plugin', id);
		if (!record) return false;
		const result = this.gateway.resolve(record.kind, record.id, 'deny', this.agentId);
		return result.ok;
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
		this.gateway.cancelAll(reason === 'cancelled' ? 'cancelled' : 'unavailable');
		for (const entry of this.inputs.values()) entry.reject(new Error(reason));
		this.inputs.clear();
		this.broadcast();
	}

	getPending(): { approvals: PendingApprovalView[]; inputs: PendingInputView[] } {
		return {
			approvals: this.gateway.list().map(recordToPendingApproval),
			inputs: [...this.inputs.values()].map((p) => p.view),
		};
	}

	hasPending(): boolean {
		return this.gateway.list().length > 0 || this.inputs.size > 0;
	}

	private broadcast(): void {
		this.eventBus.broadcast('agent:pending', {
			agentId: this.agentId,
			...this.getPending(),
		});
	}
}

function inferApprovalKind(toolName: string): PendingApprovalView['kind'] {
	if (toolName === 'exec' || toolName === 'process') return 'exec';
	if (toolName.startsWith('plugin:')) return 'plugin';
	if (toolName.startsWith('connector:')) return 'api';
	return 'tool';
}

function toGatewayKind(kind: PendingApprovalView['kind']): ApprovalKind {
	return kind;
}

function recordToPendingApproval(record: ApprovalRecord): PendingApprovalView {
	const payload =
		record.requestPayload && typeof record.requestPayload === 'object'
			? (record.requestPayload as Record<string, unknown>)
			: {};
	const argsPreview = payload.argsPreview;
	const argRecord =
		argsPreview && typeof argsPreview === 'object' ? (argsPreview as Record<string, unknown>) : {};
	return {
		id: record.id,
		kind: record.kind,
		toolName: typeof payload.toolName === 'string' ? payload.toolName : record.kind,
		runId: typeof payload.runId === 'string' ? payload.runId : record.sessionId,
		toolCallId: typeof payload.toolCallId === 'string' ? payload.toolCallId : undefined,
		question: typeof payload.question === 'string' ? payload.question : record.title,
		title: record.title,
		description: record.description,
		argsPreview,
		derivedPaths: normalizePaths(payload.derivedPaths),
		command: typeof argRecord.command === 'string' ? argRecord.command : undefined,
		cwd: typeof argRecord.workdir === 'string' ? argRecord.workdir : undefined,
		envKeys: envKeys(argRecord.env),
		createdAtMs: record.createdAtMs,
		expiresAtMs: record.expiresAtMs,
		allowedDecisions: record.allowedDecisions,
	};
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

function normalizePaths(value: unknown): string[] | undefined {
	if (!Array.isArray(value)) return undefined;
	const paths = value.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0);
	return paths.length > 0 ? [...new Set(paths)] : undefined;
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
