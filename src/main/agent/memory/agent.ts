import type {
	AgentSession,
	BuiltPrompt,
	Clock,
	IdGenerator,
	LlmProvider,
	MemoryItem,
	MemoryPrivacyLevel,
	MemoryStore,
	MemoryUpdateDecision,
	UserMemory,
	WorkingMemory,
	WorkingMemorySessionManager,
} from './types';
import { AgentExecutionError, CryptoIdGenerator, MemoryAgentError } from './types';
import { addDays, summarizeText } from './helpers';
import { MemoryExtractor } from './extractor';
import { InMemoryMemoryStore } from './store';
import { InMemorySessionManager } from './session';
import { MemoryPolicy } from './policy-engine';
import { KeywordMemorySearchStrategy, MemoryRetriever } from './retrieval';
import { PromptBuilder } from './prompt';

export interface MemoryManagedAgentOptions {
	model: string;
	systemInstructions: string;
	llmProvider: LlmProvider;
	memoryStore: MemoryStore;
	sessionManager: WorkingMemorySessionManager;
	memoryRetriever: MemoryRetriever;
	memoryExtractor: MemoryExtractor;
	promptBuilder: PromptBuilder;
	idGenerator?: IdGenerator;
	clock?: Clock;
}

export interface AgentRespondInput {
	userId: string;
	input: string;
	sessionId?: string;
	model?: string;
	maxMemories?: number;
	maxMemoryPrivacyLevel?: MemoryPrivacyLevel;
	includePrompt?: boolean;
	signal?: AbortSignal;
}

export interface AgentRespondResult {
	sessionId: string;
	response: string;
	relevantMemory: MemoryItem[];
	memoryDecisions: MemoryUpdateDecision[];
	appliedMemoryDecisions: MemoryUpdateDecision[];
	prompt?: BuiltPrompt;
}

export class MemoryManagedAgent {
	private readonly idGenerator: IdGenerator;
	private readonly clock: Clock;

	constructor(private readonly options: MemoryManagedAgentOptions) {
		this.idGenerator = options.idGenerator ?? new CryptoIdGenerator();
		this.clock = options.clock ?? (() => new Date());
	}

	static createDevelopment(input: {
		llmProvider: LlmProvider;
		model: string;
		systemInstructions?: string;
		clock?: Clock;
		idGenerator?: IdGenerator;
	}): {
		agent: MemoryManagedAgent;
		memoryStore: InMemoryMemoryStore;
		sessionManager: InMemorySessionManager;
	} {
		const clock = input.clock ?? (() => new Date());
		const idGenerator = input.idGenerator ?? new CryptoIdGenerator();
		const memoryStore = new InMemoryMemoryStore(clock);
		const sessionManager = new InMemorySessionManager({ clock, idGenerator });
		const policy = new MemoryPolicy({ clock });
		const retriever = new MemoryRetriever(memoryStore, new KeywordMemorySearchStrategy(), clock);
		const extractor = new MemoryExtractor(policy, idGenerator, clock);
		const agent = new MemoryManagedAgent({
			model: input.model,
			systemInstructions:
				input.systemInstructions ?? 'You are a helpful, privacy-preserving AI agent.',
			llmProvider: input.llmProvider,
			memoryStore,
			sessionManager,
			memoryRetriever: retriever,
			memoryExtractor: extractor,
			promptBuilder: new PromptBuilder(),
			idGenerator,
			clock,
		});
		return { agent, memoryStore, sessionManager };
	}

