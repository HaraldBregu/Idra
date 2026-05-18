import type {
	FridayCronAddRequest,
	FridayCronCanonicalToolRequest,
	FridayCronDelivery,
	FridayCronFailureAlert,
	FridayCronPayload,
	FridayCronSchedule,
	FridayCronSessionTarget,
	FridayCronToolRequest,
	FridayCronUpdateRequest,
	FridayCronWakeMode,
} from '../../../shared/cron';
import type { FridayCronActor } from './scheduler';

export interface FridayCronNormalizeContext {
	actor?: FridayCronActor;
	recentContext?: string;
	delivery?: Partial<FridayCronDelivery>;
}

const CONTROL_FIELDS = new Set([
	'action',
	'id',
	'jobId',
	'job',
	'patch',
	'contextMessages',
	'timeoutMs',
	'includeDisabled',
	'include',
	'agentId',
	'runMode',
	'mode',
	'force',
	'limit',
]);

const AGENT_TURN_FIELDS = [
	'model',
	'fallbacks',
	'thinking',
	'timeoutSeconds',
	'lightContext',
	'allowUnsafeExternalContent',
	'toolsAllow',
] as const;

function record(value: unknown): Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
		? value as Record<string, unknown>
		: {};
}

function hasOwn(input: Record<string, unknown>, key: string): boolean {
	return Object.prototype.hasOwnProperty.call(input, key);
}

