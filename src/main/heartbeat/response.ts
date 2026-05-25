import { HEARTBEAT_OK } from '../../shared/heartbeat';

export const HEARTBEAT_TOOL_OUTCOMES = [
	'no_change',
	'progress',
	'done',
	'blocked',
	'needs_attention',
] as const;
export type HeartbeatToolOutcome = (typeof HEARTBEAT_TOOL_OUTCOMES)[number];

export const HEARTBEAT_TOOL_PRIORITIES = ['low', 'normal', 'high'] as const;
export type HeartbeatToolPriority = (typeof HEARTBEAT_TOOL_PRIORITIES)[number];

export interface HeartbeatToolResponse {
	outcome: HeartbeatToolOutcome;
	notify: boolean;
	summary: string;
	notificationText?: string;
	reason?: string;
	priority?: HeartbeatToolPriority;
	nextCheck?: string;
}

export type HeartbeatNormalizedReply =
	| { kind: 'ok'; status: 'ok-empty' | 'ok-token'; text: ''; structured?: HeartbeatToolResponse }
	| { kind: 'alert'; status: 'sent'; text: string; structured?: HeartbeatToolResponse };

const OUTCOMES = new Set<string>(HEARTBEAT_TOOL_OUTCOMES);
const PRIORITIES = new Set<string>(HEARTBEAT_TOOL_PRIORITIES);

function normalizeHeartbeatToolResponse(value: unknown): HeartbeatToolResponse | undefined {
	if (!isRecord(value)) return undefined;
	const outcome = readString(value.outcome);
	const notify = typeof value.notify === 'boolean' ? value.notify : undefined;
	const summary = readString(value.summary);
	if (!outcome || !OUTCOMES.has(outcome) || notify === undefined || !summary) return undefined;
	const priority = readString(value.priority);
	const notificationText = readString(value.notificationText ?? value.notification_text);
	const reason = readString(value.reason);
	const nextCheck = readString(value.nextCheck ?? value.next_check);
	return {
		outcome: outcome as HeartbeatToolOutcome,
		notify,
		summary,
		...(notificationText ? { notificationText } : {}),
		...(reason ? { reason } : {}),
		...(priority && PRIORITIES.has(priority) ? { priority: priority as HeartbeatToolPriority } : {}),
		...(nextCheck ? { nextCheck } : {}),
	};
}

export function normalizeHeartbeatReply(input: {
	text?: string;
	toolResponse?: HeartbeatToolResponse;
	ackMaxChars: number;
}): HeartbeatNormalizedReply {
	if (input.toolResponse) {
		if (!input.toolResponse.notify) {
			return { kind: 'ok', status: 'ok-token', text: '', structured: input.toolResponse };
		}
		const text = (input.toolResponse.notificationText ?? input.toolResponse.summary).trim();
		return text
			? { kind: 'alert', status: 'sent', text, structured: input.toolResponse }
			: { kind: 'ok', status: 'ok-empty', text: '', structured: input.toolResponse };
	}

	const raw = input.text?.trim() ?? '';
	if (!raw) return { kind: 'ok', status: 'ok-empty', text: '' };
	const stripped = stripHeartbeatToken(raw);
	if (!stripped.didStrip) return { kind: 'alert', status: 'sent', text: raw };
	if (!stripped.text || stripped.text.length <= Math.max(0, input.ackMaxChars)) {
		return { kind: 'ok', status: 'ok-token', text: '' };
	}
	return { kind: 'alert', status: 'sent', text: stripped.text };
}

function stripHeartbeatToken(raw: string): { text: string; didStrip: boolean } {
	const token = HEARTBEAT_OK;
	const normalized = raw
		.replace(/<[^>]*>/g, ' ')
		.replace(/&nbsp;/gi, ' ')
		.replace(/^[*`~_]+/, '')
		.replace(/[*`~_]+$/, '')
		.trim();
	let text = normalized;
	let didStrip = false;
	let changed = true;
	while (changed) {
		changed = false;
		const next = text.trim();
		if (next.startsWith(token)) {
			text = next.slice(token.length).trimStart();
			didStrip = true;
			changed = true;
			continue;
		}
		const idx = next.lastIndexOf(token);
		if (idx !== -1 && /^[^\w]{0,4}$/.test(next.slice(idx + token.length))) {
			text = next.slice(0, idx).trimEnd();
			didStrip = true;
			changed = true;
		}
	}
	return { text: text.replace(/\s+/g, ' ').trim(), didStrip };
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string | undefined {
	return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}
