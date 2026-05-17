import {
	InMemoryMemoryStore,
	InMemorySessionManager,
	MemoryExtractor,
	MemoryManagedAgent,
	MemoryPolicy,
	MemoryRetriever,
	PromptBuilder,
	type LlmProvider,
	type LlmRequest,
	type MemoryItem,
} from '../../../src/main/agent-memory';

class FakeProvider implements LlmProvider {
	readonly requests: LlmRequest[] = [];

	constructor(private readonly responder: string | ((request: LlmRequest) => string) = 'ok') {}

	async complete(request: LlmRequest) {
		this.requests.push(request);
		return {
			content: typeof this.responder === 'string' ? this.responder : this.responder(request),
		};
	}
}

function fixedClock() {
	return new Date('2026-01-01T00:00:00.000Z');
}

function createAgent(provider = new FakeProvider()) {
	return {
		provider,
		...MemoryManagedAgent.createDevelopment({
			llmProvider: provider,
			model: 'test-model',
			systemInstructions: 'Answer with relevant memory, but prefer the current user message.',
			clock: fixedClock,
		}),
	};
}

describe('agent-memory', () => {
	it('stores explicit long-term memory', async () => {
		const { agent, memoryStore } = createAgent();

		await agent.respond({
			userId: 'u1',
			input: 'Remember that I prefer TypeScript examples with strict typing.',
		});

		const memory = await memoryStore.getMemory('u1');
		expect(memory.longTerm.items).toHaveLength(1);
		expect(memory.longTerm.items[0]).toMatchObject({
			kind: 'preference',
			importance: 'high',
			privacyLevel: 'personal',
		});
		expect(memory.longTerm.items[0]?.content).toContain('TypeScript examples with strict typing');
	});

	it('keeps chat-only memory out of persistent storage', async () => {
		const { agent, memoryStore, sessionManager } = createAgent();

		const result = await agent.respond({
			userId: 'u1',
			input: 'Remember this only for this chat: use tiny variable names.',
		});

		const memory = await memoryStore.getMemory('u1');
		const session = await sessionManager.loadSession(result.sessionId);
		expect(memory.longTerm.items).toEqual([]);
		expect(session.workingMemory?.notes).toEqual(['use tiny variable names']);
	});

	it('updates contradictory preference memory instead of duplicating it', async () => {
		const { agent, memoryStore } = createAgent();

		await agent.respond({
			userId: 'u1',
			input: 'Remember that I prefer TypeScript examples.',
		});
		await agent.respond({
			userId: 'u1',
			input: 'Actually, I prefer Python examples.',
		});

		const memory = await memoryStore.getMemory('u1');
		expect(memory.longTerm.items).toHaveLength(1);
		expect(memory.longTerm.items[0]?.content).toBe('I prefer Python examples');
		expect(memory.longTerm.items[0]?.metadata.previousContent).toBe('I prefer TypeScript examples');
	});

	it('does not merge unrelated preferences that only share generic wording', async () => {
		const { agent, memoryStore } = createAgent();

		await agent.respond({
			userId: 'u1',
			input: 'Remember that I prefer TypeScript examples.',
		});
		await agent.respond({
			userId: 'u1',
			input: 'Remember that I prefer coffee in the morning.',
		});

		const memory = await memoryStore.getMemory('u1');
		expect(memory.longTerm.items.map((item) => item.content).sort()).toEqual([
			'I prefer TypeScript examples',
			'I prefer coffee in the morning',
		]);
	});

	it('forgets matching memory on explicit request', async () => {
		const { agent, memoryStore } = createAgent();

		await agent.respond({
			userId: 'u1',
			input: 'Remember that I prefer TypeScript examples.',
		});
		await agent.respond({
			userId: 'u1',
			input: 'Forget that I prefer TypeScript examples.',
		});

		const memory = await memoryStore.getMemory('u1');
		expect(memory.longTerm.items).toEqual([]);
		expect(memory.longTerm.archivedItems).toHaveLength(1);
	});

	it('retrieves useful preferences across sessions with minimal prompt injection', async () => {
		const provider = new FakeProvider((request) =>
			request.system.includes('strict typing')
				? 'Here is strict TypeScript with explicit input and output types.'
				: 'No preference found.'
		);
		const { agent } = createAgent(provider);

		await agent.respond({
			userId: 'u1',
			input: 'Remember that I prefer TypeScript examples with strict typing.',
		});
		const second = await agent.respond({
			userId: 'u1',
			input: 'Can you show me a small code example?',
		});

		expect(second.response).toContain('strict TypeScript');
		expect(second.relevantMemory.map((item) => item.summary)).toContain('I prefer TypeScript examples with strict typing');
		expect(provider.requests[1]?.system).toContain('<RelevantPersistentMemory>');
	});

	it('filters and sorts relevant memory for retrieval', async () => {
		const store = new InMemoryMemoryStore(fixedClock);
		const retriever = new MemoryRetriever(store, undefined, fixedClock);
		const base: Omit<MemoryItem, 'id' | 'content' | 'summary' | 'tags' | 'kind'> = {
			userId: 'u1',
			importance: 'high',
			confidence: 0.95,
			privacyLevel: 'personal',
			source: { type: 'user_explicit' },
			createdAt: fixedClock().toISOString(),
			updatedAt: fixedClock().toISOString(),
			lastAccessedAt: fixedClock().toISOString(),
			metadata: {},
		};
		await store.addMemory('u1', {
			...base,
			id: 'mem_1',
			kind: 'preference',
			content: 'I prefer TypeScript examples.',
			summary: 'I prefer TypeScript examples.',
			tags: ['preference', 'typescript'],
		});
		await store.addMemory('u1', {
			...base,
			id: 'mem_2',
			kind: 'semantic',
			content: 'My favorite lunch is soup.',
			summary: 'My favorite lunch is soup.',
			tags: ['lunch'],
			importance: 'low',
		});

		const result = await retriever.retrieve({ userId: 'u1', query: 'Please write TypeScript code.' });

		expect(result.map((item) => item.id)).toEqual(['mem_1']);
	});

	it('does not inject irrelevant durable preferences into unrelated prompts', async () => {
		const { agent } = createAgent();

		await agent.respond({
			userId: 'u1',
			input: 'Remember that I prefer TypeScript examples.',
		});
		await agent.respond({
			userId: 'u1',
			input: 'Remember that I prefer soup for lunch.',
		});
		const result = await agent.respond({
			userId: 'u1',
			input: 'Show me a small code example.',
		});

		expect(result.relevantMemory.map((item) => item.content)).toEqual(['I prefer TypeScript examples']);
	});

	it('builds prompts with separated system, memory, history, and current input sections', async () => {
		const sessionManager = new InMemorySessionManager({ clock: fixedClock, maxMessages: 4 });
		const session = await sessionManager.createSession('u1');
		await sessionManager.appendMessage(session.id, { role: 'user', content: 'Earlier question' });
		const loaded = await sessionManager.loadSession(session.id);
		const memory = (await new InMemoryMemoryStore(fixedClock).getMemory('u1')).longTerm.items;

		const prompt = new PromptBuilder().build({
			systemInstructions: 'Be concise.',
			relevantMemories: memory,
			session: loaded,
			userInput: 'Current question',
		});

		expect(prompt.system).toContain('<SystemInstructions>');
		expect(prompt.system).toContain('<MemoryPolicyReminder>');
		expect(prompt.system).toContain('<RelevantPersistentMemory>');
		expect(prompt.system).toContain('<CurrentSessionHistory>');
		expect(prompt.renderedPrompt).toContain('<CurrentUserInput>');
		expect(prompt.messages[prompt.messages.length - 1]).toEqual({ role: 'user', content: 'Current question' });
	});

	it('persists and summarizes short-term session history in the session manager', async () => {
		const sessionManager = new InMemorySessionManager({ clock: fixedClock, maxMessages: 2 });
		const session = await sessionManager.createSession('u1');

		await sessionManager.appendMessage(session.id, { role: 'user', content: 'one' });
		await sessionManager.appendMessage(session.id, { role: 'assistant', content: 'two' });
		await sessionManager.appendMessage(session.id, { role: 'user', content: 'three' });
		const loaded = await sessionManager.loadSession(session.id);

		expect(loaded.shortTermMemory.messages.map((message) => message.content)).toEqual(['two', 'three']);
		expect(loaded.shortTermMemory.summary).toContain('one');
	});

	it('redacts and refuses to store secrets', async () => {
		const policy = new MemoryPolicy({ clock: fixedClock });
		const extractor = new MemoryExtractor(policy, undefined, fixedClock);
		const store = new InMemoryMemoryStore(fixedClock);
		const memory = await store.getMemory('u1');

		const decisions = extractor.extract({
			userId: 'u1',
			userMessage: 'Remember that my API key is sk-1234567890abcdef.',
			agentReply: 'ok',
			sessionId: 's1',
			existingMemory: memory,
		});

		expect(decisions[0]).toMatchObject({
			action: 'ignore',
			redactedContent: 'my API key: [REDACTED_SECRET]',
		});
	});

	it('stores implicit sensitive preferences without requiring permission', async () => {
		const policy = new MemoryPolicy({ clock: fixedClock });
		const extractor = new MemoryExtractor(policy, undefined, fixedClock);
		const store = new InMemoryMemoryStore(fixedClock);
		const memory = await store.getMemory('u1');

		const decisions = extractor.extract({
			userId: 'u1',
			userMessage: 'I prefer political news summaries in the morning.',
			agentReply: 'ok',
			sessionId: 's1',
			existingMemory: memory,
		});

		expect(decisions[0]).toMatchObject({
			action: 'store',
			shouldStore: true,
			candidateMemory: expect.objectContaining({ privacyLevel: 'sensitive' }),
		});
	});
});
