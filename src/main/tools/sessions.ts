import { randomUUID } from 'node:crypto';
import {
	canAccessSession,
	sanitizeTranscriptForMemory,
	type SessionVisibility,
} from '../memory-runtime';
import type { TranscriptEntry } from '../provider/types';
import {
	listSessions,
	loadExistingSession,
	saveSession,
	type SessionFile,
	type SessionStatus,
} from '../session/store';
import type { AgentTool, AgentToolResult, ToolContext } from './types';

type SessionToolPayload = Record<string, unknown>;

interface SessionsListArgs {
	search?: string;
	limit?: number;
	includeLastMessages?: boolean;
	status?: SessionStatus;
	label?: string;
}

interface SessionsHistoryArgs {
	sessionId?: string;
	limit?: number;
	maxChars?: number;
}

interface SessionsSendArgs {
	sessionId: string;
	message: string;
	wait?: boolean;
}

interface SessionsSpawnArgs {
	task?: string;
	label?: string;
	modelOverride?: string;
}

interface SessionsYieldArgs {
	sessionId?: string;
}

interface SubagentsArgs {
	action?: 'list' | 'kill' | 'steer';
	sessionId?: string;
	message?: string;
}

interface SessionStatusArgs {
	sessionId?: string;
	status?: SessionStatus;
	task?: string;
	modelOverride?: string;
}

const SESSION_STATUSES: SessionStatus[] = ['active', 'idle', 'waiting', 'completed', 'failed', 'cancelled'];

function jsonToolResult<T extends SessionToolPayload>(payload: T, isError = false): AgentToolResult<T> {
	return {
		status: isError ? 'error' : 'ok',
		content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }],
		details: payload,
	};
}

function visibility(ctx: ToolContext): SessionVisibility {
	return ctx.sessionVisibility ?? 'agent';
}

function isVisible(ctx: ToolContext, session: Pick<SessionFile, 'id' | 'parentSessionId' | 'spawnedBySessionId'>): boolean {
	return canAccessSession(ctx.sessionId, session, visibility(ctx));
}

async function visibleSessions(ctx: ToolContext): Promise<SessionFile[]> {
	const sessions = await listSessions({ baseDir: ctx.sessionBaseDir });
	return sessions.filter((session) => isVisible(ctx, session));
}

async function loadVisibleSession(ctx: ToolContext, id: string): Promise<SessionFile | null> {
	const session = await loadExistingSession(id, { baseDir: ctx.sessionBaseDir });
	if (!session || !isVisible(ctx, session)) return null;
	return session;
}

function lastMessage(session: SessionFile): string | undefined {
	const messages = sanitizeTranscriptForMemory(session.transcript);
	return messages[messages.length - 1]?.text;
}

function searchableText(session: SessionFile): string {
	return [
		session.id,
		session.task ?? '',
		...(session.labels ?? []),
		...sanitizeTranscriptForMemory(session.transcript).map((entry) => entry.text),
	].join('\n');
}

function boundedMessages(transcript: TranscriptEntry[], limit: number, maxChars: number): {
	messages: Array<{ index: number; role: TranscriptEntry['role']; text: string }>;
	truncated: boolean;
} {
	const messages = sanitizeTranscriptForMemory(transcript).slice(-limit);
	const output: Array<{ index: number; role: TranscriptEntry['role']; text: string }> = [];
	let used = 0;
	for (const message of messages) {
		const needed = message.text.length + 1;
		if (used + needed > maxChars) return { messages: output, truncated: true };
		output.push(message);
		used += needed;
	}
	return { messages: output, truncated: messages.length < transcript.length };
}

function readStatus(value: unknown): SessionStatus | undefined {
	if (value === undefined) return undefined;
	if (typeof value !== 'string' || !SESSION_STATUSES.includes(value as SessionStatus)) {
		throw new Error(`status must be one of: ${SESSION_STATUSES.join(', ')}`);
	}
	return value as SessionStatus;
}

