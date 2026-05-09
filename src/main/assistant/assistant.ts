import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { MemoryManager, buildSystemPrompt } from './memory';
import { SessionManager } from './session';
import { runAgent } from './loop';
import { defaultTools, type Tool } from './tools';
import type { CronService } from '../cron';
import type { StoreService } from '../store';

const MAX_ITERATIONS = 20;

export interface AssistantOptions {
	id: string;
}

/**
 * Conversational assistant with memory, persistent session history, and tools.
 * Mirrors the Kaioh CLI assistant: MemoryManager + SessionManager + runAgent.
 *
 * Lazy-init: memory/session bootstrap happens on first send().
 */
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

	constructor(opts: AssistantOptions, store: StoreService, cron?: CronService) {
		this.id = opts.id;
		this.store = store;
		this.memory = new MemoryManager(opts.id);
		this.session = new SessionManager(`assistant:${opts.id}`);
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

	private client(): OpenAI {
		const key = this.apiKey();
		if (!key) {
			throw new Error('OpenAI API key not configured. Add an OpenAI provider in Settings.');
		}
		if (key !== this.cachedKey) {
			this.cachedKey = key;
			this.cachedClient = new OpenAI({ apiKey: key });
		}
		return this.cachedClient!;
	}

	private apiKey(): string | undefined {
		const ref = this.store.getAssistantService().llm;
		const resolved = this.store.resolveProviderRef(ref);
		if (resolved?.provider.apiKey) return resolved.provider.apiKey;
		return this.store.findProvider('openai')?.apiKey;
	}

	private currentModel(): string {
		const ref = this.store.getAssistantService().llm;
		const resolved = this.store.resolveProviderRef(ref);
		const model = (
			ref.model ||
			resolved?.model ||
			this.store.findProvider('openai')?.defaultModel ||
			''
		).trim();
		if (!model) {
			throw new Error('Assistant model not configured. Select a model in Settings.');
		}
		return model;
	}

	async send(userMessage: string): Promise<string> {
		await this.init();
		const systemPrompt = await buildSystemPrompt(this.memory);
		const { text, newMessages } = await runAgent({
			client: this.client(),
			model: () => this.currentModel(),
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
