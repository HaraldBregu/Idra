import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { MemoryManager, buildSystemPrompt } from './memory';
import { SessionManager } from './session';
import { runAgent } from './loop';
import { defaultTools, type Tool } from './tools';
import { MAX_ITERATIONS } from './constants';
import type { CronService } from '../cron';
import type { StoreService } from '../store';

export class Assistant {
	readonly id: string;
	readonly memory: MemoryManager;
	readonly session: SessionManager;
	private readonly tools: Tool[];
	private readonly store: StoreService;
	private history: ChatCompletionMessageParam[] = [];
	private cachedKey: string | null = null;
	private cachedClient: OpenAI | null = null;
	private initialized = false;
	private initPromise: Promise<void> | null = null;

	constructor(assistantId: string, store: StoreService, cron: CronService) {
		this.id = assistantId;
		this.store = store;
		this.memory = new MemoryManager(assistantId);
		this.session = new SessionManager(`assistant:${assistantId}`);
		this.tools = defaultTools({ cron, store });
	}

	async init(): Promise<void> {
		if (this.initialized) return;
		if (this.initPromise) return this.initPromise;
		this.initPromise = (async () => {
			await this.memory.init();
			await this.session.init();
			this.history = await this.session.load();
			this.initialized = true;
		})();
		return this.initPromise;
	}

	private client(apiKey: string): OpenAI {
		if (apiKey !== this.cachedKey) {
			this.cachedKey = apiKey;
			this.cachedClient = new OpenAI({ apiKey });
		}
		return this.cachedClient!;
	}

	async send(userMessage: string): Promise<string> {
		await this.init();
		const systemPrompt = await buildSystemPrompt(this.memory);
		const { apiKey, model } = this.assistantConfig();
		const { text, newMessages } = await runAgent({
			client: this.client(apiKey),
			model,
			userMessage,
			tools: this.tools,
			history: this.history,
			systemPrompt,
			maxIterations: MAX_ITERATIONS,
		});
		await this.session.append(newMessages);
		this.history.push(...newMessages);
		return text;
	}

	async reset(): Promise<void> {
		await this.session.clear();
		await this.memory.clear();
		this.history = [];
		this.initialized = false;
		this.initPromise = null;
		await this.init();
	}
}