export const sessionsListTool: AgentTool<SessionsListArgs> = {
	name: 'sessions_list',
	description: 'List visible agent sessions with optional search, status, label, and last-message metadata.',
	schema: {
		type: 'object',
		properties: {
			search: { type: 'string' },
			limit: { type: 'number' },
			includeLastMessages: { type: 'boolean' },
			status: { type: 'string', enum: SESSION_STATUSES },
			label: { type: 'string' },
		},
		additionalProperties: false,
	},
	async execute(args, ctx) {
		const query = args.search?.trim().toLowerCase();
		const limit = Math.min(Math.max(Math.floor(args.limit ?? 20), 1), 100);
		const status = readStatus(args.status);
		const sessions = (await visibleSessions(ctx))
			.filter((session) => !status || session.status === status)
			.filter((session) => !args.label || (session.labels ?? []).includes(args.label))
			.filter((session) => !query || searchableText(session).toLowerCase().includes(query))
			.slice(0, limit)
			.map((session) => ({
				sessionId: session.id,
				updatedAt: session.updatedAt,
				status: session.status,
				task: session.task,
				labels: session.labels ?? [],
				parentSessionId: session.parentSessionId,
				spawnedBySessionId: session.spawnedBySessionId,
				model: session.modelOverride ?? session.model,
				lastMessage: args.includeLastMessages ? lastMessage(session) : undefined,
			}));
		return jsonToolResult({ status: 'ok', visibility: visibility(ctx), sessions });
	},
};

export const sessionsHistoryTool: AgentTool<SessionsHistoryArgs> = {
	name: 'sessions_history',
	description: 'Read bounded sanitized history for a visible session.',
	schema: {
		type: 'object',
		properties: {
			sessionId: { type: 'string' },
			limit: { type: 'number' },
			maxChars: { type: 'number' },
		},
		additionalProperties: false,
	},
	async execute(args, ctx) {
		const sessionId = args.sessionId ?? ctx.sessionId;
		const session = await loadVisibleSession(ctx, sessionId);
		if (!session) return jsonToolResult({ status: 'error', message: 'session is not visible or does not exist' }, true);
		const limit = Math.min(Math.max(Math.floor(args.limit ?? 20), 1), 100);
		const maxChars = Math.min(Math.max(Math.floor(args.maxChars ?? 16_000), 1), 64_000);
		const history = boundedMessages(session.transcript, limit, maxChars);
		return jsonToolResult({
			status: 'ok',
			sessionId: session.id,
			messages: history.messages,
			truncated: history.truncated,
		});
	},
};

export const sessionsSendTool: AgentTool<SessionsSendArgs> = {
	name: 'sessions_send',
	description: 'Append a user message to another visible session. This runtime records the message but does not start a model run.',
	schema: {
		type: 'object',
		properties: {
			sessionId: { type: 'string' },
			message: { type: 'string' },
			wait: { type: 'boolean' },
		},
		required: ['sessionId', 'message'],
		additionalProperties: false,
	},
	async execute(args, ctx) {
		const session = await loadVisibleSession(ctx, args.sessionId);
		if (!session) return jsonToolResult({ status: 'error', message: 'session is not visible or does not exist' }, true);
		session.transcript.push({ role: 'user', content: String(args.message ?? '') });
		session.status = 'waiting';
		await saveSession(session, { baseDir: ctx.sessionBaseDir });
		return jsonToolResult({
			status: 'sent',
			sessionId: session.id,
			waitSupported: false,
			waitRequested: Boolean(args.wait),
		});
	},
};

export const sessionsSpawnTool: AgentTool<SessionsSpawnArgs> = {
	name: 'sessions_spawn',
	description: 'Create a controlled child session with inherited workspace/session constraints.',
	schema: {
		type: 'object',
		properties: {
			task: { type: 'string' },
			label: { type: 'string' },
			modelOverride: { type: 'string' },
		},
		additionalProperties: false,
	},
	async execute(args, ctx) {
		const now = new Date().toISOString();
		const id = `session_${randomUUID()}`;
		const session: SessionFile = {
			id,
			createdAt: now,
			updatedAt: now,
			model: args.modelOverride ?? 'inherited',
			provider: 'inherited',
			status: 'active',
			task: args.task,
			parentSessionId: ctx.sessionId,
			spawnedBySessionId: ctx.sessionId,
			labels: args.label ? [args.label] : [],
			modelOverride: args.modelOverride,
			transcript: args.task ? [{ role: 'user', content: args.task }] : [],
			plan: [],
			compactionMarkers: [],
		};
		await saveSession(session, { baseDir: ctx.sessionBaseDir });
		return jsonToolResult({
			status: 'spawned',
			sessionId: session.id,
			startedModelRun: false,
		});
	},
};