function stringValue(value: unknown): string | undefined {
	return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function stringOrNull(value: unknown): string | null | undefined {
	if (value === null) return null;
	return stringValue(value);
}

function numberValue(value: unknown): number | undefined {
	if (typeof value === 'number' && Number.isFinite(value)) return value;
	if (typeof value === 'string' && value.trim().length > 0) {
		const parsed = Number(value);
		if (Number.isFinite(parsed)) return parsed;
	}
	return undefined;
}

function booleanValue(value: unknown): boolean | undefined {
	if (typeof value === 'boolean') return value;
	if (typeof value === 'string') {
		if (value.toLowerCase() === 'true') return true;
		if (value.toLowerCase() === 'false') return false;
	}
	return undefined;
}

function stringArray(value: unknown): string[] | undefined {
	if (!Array.isArray(value)) return undefined;
	const out = value
		.map((entry) => stringValue(entry))
		.filter((entry): entry is string => Boolean(entry));
	return out.length > 0 ? out : [];
}

function unwrapJob(input: unknown): Record<string, unknown> {
	let current = record(input);
	for (const key of ['job', 'data'] as const) {
		const wrapped = record(current[key]);
		if (Object.keys(wrapped).length > 0) current = wrapped;
	}
	return current;
}

function normalizeAtTimestamp(value: string): string {
	const trimmed = value.trim();
	if (/^\d{4}-\d{2}-\d{2}T/.test(trimmed) && !/(Z|[+-]\d{2}:\d{2})$/i.test(trimmed)) {
		return `${trimmed}Z`;
	}
	return trimmed;
}

function scheduleFrom(input: Record<string, unknown>): FridayCronSchedule | undefined {
	const explicit = record(input.schedule);
	const source = Object.keys(explicit).length > 0 ? explicit : input;
	const kind = stringValue(source.kind);

	if (kind === 'at' || hasOwn(source, 'at') || hasOwn(source, 'atMs')) {
		const at = stringValue(source.at);
		const atMs = numberValue(source.atMs);
		if (at) return { kind: 'at', at: normalizeAtTimestamp(at) };
		if (atMs !== undefined) return { kind: 'at', at: new Date(atMs).toISOString() };
	}

	if (kind === 'every' || hasOwn(source, 'everyMs')) {
		const everyMs = numberValue(source.everyMs);
		if (everyMs !== undefined) {
			const anchorMs = numberValue(source.anchorMs);
			return anchorMs === undefined
				? { kind: 'every', everyMs }
				: { kind: 'every', everyMs, anchorMs };
		}
	}

	if (kind === 'cron' || hasOwn(source, 'expr') || hasOwn(source, 'cron')) {
		const expr = stringValue(source.expr) ?? stringValue(source.cron);
		if (expr) {
			const schedule: FridayCronSchedule = {
				kind: 'cron',
				expr,
			};
			const tz = stringValue(source.tz);
			const staggerMs = booleanValue(source.exact) === true ? 0 : numberValue(source.staggerMs);
			if (tz) schedule.tz = tz;
			if (staggerMs !== undefined) schedule.staggerMs = staggerMs;
			return schedule;
		}
	}

	return undefined;
}

function copyAgentTurnFields(
	target: Extract<FridayCronPayload, { kind: 'agentTurn' }>,
	source: Record<string, unknown>
): void {
	const model = stringValue(source.model);
	const fallbacks = stringArray(source.fallbacks);
	const thinking = stringValue(source.thinking);
	const timeoutSeconds = numberValue(source.timeoutSeconds);
	const lightContext = booleanValue(source.lightContext);
	const allowUnsafeExternalContent = booleanValue(source.allowUnsafeExternalContent);
	const toolsAllow = stringArray(source.toolsAllow);

	if (model) target.model = model;
	if (fallbacks) target.fallbacks = fallbacks;
	if (thinking === 'low' || thinking === 'medium' || thinking === 'high') target.thinking = thinking;
	if (timeoutSeconds !== undefined) target.timeoutSeconds = timeoutSeconds;
	if (lightContext !== undefined) target.lightContext = lightContext;
	if (allowUnsafeExternalContent !== undefined) {
		target.allowUnsafeExternalContent = allowUnsafeExternalContent;
	}
	if (toolsAllow) target.toolsAllow = toolsAllow;
}

function payloadFrom(input: Record<string, unknown>, recentContext?: string): FridayCronPayload | undefined {
	const explicit = record(input.payload);
	if (Object.keys(explicit).length > 0) {
		if (explicit.kind === 'systemEvent') {
			const text = stringValue(explicit.text);
			if (!text) return undefined;
			return {
				kind: 'systemEvent',
				text: appendRecentContext(text, recentContext),
			};
		}
		if (explicit.kind === 'agentTurn') {
			const message = stringValue(explicit.message);
			if (!message) return undefined;
			const payload: Extract<FridayCronPayload, { kind: 'agentTurn' }> = {
				kind: 'agentTurn',
				message,
			};
			copyAgentTurnFields(payload, { ...input, ...explicit });
			return payload;
		}
	}

	const message = stringValue(input.message);
	if (message) {
		const payload: Extract<FridayCronPayload, { kind: 'agentTurn' }> = {
			kind: 'agentTurn',
			message,
		};
		copyAgentTurnFields(payload, input);
		return payload;
	}

	const text = stringValue(input.text);
	if (!text) return undefined;
	const hasAgentTurnField = AGENT_TURN_FIELDS.some((field) => hasOwn(input, field));
	if (hasAgentTurnField) {
		const payload: Extract<FridayCronPayload, { kind: 'agentTurn' }> = {
			kind: 'agentTurn',
			message: text,
		};
		copyAgentTurnFields(payload, input);
		return payload;
	}
	return {
		kind: 'systemEvent',
		text: appendRecentContext(text, recentContext),
	};
}

function appendRecentContext(text: string, recentContext?: string): string {
	if (!recentContext?.trim()) return text;
	return `${text}\n\nRecent context:\n${recentContext.trim()}`;
}

function deliveryMode(value: unknown): FridayCronDelivery['mode'] | undefined {
	if (value === 'announce' || value === 'webhook' || value === 'none') return value;
	if (value === true) return 'announce';
	if (value === false) return 'none';
	return undefined;
}

function deliveryFrom(
	input: Record<string, unknown>,
	inferred?: Partial<FridayCronDelivery>
): Partial<FridayCronDelivery> | undefined {
	const explicit = record(input.delivery);
	const hasTopLevelTarget = ['deliver', 'channel', 'to', 'threadId', 'accountId', 'bestEffort', 'bestEffortDeliver', 'provider']
		.some((field) => hasOwn(input, field));
	if (Object.keys(explicit).length === 0 && !hasTopLevelTarget) {
		return inferred;
	}

	const source = Object.keys(explicit).length > 0 ? explicit : input;
	const mode = deliveryMode(source.mode) ?? deliveryMode(input.deliver);
	const bestEffort = booleanValue(source.bestEffort) ?? booleanValue(input.bestEffortDeliver);
	const delivery: Partial<FridayCronDelivery> = {};
	if (mode) delivery.mode = mode;
	const channel = stringValue(source.channel) ?? stringValue(input.provider);
	const to = stringValue(source.to);
	const threadId = stringValue(source.threadId);
	const accountId = stringValue(source.accountId);
	if (channel) delivery.channel = channel;
	if (to) delivery.to = to;
	if (threadId) delivery.threadId = threadId;
	if (accountId) delivery.accountId = accountId;
	if (bestEffort !== undefined) delivery.bestEffort = bestEffort;
	if (
		inferred &&
		(delivery.mode ?? inferred.mode) === 'announce' &&
		!delivery.to &&
		!delivery.channel
	) {
		return { ...inferred, ...delivery };
	}
	return delivery;
}

function failureAlertFrom(input: Record<string, unknown>): FridayCronFailureAlert | false | undefined {
	if (!hasOwn(input, 'failureAlert')) return undefined;
	if (input.failureAlert === false) return false;
	const source = record(input.failureAlert);
	if (Object.keys(source).length === 0) return undefined;
	const alert: FridayCronFailureAlert = {};
	const after = numberValue(source.after);
	const cooldownMs = numberValue(source.cooldownMs);
	const includeSkipped = booleanValue(source.includeSkipped);
	const mode = deliveryMode(source.mode);
	const channel = stringValue(source.channel);
	const to = stringValue(source.to);
	const threadId = stringValue(source.threadId);
	const accountId = stringValue(source.accountId);
	if (after !== undefined) alert.after = after;
	if (cooldownMs !== undefined) alert.cooldownMs = cooldownMs;
	if (includeSkipped !== undefined) alert.includeSkipped = includeSkipped;
	if (mode) alert.mode = mode;
	if (channel) alert.channel = channel;
	if (to) alert.to = to;
	if (threadId) alert.threadId = threadId;
	if (accountId) alert.accountId = accountId;
	return alert;
}

function sessionTargetFrom(input: Record<string, unknown>): FridayCronSessionTarget | undefined {
	const target = stringValue(input.sessionTarget) ?? stringValue(input.session);
	if (!target) return undefined;
	if (target === 'main' || target === 'isolated' || target === 'current' || target.startsWith('session:')) {
		return target as FridayCronSessionTarget;
	}
	return undefined;
}

function wakeModeFrom(input: Record<string, unknown>): FridayCronWakeMode | undefined {
	const mode = stringValue(input.wakeMode);
	return mode === 'now' || mode === 'next-heartbeat' ? mode : undefined;
}

function inferName(input: Record<string, unknown>, payload: FridayCronPayload, schedule: FridayCronSchedule): string {
	const explicit = stringValue(input.name);
	if (explicit) return explicit;
	const text = payload.kind === 'systemEvent' ? payload.text : payload.message;
	const normalized = text.replace(/\s+/g, ' ').trim();
	if (normalized) return normalized.length > 48 ? `${normalized.slice(0, 45)}...` : normalized;
	return schedule.kind === 'cron' ? `Cron ${schedule.expr}` : `Cron ${schedule.kind}`;
}

function baseJob(input: Record<string, unknown>): Record<string, unknown> {
	const output: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(input)) {
		if (!CONTROL_FIELDS.has(key)) output[key] = value;
	}
	return output;
}

