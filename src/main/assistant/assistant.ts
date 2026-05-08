import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { MemoryManager, buildSystemPrompt } from './memory';
import { SessionManager } from './session';
import { runAgent } from './loop';
import { defaultTools, type Tool } from './tools';
import type { CronService } from '../cron';
import type { StoreService } from '../store';

const HARDCODED_MODEL = 'gpt-4o-mini';

export interface AssistantOptions {
	id: string;
	model?: string;
	getApiKey: () => string | undefined;
	getModel?: () => string | undefined;
	/** Defaults to all built-in tools (read_file, write_file, exec, plus cron_* if `cron` provided). Pass `[]` to disable. */
	tools?: Tool[];
	/** When provided, cron_add/cron_list/cron_remove tools are added to defaults. Ignored if `tools` is set. */
	cron?: CronService;
	/** When provided, provider settings tools are added to defaults. Ignored if `tools` is set. */
	store?: StoreService;
	/** Defaults to `assistant:<id>`. */
	sessionKey?: string;
	maxIterations?: number;
}

/**
 * Conversational assistant with memory, persistent session history, and tools.
 * Mirrors the Kaioh CLI assistant: MemoryManager + SessionManager + runAgent.
 *
 * Lazy-init: memory/session bootstrap happens on first send().
 */
export class Assistant {
	readonly id: string;
	readonly model: string;
	readonly memory: MemoryManager;
	readonly session: SessionManager;
	private readonly tools: Tool[];
	private readonly maxIterations: number;
	private readonly getApiKey: () => string | undefined;
	private readonly getModel?: () => string | undefined;
	private history: ChatCompletionMessageParam[] = [];
	private cachedKey: string | null = null;
	private cachedClient: OpenAI | null = null;
	private initialized = false;
	private initPromise: Promise<void> | null = null;

	constructor(opts: AssistantOptions) {
		this.id = opts.id;
		this.model = opts.model ?? HARDCODED_MODEL;
		this.getApiKey = opts.getApiKey;
		this.getModel = opts.getModel;
		this.memory = new MemoryManager(opts.id);
		this.session = new SessionManager(opts.sessionKey ?? `assistant:${opts.id}`);
		this.tools = opts.tools ?? defaultTools({ cron: opts.cron, store: opts.store });
		this.maxIterations = opts.maxIterations ?? 20;
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
		return this.getModel?.()?.trim() || this.model;
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
			maxIterations: this.maxIterations,
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