export const sessionsYieldTool: AgentTool<SessionsYieldArgs> = {
	name: 'sessions_yield',
	description: 'Report that the current turn can yield while waiting for a controlled child session.',
	schema: {
		type: 'object',
		properties: {
			sessionId: { type: 'string' },
		},
		additionalProperties: false,
	},
	async execute(args, ctx) {
		const sessionId = args.sessionId ?? ctx.sessionId;
		const session = await loadVisibleSession(ctx, sessionId);
		if (!session) return jsonToolResult({ status: 'error', message: 'session is not visible or does not exist' }, true);
		return jsonToolResult({ status: 'yielded', sessionId, note: 'host turn-yield scheduling is not available in this runtime' });
	},
};

export const subagentsTool: AgentTool<SubagentsArgs> = {
	name: 'subagents',
	description: 'List, cancel, or steer controlled child sessions spawned by the current session.',
	schema: {
		type: 'object',
		properties: {
			action: { type: 'string', enum: ['list', 'kill', 'steer'] },
			sessionId: { type: 'string' },
			message: { type: 'string' },
		},
		additionalProperties: false,
	},
	async execute(args, ctx) {
		const action = args.action ?? 'list';
		const controlled = (await visibleSessions(ctx)).filter((session) => session.spawnedBySessionId === ctx.sessionId);
		if (action === 'list') {
			return jsonToolResult({
				status: 'ok',
				subagents: controlled.map((session) => ({
					sessionId: session.id,
					status: session.status,
					task: session.task,
					updatedAt: session.updatedAt,
				})),
			});
		}
		const target = controlled.find((session) => session.id === args.sessionId);
		if (!target) return jsonToolResult({ status: 'error', message: 'controlled subagent session not found' }, true);
		if (action === 'kill') {
			target.status = 'cancelled';
			await saveSession(target, { baseDir: ctx.sessionBaseDir });
			return jsonToolResult({ status: 'cancelled', sessionId: target.id });
		}
		if (!args.message) return jsonToolResult({ status: 'error', message: 'message is required for steer' }, true);
		target.transcript.push({ role: 'user', content: args.message });
		target.status = 'waiting';
		await saveSession(target, { baseDir: ctx.sessionBaseDir });
		return jsonToolResult({ status: 'steered', sessionId: target.id });
	},
};

export const sessionStatusTool: AgentTool<SessionStatusArgs> = {
	name: 'session_status',
	description: 'Read or update status, task, and model override for the current or visible target session.',
	schema: {
		type: 'object',
		properties: {
			sessionId: { type: 'string' },
			status: { type: 'string', enum: SESSION_STATUSES },
			task: { type: 'string' },
			modelOverride: { type: 'string' },
		},
		additionalProperties: false,
	},
	async execute(args, ctx) {
		const sessionId = args.sessionId ?? ctx.sessionId;
		const session = await loadVisibleSession(ctx, sessionId);
		if (!session) return jsonToolResult({ status: 'error', message: 'session is not visible or does not exist' }, true);
		const nextStatus = readStatus(args.status);
		if (nextStatus) session.status = nextStatus;
		if (args.task !== undefined) session.task = args.task;
		if (args.modelOverride !== undefined) session.modelOverride = args.modelOverride;
		if (nextStatus || args.task !== undefined || args.modelOverride !== undefined) {
			await saveSession(session, { baseDir: ctx.sessionBaseDir });
		}
		return jsonToolResult({
			status: 'ok',
			session: {
				sessionId: session.id,
				status: session.status,
				task: session.task,
				model: session.modelOverride ?? session.model,
				parentSessionId: session.parentSessionId,
				spawnedBySessionId: session.spawnedBySessionId,
				updatedAt: session.updatedAt,
			},
		});
	},
};