export function normalizeCronJobCreate(
	input: unknown,
	context: FridayCronNormalizeContext = {}
): FridayCronAddRequest {
	const source = unwrapJob(input);
	const schedule = scheduleFrom(source);
	if (!schedule) throw new Error('Cron add requires a schedule.');
	const payload = payloadFrom(source, context.recentContext);
	if (!payload) throw new Error('Cron add requires a payload.');
	const sessionTarget = sessionTargetFrom(source) ?? (payload.kind === 'systemEvent' ? 'main' : 'isolated');
	const delivery = deliveryFrom(source, context.delivery);
	const request: FridayCronAddRequest = {
		name: inferName(source, payload, schedule),
		description: stringValue(source.description) ?? '',
		enabled: booleanValue(source.enabled) ?? true,
		deleteAfterRun: booleanValue(source.deleteAfterRun) ?? (schedule.kind === 'at' ? true : undefined),
		id: stringValue(source.id),
		schedule,
		sessionTarget,
		wakeMode: wakeModeFrom(source) ?? 'now',
		payload,
		delivery,
		failureAlert: failureAlertFrom(source),
		maxAttempts: numberValue(source.maxAttempts),
		backoffMs: numberValue(source.backoffMs),
		maxBackoffMs: numberValue(source.maxBackoffMs),
	};

	if (hasOwn(source, 'agentId')) request.agentId = stringOrNull(source.agentId);
	else if (context.actor?.agentId !== undefined) request.agentId = context.actor.agentId;
	if (hasOwn(source, 'sessionKey')) request.sessionKey = stringOrNull(source.sessionKey);
	else if (context.actor?.sessionKey !== undefined) request.sessionKey = context.actor.sessionKey;
	else if (context.actor?.sessionId !== undefined) request.sessionKey = context.actor.sessionId;

	return request;
}

