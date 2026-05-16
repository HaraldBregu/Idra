import { randomUUID } from 'node:crypto';
import type { ApprovalDecision } from '../../shared/service';

export type ApprovalKind = 'exec' | 'plugin' | 'api' | 'tool';
export type ApprovalStatus = 'pending' | 'resolved' | 'expired' | 'cancelled';
export type ApprovalTerminalDecision = ApprovalDecision | 'timeout' | 'cancelled' | 'unavailable';
export type ApprovalSeverity = 'info' | 'warning' | 'critical';

export interface ExecApprovalBinding {
	command: string;
	rawCommand?: string;
	cwd?: string;
	agentId?: string;
	sessionKey?: string;
	envKeys?: string[];
}

export interface ApprovalRequestInput {
	kind: ApprovalKind;
	title: string;
	description?: string;
	requestPayload: unknown;
	agentId?: string;
	sessionId?: string;
	channelId?: string;
	accountId?: string;
	senderId?: string;
	severity?: ApprovalSeverity;
	timeoutMs?: number;
	allowedDecisions?: ApprovalDecision[];
	execBinding?: ExecApprovalBinding;
}

export interface ApprovalRecord {
	id: string;
	shortId: string;
	kind: ApprovalKind;
	title: string;
	description?: string;
	requestPayload: unknown;
	agentId?: string;
	sessionId?: string;
	channelId?: string;
	accountId?: string;
	senderId?: string;
	severity: ApprovalSeverity;
	createdAtMs: number;
	expiresAtMs: number;
	status: ApprovalStatus;
	allowedDecisions: ApprovalDecision[];
	resolvedAtMs?: number;
	resolvedBy?: string;
	decision?: ApprovalTerminalDecision;
	execBinding?: ExecApprovalBinding;
	consumedAtMs?: number;
}

export type ApprovalEvent =
	| { type: `${ApprovalKind}.approval.requested`; record: ApprovalRecord }
	| { type: `${ApprovalKind}.approval.resolved`; record: ApprovalRecord };

export type ApprovalResolveResult =
	| { ok: true; record: ApprovalRecord }
	| { ok: false; error: 'not_found' | 'ambiguous' | 'invalid_decision' | 'wrong_kind' | 'already_consumed' };

interface PendingApproval extends ApprovalRecord {
	timer: ReturnType<typeof setTimeout>;
	waiters: Array<(record: ApprovalRecord) => void>;
}

const DEFAULT_APPROVAL_TIMEOUT_MS = 5 * 60_000;
const RESOLVED_RETENTION_MS = 30_000;
const DEFAULT_ALLOWED_DECISIONS: ApprovalDecision[] = ['allow-once', 'allow-always', 'deny'];
const SHORT_ID_LENGTH = 8;

export class ApprovalGateway {
	private readonly pending = new Map<string, PendingApproval>();
	private readonly resolved = new Map<string, ApprovalRecord>();
	private readonly retainTimers = new Map<string, ReturnType<typeof setTimeout>>();

	constructor(
		private readonly emit?: (event: ApprovalEvent) => void,
		private readonly idFactory: () => string = randomUUID
	) {}

	request(input: ApprovalRequestInput): ApprovalRecord {
		const allowedDecisions = normalizeAllowedDecisions(input.allowedDecisions);
		const generatedId = this.idFactory();
		const id = input.kind === 'plugin' ? `plugin:${generatedId}` : generatedId;
		const now = Date.now();
		const timeoutMs = Math.max(1, input.timeoutMs ?? DEFAULT_APPROVAL_TIMEOUT_MS);
		const record: PendingApproval = {
			id,
			shortId: shortId(id),
			kind: input.kind,
			title: assertNonEmptyString(input.title, 'approval title'),
			description: input.description,
			requestPayload: input.requestPayload,
			agentId: input.agentId,
			sessionId: input.sessionId,
			channelId: input.channelId,
			accountId: input.accountId,
			senderId: input.senderId,
			severity: input.severity ?? 'warning',
			createdAtMs: now,
			expiresAtMs: now + timeoutMs,
			status: 'pending',
			allowedDecisions,
			execBinding: input.kind === 'exec' ? normalizeExecBinding(input.execBinding) : undefined,
			waiters: [],
			timer: setTimeout(() => {
				this.expire(id);
			}, timeoutMs),
		};
		record.timer.unref?.();
		this.pending.set(id, record);
		this.emit?.({ type: `${record.kind}.approval.requested`, record: stripRuntime(record) });
		return stripRuntime(record);
	}

