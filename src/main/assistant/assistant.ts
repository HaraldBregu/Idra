import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { MemoryManager, buildSystemPrompt } from './memory';
import { SessionManager } from './session';
import { runAgent } from './loop';
import { defaultTools, type Tool } from './tools';
import { MAX_ITERATIONS } from './constants';
import type { CronService } from '../cron';
import type { LoggerService } from '../logger';
import type { StoreService } from '../store';

export class Assistant {
	readonly id: string;
	readonly memory: MemoryManager;
	readonly session: SessionManager;
	private readonly tools: Tool[];
	private readonly store: StoreService;
	private readonly logger: LoggerService;
	private readonly source: string;
	private history: ChatCompletionMessageParam[] = [];
	private cachedKey: string | null = null;
	private cachedClient: OpenAI | null = null;
	private initialized = false;
	private initPromise: Promise<void> | null = null;

	constructor(assistantId: string, store: StoreService, cron: CronService, logger: LoggerService) {
		this.id = assistantId;
		this.store = store;
		this.logger = logger;
		this.source = `Assistant:${assistantId}`;
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

	private assistantConfig(): { apiKey: string; model: string } {
		const assistant = this.store.getAssistantService();
		const providerId = assistant?.provider.id.trim().toLowerCase() ?? '';
		const model = assistant?.model.id.trim() || assistant?.model.name.trim() || '';

		if (!providerId) {
			throw new Error('Assistant provider not configured. Select a provider in Settings.');
		}

		const provider = this.store.getProviderById(providerId);
		if (!provider) {
			throw new Error(`Assistant provider "${assistant?.provider.id}" is not configured.`);
		}

		const apiKey = provider.apikey.trim();
		if (!apiKey) {
			throw new Error(
				`API key not configured for assistant provider "${provider.id}". Add it in Settings.`
			);
		}
		if (!model) {
			throw new Error('Assistant model not configured. Select a model in Settings.');
		}

		return { apiKey, model };
	}

	async send(userMessage: string): Promise<string> {
		await this.init();
		try {
			const systemPrompt = await buildSystemPrompt(this.memory);
			const { apiKey, model } = this.assistantConfig();
			this.logger.debug(this.source, `send -> model="${model}"`);
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
		} catch (err) {
			this.logger.error(this.source, 'send failed', {
				message: (err as Error).message,
				stack: (err as Error).stack,
			});
			throw err;
		}
	}

	async reset(): Promise<void> {
		this.logger.info(this.source, 'reset');
		await this.session.clear();
		await this.memory.clear();
		this.history = [];
		this.initialized = false;
		this.initPromise = null;
		await this.init();
	}
}