export function normalizeCronJobPatch(input: unknown): FridayCronUpdateRequest {
	const source = unwrapJob(input);
	const patch: FridayCronUpdateRequest = {};
	const schedule = scheduleFrom(source);
	const payload = payloadFrom(source);
	const delivery = deliveryFrom(source);
	const failureAlert = failureAlertFrom(source);
	const enabled = booleanValue(source.enabled);
	const deleteAfterRun = booleanValue(source.deleteAfterRun);
	const sessionTarget = sessionTargetFrom(source);
	const wakeMode = wakeModeFrom(source);

	if (hasOwn(source, 'name')) patch.name = stringValue(source.name) ?? '';
	if (hasOwn(source, 'description')) patch.description = stringValue(source.description) ?? '';
	if (enabled !== undefined) patch.enabled = enabled;
	if (deleteAfterRun !== undefined) patch.deleteAfterRun = deleteAfterRun;
	if (schedule) patch.schedule = schedule;
	if (sessionTarget) patch.sessionTarget = sessionTarget;
	if (wakeMode) patch.wakeMode = wakeMode;
	if (payload) patch.payload = payload;
	if (delivery) patch.delivery = delivery;
	if (failureAlert !== undefined) patch.failureAlert = failureAlert;
	if (hasOwn(source, 'agentId')) patch.agentId = stringOrNull(source.agentId);
	if (hasOwn(source, 'sessionKey')) patch.sessionKey = stringOrNull(source.sessionKey);
	const maxAttempts = numberValue(source.maxAttempts);
	const backoffMs = numberValue(source.backoffMs);
	const maxBackoffMs = numberValue(source.maxBackoffMs);
	if (maxAttempts !== undefined) patch.maxAttempts = maxAttempts;
	if (backoffMs !== undefined) patch.backoffMs = backoffMs;
	if (maxBackoffMs !== undefined) patch.maxBackoffMs = maxBackoffMs;
	return patch;
}

function requiredJobId(input: Record<string, unknown>): string {
	const id = stringValue(input.jobId) ?? stringValue(input.id);
	if (!id) throw new Error('Cron action requires jobId.');
	return id;
}

function includeMode(input: Record<string, unknown>): 'enabled' | 'disabled' | 'all' {
	const include = stringValue(input.include);
	if (include === 'enabled' || include === 'disabled' || include === 'all') return include;
	if (booleanValue(input.includeDisabled)) return 'all';
	return 'enabled';
}

export function normalizeFridayCronToolRequest(
	request: FridayCronToolRequest | unknown,
	context: FridayCronNormalizeContext = {}
): FridayCronCanonicalToolRequest {
	const input = record(request);
	const action = stringValue(input.action);
	switch (action) {
		case 'status':
			return { action };
		case 'list':
			return {
				action,
				include: includeMode(input),
				agentId: hasOwn(input, 'agentId') ? stringOrNull(input.agentId) : context.actor?.agentId,
			};
		case 'get':
		case 'remove':
			return { action, jobId: requiredJobId(input) };
		case 'add': {
			const jobInput = hasOwn(input, 'job') ? input.job : baseJob(input);
			return { action, job: normalizeCronJobCreate(jobInput, context) };
		}
		case 'update': {
			const patchInput = hasOwn(input, 'patch') ? input.patch : baseJob(input);
			return { action, jobId: requiredJobId(input), patch: normalizeCronJobPatch(patchInput) };
		}
		case 'run': {
			const runMode = stringValue(input.runMode) ?? stringValue(input.mode);
			return {
				action,
				jobId: requiredJobId(input),
				runMode: runMode === 'due' ? 'due' : 'force',
			};
		}
		case 'runs':
			return {
				action,
				jobId: requiredJobId(input),
				limit: Math.max(1, Math.floor(numberValue(input.limit) ?? 50)),
			};
		case 'wake': {
			const mode = stringValue(input.mode);
			return {
				action,
				text: stringValue(input.text) ?? '',
				mode: mode === 'now' ? 'now' : 'next-heartbeat',
			};
		}
		default:
			throw new Error('Unsupported cron action.');
	}
}