	get(kind: ApprovalKind, idOrPrefix: string): ApprovalRecord | null {
		const resolved = this.resolveRecord(kind, idOrPrefix);
		return resolved.ok ? stripRuntime(resolved.record) : null;
	}

	list(kind?: ApprovalKind): ApprovalRecord[] {
		return [...this.pending.values()]
			.filter((record) => kind === undefined || record.kind === kind)
			.map(stripRuntime);
	}

	waitDecision(kind: ApprovalKind, idOrPrefix: string, signal?: AbortSignal): Promise<ApprovalTerminalDecision | null> {
		const resolved = this.resolveRecord(kind, idOrPrefix);
		if (!resolved.ok) return Promise.resolve(null);
		const record = resolved.record;
		if (record.status !== 'pending') return Promise.resolve(record.decision ?? null);
		const pending = this.pending.get(record.id);
		if (!pending) return Promise.resolve(record.decision ?? null);
		if (signal?.aborted) return Promise.resolve('cancelled');
		return new Promise((resolve) => {
			const abort = (): void => {
				signal?.removeEventListener('abort', abort);
				resolve('cancelled');
			};
			signal?.addEventListener('abort', abort, { once: true });
			pending.waiters.push((next) => {
				signal?.removeEventListener('abort', abort);
				resolve(next.decision ?? null);
			});
		});
	}

	resolve(
		kind: ApprovalKind,
		idOrPrefix: string,
		decision: ApprovalDecision,
		resolvedBy?: string
	): ApprovalResolveResult {
		if (kind === 'exec' && idOrPrefix.startsWith('plugin:')) return { ok: false, error: 'wrong_kind' };
		const resolved = this.resolveRecord(kind, idOrPrefix);
		if (!resolved.ok) return resolved;
		const record = resolved.record;
		if (!record.allowedDecisions.includes(decision)) return { ok: false, error: 'invalid_decision' };
		if (record.status !== 'pending') {
			return record.decision === decision
				? { ok: true, record: stripRuntime(record) }
				: { ok: false, error: 'invalid_decision' };
		}
		return { ok: true, record: this.finish(record.id, decision, resolvedBy) };
	}

	resolveAny(idOrPrefix: string, decision: ApprovalDecision, resolvedBy?: string): ApprovalResolveResult {
		if (idOrPrefix.startsWith('plugin:')) return this.resolve('plugin', idOrPrefix, decision, resolvedBy);
		const exec = this.resolve('exec', idOrPrefix, decision, resolvedBy);
		if (exec.ok || exec.error !== 'not_found') return exec;
		const tool = this.resolve('tool', idOrPrefix, decision, resolvedBy);
		if (tool.ok || tool.error !== 'not_found') return tool;
		const api = this.resolve('api', idOrPrefix, decision, resolvedBy);
		if (api.ok || api.error !== 'not_found') return api;
		return this.resolve('plugin', idOrPrefix, decision, resolvedBy);
	}

	assertExecBinding(idOrPrefix: string, binding: ExecApprovalBinding): ApprovalResolveResult {
		const resolved = this.resolveRecord('exec', idOrPrefix);
		if (!resolved.ok) return resolved;
		const record = resolved.record;
		if (!sameExecBinding(record.execBinding, normalizeExecBinding(binding))) return { ok: false, error: 'wrong_kind' };
		return { ok: true, record: stripRuntime(record) };
	}

	consumeAllowOnce(kind: ApprovalKind, idOrPrefix: string): ApprovalResolveResult {
		const resolved = this.resolveRecord(kind, idOrPrefix);
		if (!resolved.ok) return resolved;
		const record = resolved.record;
		if (record.decision !== 'allow-once') return { ok: true, record: stripRuntime(record) };
		if (record.consumedAtMs !== undefined) return { ok: false, error: 'already_consumed' };
		record.consumedAtMs = Date.now();
		this.resolved.set(record.id, stripRuntime(record));
		return { ok: true, record: stripRuntime(record) };
	}