	async respond(input: AgentRespondInput): Promise<AgentRespondResult> {
		if (!input.input.trim()) throw new AgentExecutionError('User input cannot be empty.');

		try {
			const session = input.sessionId
				? await this.options.sessionManager.loadSession(input.sessionId)
				: await this.options.sessionManager.createSession(input.userId);
			if (session.userId !== input.userId) {
				throw new AgentExecutionError(
					`Session ${session.id} does not belong to user ${input.userId}`
				);
			}

			const relevantMemory = await this.options.memoryRetriever.retrieve({
				userId: input.userId,
				query: input.input,
				maxItems: input.maxMemories,
				maxPrivacyLevel: input.maxMemoryPrivacyLevel,
			});
			const workingMemory = this.createWorkingMemory(session, input.input, relevantMemory);
			const promptSession = { ...session, workingMemory };
			const prompt = this.options.promptBuilder.build({
				systemInstructions: this.options.systemInstructions,
				relevantMemories: relevantMemory,
				session: promptSession,
				userInput: input.input,
			});
			const llmResponse = await this.options.llmProvider.complete({
				model: input.model ?? this.options.model,
				system: prompt.system,
				messages: prompt.messages,
				renderedPrompt: prompt.renderedPrompt,
				relevantMemory,
				userId: input.userId,
				sessionId: session.id,
				signal: input.signal,
			});

			await this.options.sessionManager.appendMessage(session.id, {
				role: 'user',
				content: input.input,
			});
			await this.options.sessionManager.appendMessage(session.id, {
				role: 'assistant',
				content: llmResponse.content,
			});

			const existingMemory = await this.options.memoryStore.getMemory(input.userId);
			const memoryDecisions = this.options.memoryExtractor.extract({
				userId: input.userId,
				userMessage: input.input,
				agentReply: llmResponse.content,
				sessionId: session.id,
				existingMemory,
			});
			const appliedMemoryDecisions: MemoryUpdateDecision[] = [];
			for (const decision of memoryDecisions) {
				const applied = await this.applyDecision(input.userId, decision);
				if (applied) appliedMemoryDecisions.push(applied);
				if (decision.action === 'session_only' && decision.candidateMemory) {
					workingMemory.notes.push(decision.candidateMemory.summary);
				}
			}
			await this.options.sessionManager.setWorkingMemory(session.id, workingMemory);

			return {
				sessionId: session.id,
				response: llmResponse.content,
				relevantMemory,
				memoryDecisions,
				appliedMemoryDecisions,
				prompt: input.includePrompt ? prompt : undefined,
			};
		} catch (error) {
			if (error instanceof MemoryAgentError) throw error;
			throw new AgentExecutionError('Agent failed to process the turn.', error);
		}
	}

	async exportUserMemory(userId: string): Promise<UserMemory> {
		return this.options.memoryStore.exportMemory(userId);
	}

	async deleteUserMemory(userId: string): Promise<void> {
		await this.options.memoryStore.deleteAllMemory(userId);
	}

	private async applyDecision(
		userId: string,
		decision: MemoryUpdateDecision
	): Promise<MemoryUpdateDecision | undefined> {
		if (decision.shouldStore && decision.candidateMemory) {
			await this.options.memoryStore.addMemory(userId, decision.candidateMemory);
			return decision;
		}
		if (decision.shouldUpdate && decision.targetMemoryId && decision.patch) {
			await this.options.memoryStore.updateMemory(userId, decision.targetMemoryId, decision.patch);
			return decision;
		}
		if (decision.shouldDelete && decision.targetMemoryId) {
			await this.options.memoryStore.deleteMemory(userId, decision.targetMemoryId);
			return decision;
		}
		return undefined;
	}

	private createWorkingMemory(
		session: AgentSession,
		userInput: string,
		relevantMemory: MemoryItem[]
	): WorkingMemory {
		const now = this.clock();
		return {
			turnId: this.idGenerator.createId('turn'),
			userId: session.userId,
			sessionId: session.id,
			context: [summarizeText(userInput, 500)],
			relevantMemoryIds: relevantMemory.map((memory) => memory.id),
			notes: session.workingMemory?.notes ?? [],
			createdAt: now.toISOString(),
			expiresAt: addDays(now, 1),
		};
	}
}

export async function runMemoryAgentExample(): Promise<{
	session1: AgentRespondResult;
	session2: AgentRespondResult;
	exportedMemory: UserMemory;
}> {
	const provider: LlmProvider = {
		async complete(request) {
			const usesStrictTypeScript = request.system.includes('strict typing');
			return {
				content: usesStrictTypeScript
					? 'Here is a strict TypeScript example with explicit types.'
					: 'I will remember that preference for future turns.',
			};
		},
	};
	const { agent } = MemoryManagedAgent.createDevelopment({
		llmProvider: provider,
		model: 'provider-neutral-example-model',
		systemInstructions: 'Answer directly and follow relevant user preferences.',
	});
	const userId = 'user-123';
	const session1 = await agent.respond({
		userId,
		input: 'Remember that I prefer TypeScript examples with strict typing.',
	});
	const session2 = await agent.respond({
		userId,
		input: 'Show me a small parser function.',
	});
	const exportedMemory = await agent.exportUserMemory(userId);
	return { session1, session2, exportedMemory };
}
