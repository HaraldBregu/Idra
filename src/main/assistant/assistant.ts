import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { MemoryManager, buildSystemPrompt } from './memory';
import { SessionManager } from './session';
import { runAgent } from './loop';
import type { Tool } from './tools';

const MAX_ITERATIONS = 20;

export interface AssistantOptions {
	id: string;
}

export interface AssistantDependencies {
	getApiKey: () => string | undefined;
	getModel: () => string | undefined;
	tools: Tool[];
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
	private readonly getApiKey: () => string | undefined;
	private readonly getModel: () => string | undefined;
	private history: ChatCompletionMessageParam[] = [];
	private cachedKey: string | null = null;
	private cachedClient: OpenAI | null = null;
	private initialized = false;
	private initPromise: Promise<void> | null = null;

	constructor(opts: AssistantOptions, deps: AssistantDependencies) {
		this.id = opts.id;
		this.getApiKey = deps.getApiKey;
		this.getModel = deps.getModel;
		this.memory = new MemoryManager(opts.id);
		this.session = new SessionManager(`assistant:${opts.id}`);
		this.tools = deps.tools;
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
		const key = this.getApiKey();
		if (!key) {
			throw new Error('OpenAI API key not configured. Add an OpenAI provider in Settings.');
		}
		if (key !== this.cachedKey) {
			this.cachedKey = key;
			this.cachedClient = new OpenAI({ apiKey: key });
		}
		return this.cachedClient!;
	}

	private currentModel(): string {
		const model = this.getModel().trim();
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
