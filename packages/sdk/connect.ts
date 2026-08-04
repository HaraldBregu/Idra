import { decode, encode } from '../../src/shared/api_codec';
import {
	AgentChannels,
	AppChannels,
	ChannelsChannels,
	TaskChannels,
	EmbeddingChannels,
	ImageChannels,
	McpChannels,
	ProviderChannels,
	RecorderChannels,
	SearchChannels,
	SkillsChannels,
	SoundChannels,
	SpeechChannels,
	SttChannels,
	StorageChannels,
	TextChannels,
	VideoChannels,
	ExtensionChannels,
	WikiChannels,
} from '../../src/shared/ipc_channels_definitions';
import type {
	AgentApi,
	AppApi,
	ChannelsApi,
	TaskApi,
	McpApi,
	ModelsApi,
	ProviderApi,
	RecorderApi,
	SearchApi,
	SkillsApi,
	StorageApi,
	ExtensionsApi,
	WikiApi,
} from '../../src/shared/api_types';
import type { AgentResponseEvent } from '../../src/shared/agent_types';
import type { ChannelStatusEvent } from '../../src/shared/channels_types';

export interface ConnectOptions {
	/** Base URL of the Friday API. Defaults to `http://127.0.0.1:8765`. */
	url?: string;
	/** Contents of `<userData>/sdk-token` in the Friday app data folder. */
	token: string;
	/** Override the fetch implementation (defaults to the global one). */
	fetch?: typeof globalThis.fetch;
}

export interface FridayClient {
	agent: AgentApi;
	app: AppApi;
	channels: ChannelsApi;
	tasks: TaskApi;
	mcp: McpApi;
	models: ModelsApi;
	provider: ProviderApi;
	recorder: RecorderApi;
	search: SearchApi;
	skills: SkillsApi;
	storage: StorageApi;
	extensions: ExtensionsApi;
	wiki: WikiApi;
	/** Verify the app is reachable and the token is accepted. */
	ping: () => Promise<{ name: string; version: string }>;
	/** Close the event stream, if one was opened. */
	close: () => void;
}

// Method names that do not match their channel key in the definitions above.
const ALIASES: Record<string, string> = {
	getLastMessages: 'lastMessages',
	healthGetSettings: 'healthSettings',
	healthGetData: 'healthData',
};

type Listener = (channel: string, data: unknown) => void;

function uuid(): string {
	return (
		globalThis.crypto?.randomUUID?.() ?? `run-${Date.now()}-${Math.random().toString(36).slice(2)}`
	);
}