	cancelAll(reason: 'cancelled' | 'unavailable' = 'cancelled'): void {
		for (const id of [...this.pending.keys()]) this.finish(id, reason);
	}

	private expire(id: string): void {
		const record = this.pending.get(id);
		if (!record) return;
		this.finish(id, 'timeout');
	}

	private finish(
		id: string,
		decision: ApprovalTerminalDecision,
		resolvedBy?: string
	): ApprovalRecord {
		const pending = this.pending.get(id);
		if (!pending) {
			const retained = this.resolved.get(id);
			if (!retained) throw new Error(`approval not found: ${id}`);
			return retained;
		}
		this.pending.delete(id);
		clearTimeout(pending.timer);
		const record: ApprovalRecord = {
			...stripRuntime(pending),
			status: decision === 'timeout' ? 'expired' : decision === 'cancelled' ? 'cancelled' : 'resolved',
			decision,
			resolvedAtMs: Date.now(),
			resolvedBy,
		};
		this.resolved.set(id, record);
		this.emit?.({ type: `${record.kind}.approval.resolved`, record });
		for (const waiter of pending.waiters) waiter(record);
		this.retain(id);
		return record;
	}

	private retain(id: string): void {
		clearTimeout(this.retainTimers.get(id));
		const timer = setTimeout(() => {
			this.resolved.delete(id);
			this.retainTimers.delete(id);
		}, RESOLVED_RETENTION_MS);
		timer.unref?.();
		this.retainTimers.set(id, timer);
	}

	private resolveRecord(kind: ApprovalKind, idOrPrefix: string): ApprovalResolveResult {
		if (!idOrPrefix.trim()) return { ok: false, error: 'not_found' };
		const all = [...this.pending.values(), ...this.resolved.values()].filter((record) => record.kind === kind);
		const exact = all.find((record) => record.id === idOrPrefix);
		if (exact) return { ok: true, record: exact };
		const matches = all.filter((record) => record.shortId.startsWith(idOrPrefix) || record.id.startsWith(idOrPrefix));
		if (matches.length === 0) return { ok: false, error: 'not_found' };
		if (matches.length > 1) return { ok: false, error: 'ambiguous' };
		return { ok: true, record: matches[0]! };
	}
}

function normalizeAllowedDecisions(input?: ApprovalDecision[]): ApprovalDecision[] {
	const values = input ?? DEFAULT_ALLOWED_DECISIONS;
	const unique = values.filter((value, index) => values.indexOf(value) === index);
	if (unique.length === 0 || !unique.every(isApprovalDecision)) {
		throw new Error('approval allowedDecisions must contain valid decisions');
	}
	return unique;
}

function isApprovalDecision(value: string): value is ApprovalDecision {
	return value === 'allow-once' || value === 'allow-always' || value === 'deny';
}

function assertNonEmptyString(value: string, field: string): string {
	const trimmed = value.trim();
	if (!trimmed) throw new Error(`${field} is required`);
	return trimmed;
}

function shortId(id: string): string {
	const bare = id.startsWith('plugin:') ? id.slice('plugin:'.length) : id;
	return bare.slice(0, SHORT_ID_LENGTH);
}

function normalizeExecBinding(binding: ExecApprovalBinding | undefined): ExecApprovalBinding | undefined {
	if (!binding) return undefined;
	return {
		command: binding.command,
		rawCommand: binding.rawCommand,
		cwd: binding.cwd,
		agentId: binding.agentId,
		sessionKey: binding.sessionKey,
		envKeys: binding.envKeys ? [...binding.envKeys].sort() : undefined,
	};
}

function sameExecBinding(a: ExecApprovalBinding | undefined, b: ExecApprovalBinding | undefined): boolean {
	return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

function stripRuntime(record: PendingApproval | ApprovalRecord): ApprovalRecord {
	const { timer: _timer, waiters: _waiters, ...safe } = record as PendingApproval;
	return { ...safe };
}
