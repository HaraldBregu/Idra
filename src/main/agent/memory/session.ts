import type { AgentMessage, AgentSession, Clock, IdGenerator, NewAgentMessage, SessionManager, WorkingMemory } from './types';
import { CryptoIdGenerator, MemoryAgentError, SessionNotFoundError } from './types';
import { deepClone, formatMessage, nowIso, summarizeText } from './helpers';

export interface InMemorySessionManagerOptions {
	maxMessages?: number;
	idGenerator?: IdGenerator;
	clock?: Clock;
}

export class InMemorySessionManager implements SessionManager {
	private readonly sessions = new Map<string, AgentSession>();
	private readonly maxMessages: number;
	private readonly idGenerator: IdGenerator;
	private readonly clock: Clock;

	constructor(options: InMemorySessionManagerOptions = {}) {
		this.maxMessages = options.maxMessages ?? 20;
		this.idGenerator = options.idGenerator ?? new CryptoIdGenerator();
		this.clock = options.clock ?? (() => new Date());
	}

	async createSession(userId: string): Promise<AgentSession> {
		const now = nowIso(this.clock);
		const session: AgentSession = {
			id: this.idGenerator.createId('session'),
			userId,
			createdAt: now,
			updatedAt: now,
			shortTermMemory: {
				messages: [],
				maxMessages: this.maxMessages,
			},
			metadata: {},
		};
		this.sessions.set(session.id, session);
		return deepClone(session);
	}

	async loadSession(sessionId: string): Promise<AgentSession> {
		return deepClone(this.getSession(sessionId));
	}

	async appendMessage(sessionId: string, message: NewAgentMessage): Promise<AgentSession> {
		const session = this.getOpenSession(sessionId);
		const now = nowIso(this.clock);
		session.shortTermMemory.messages.push({
			id: message.id ?? this.idGenerator.createId('msg'),
			role: message.role,
			content: message.content,
			createdAt: message.createdAt ?? now,
			metadata: message.metadata ?? {},
		});
		session.updatedAt = now;
		this.compressIfNeeded(session);
		return deepClone(session);
	}

	async summarizeSession(sessionId: string): Promise<string> {
		const session = this.getSession(sessionId);
		const summary = this.summarizeMessages(session.shortTermMemory.messages);
		session.shortTermMemory.summary = session.shortTermMemory.summary
			? summarizeText(`${session.shortTermMemory.summary} ${summary}`, 2000)
			: summary;
		session.updatedAt = nowIso(this.clock);
		return session.shortTermMemory.summary;
	}

	async closeSession(sessionId: string): Promise<AgentSession> {
		const session = this.getOpenSession(sessionId);
		await this.summarizeSession(sessionId);
		session.closedAt = nowIso(this.clock);
		session.updatedAt = session.closedAt;
		return deepClone(session);
	}

	async setWorkingMemory(sessionId: string, workingMemory: WorkingMemory): Promise<AgentSession> {
		const session = this.getOpenSession(sessionId);
		session.workingMemory = deepClone(workingMemory);
		session.updatedAt = nowIso(this.clock);
		return deepClone(session);
	}

	private getSession(sessionId: string): AgentSession {
		const session = this.sessions.get(sessionId);
		if (!session) throw new SessionNotFoundError(sessionId);
		return session;
	}

	private getOpenSession(sessionId: string): AgentSession {
		const session = this.getSession(sessionId);
		if (session.closedAt) throw new MemoryAgentError(`Session is closed: ${sessionId}`);
		return session;
	}

	private compressIfNeeded(session: AgentSession): void {
		const overflow = session.shortTermMemory.messages.length - this.maxMessages;
		if (overflow <= 0) return;

		const olderMessages = session.shortTermMemory.messages.splice(0, overflow);
		const olderSummary = this.summarizeMessages(olderMessages);
		session.shortTermMemory.summary = session.shortTermMemory.summary
			? summarizeText(`${session.shortTermMemory.summary} ${olderSummary}`, 2000)
			: olderSummary;
	}

	private summarizeMessages(messages: AgentMessage[]): string {
		if (messages.length === 0) return '';
		return summarizeText(messages.map(formatMessage).join(' | '), 2000);
	}
}