export function connect(options: ConnectOptions): FridayClient {
	const base = (options.url ?? 'http://127.0.0.1:8765').replace(/\/$/, '');
	const call = options.fetch ?? globalThis.fetch;
	const headers = { authorization: `Bearer ${options.token}`, 'content-type': 'application/json' };

	const listeners = new Set<Listener>();
	let controller: AbortController | undefined;
	let opened: Promise<void> | undefined;

	const read = async (stream: ReadableStream<Uint8Array>): Promise<void> => {
		const reader = stream.getReader();
		const decoder = new TextDecoder();
		let buffer = '';
		for (;;) {
			const { done, value } = await reader.read();
			if (done) return;
			buffer += decoder.decode(value, { stream: true });
			const frames = buffer.split('\n\n');
			buffer = frames.pop() ?? '';
			for (const frame of frames) {
				if (!frame.startsWith('data: ')) continue;
				const event = decode(JSON.parse(frame.slice(6))) as { channel: string; data: unknown };
				for (const listener of listeners) listener(event.channel, event.data);
			}
		}
	};

	const open = (): Promise<void> => {
		if (opened) return opened;
		controller = new AbortController();
		opened = call(`${base}/events`, { headers, signal: controller.signal }).then((response) => {
			if (!response.ok || !response.body)
				throw new Error(`Event stream failed: ${response.status}`);
			void read(response.body).catch(() => undefined);
		});
		return opened;
	};

	const listen = async (listener: Listener): Promise<() => void> => {
		await open();
		listeners.add(listener);
		return (): void => {
			listeners.delete(listener);
		};
	};

	const invoke = async (channel: string, args: unknown[]): Promise<unknown> => {
		const response = await call(`${base}/invoke`, {
			method: 'POST',
			headers,
			body: JSON.stringify(encode({ channel, args })),
		});
		const result = decode(await response.json()) as
			| { success: true; data: unknown }
			| { success: false; error: { message: string } };
		if (!result.success) throw new Error(result.error.message);
		return result.data;
	};

	const namespace = <T>(channels: Record<string, string>, extras: Partial<T> = {}): T =>
		new Proxy(extras as object, {
			get(target, key) {
				if (typeof key !== 'string') return undefined;
				if (key in target) return (target as Record<string, unknown>)[key];
				const channel = channels[ALIASES[key] ?? key];
				if (!channel) throw new Error(`@friday/sdk: "${key}" is not available over the API.`);
				return (...args: unknown[]): Promise<unknown> => invoke(channel, args);
			},
		}) as T;

	const recorderNamespace = (
		channels: Record<string, string> & { command: string; event: string }
	): RecorderApi['microphone'] =>
		namespace<RecorderApi['microphone']>(channels, {
			onCommand: (callback) => {
				const pending = listen((channel, data) => {
					if (channel === channels.command) callback(data as never);
				});
				return (): void => {
					void pending.then((off) => off());
				};
			},
			onEvent: (callback) => {
				const pending = listen((channel, data) => {
					if (channel === channels.event) callback(data as never);
				});
				return (): void => {
					void pending.then((off) => off());
				};
			},
		});

	return {
		agent: namespace<AgentApi>(AgentChannels, {
			send: async (message, sendOptions, onEvent) => {
				const runId = (sendOptions?.runId as string) || uuid();
				const off = onEvent
					? await listen((channel, data) => {
							const event = data as AgentResponseEvent;
							if (channel === AgentChannels.response && event.runId === runId) onEvent(event);
						})
					: undefined;
				try {
					return (await invoke(AgentChannels.send, [message, { ...sendOptions, runId }])) as string;
				} finally {
					off?.();
				}
			},
		}),
		app: namespace<AppApi>(AppChannels),
		channels: namespace<ChannelsApi>(ChannelsChannels, {
			onStatusChanged: (callback: (event: ChannelStatusEvent) => void) => {
				const pending = listen((channel, data) => {
					if (channel === ChannelsChannels.statusChanged) callback(data as ChannelStatusEvent);
				});
				return (): void => {
					void pending.then((off) => off());
				};
			},
		}),
		tasks: namespace<TaskApi>(TaskChannels),
		mcp: namespace<McpApi>(McpChannels),
		models: {
			embedding: namespace<ModelsApi['embedding']>(EmbeddingChannels),
			image: namespace<ModelsApi['image']>(ImageChannels),
			sound: namespace<ModelsApi['sound']>(SoundChannels),
			text: namespace<ModelsApi['text']>(TextChannels),
			transcribe: namespace<ModelsApi['transcribe']>(SttChannels, {
				onRealtimeEvent: (callback) => {
					const pending = listen((channel, data) => {
						if (channel === SttChannels.realtimeEvent) callback(data as never);
					});
					return (): void => {
						void pending.then((off) => off());
					};
				},
			}),
			video: namespace<ModelsApi['video']>(VideoChannels),
			voice: namespace<ModelsApi['voice']>(SpeechChannels),
		},
		provider: namespace<ProviderApi>(ProviderChannels),
		recorder: {
			microphone: recorderNamespace(RecorderChannels.microphone),
			camera: recorderNamespace(RecorderChannels.camera),
			screen: recorderNamespace(RecorderChannels.screen),
		},
		search: namespace<SearchApi>(SearchChannels),
		skills: namespace<SkillsApi>(SkillsChannels),
		storage: namespace<StorageApi>(StorageChannels),
		extensions: namespace<ExtensionsApi>(ExtensionChannels),
		wiki: namespace<WikiApi>(WikiChannels),
		ping: async () => {
			const response = await call(`${base}/health`, { headers });
			if (!response.ok) throw new Error(`Friday API unreachable: ${response.status}`);
			return (await response.json()) as { name: string; version: string };
		},
		close: () => {
			listeners.clear();
			controller?.abort();
			controller = undefined;
			opened = undefined;
		},
	};
}
