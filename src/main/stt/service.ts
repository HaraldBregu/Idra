import { randomUUID } from 'node:crypto';
import type { WebContents } from 'electron';
import type { LoggerService } from '../logger';
import type { StoreService } from '../store';
import {
	getSpeechToTextModels,
	isAllowedSpeechToTextModel,
	type ConfiguredModelOperator,
	type Model,
} from '../../shared/agents/service';
import type {
	RealtimeTranscriptionSession,
	RealtimeTranscriptionStartRequest,
} from '../../shared/realtime-transcription';
import type {
	SpeechToTextTranscribeRequest,
	SpeechToTextTranscription,
} from '../../shared/speech-to-text';
import type { ModelModuleSettings } from '../../shared/store';
import { RealtimeTranscriptionChannels } from '../../shared/ipc-channels';
import type { Provider } from '../../shared/providers';
import { createDeepgramSpeechToTextAdapter } from './deepgram-realtime-adapter';
import { createElevenLabsSpeechToTextAdapter } from './elevenlabs-realtime-adapter';
import { createMistralRealtimeSpeechToTextAdapter } from './mistral-realtime-adapter';
import { createOpenAIRealtimeSpeechToTextAdapter } from './openai-realtime-adapter';
import { createQwenRealtimeSpeechToTextAdapter } from './qwen-realtime-adapter';
import { createXaiSpeechToTextAdapter } from './xai-realtime-adapter';
import type {
	SpeechToTextRealtimeAdapter,
	SpeechToTextRealtimeSession,
	SpeechToTextSessionCallbacks,
} from './types';

interface SpeechToTextServiceDependencies {
	store: StoreService;
	logger?: Pick<LoggerService, 'info'>;
	adapters?: readonly SpeechToTextRealtimeAdapter[];
}

interface OwnedSpeechToTextSession {
	session: SpeechToTextRealtimeSession;
	owner: WebContents;
}

interface SpeechToTextStartOptions {
	eventChannel?: string;
}

interface ResolvedSpeechToTextRuntime {
	operator: ConfiguredModelOperator;
	provider: Provider;
	model: Model;
	settings: ModelModuleSettings;
}

export class SpeechToTextService {
	private readonly adapters: readonly SpeechToTextRealtimeAdapter[];
	private readonly sessions = new Map<string, OwnedSpeechToTextSession>();

	constructor(private readonly dependencies: SpeechToTextServiceDependencies) {
		this.adapters = dependencies.adapters ?? [
			createOpenAIRealtimeSpeechToTextAdapter(),
			createDeepgramSpeechToTextAdapter(),
			createElevenLabsSpeechToTextAdapter(),
			createMistralRealtimeSpeechToTextAdapter(),
			createXaiSpeechToTextAdapter(),
			createQwenRealtimeSpeechToTextAdapter(),
		];
	}

	getModels(providerId: string): Model[] {
		return getSpeechToTextModels(providerId);
	}

	async start(
		owner: WebContents,
		request?: RealtimeTranscriptionStartRequest,
		options?: SpeechToTextStartOptions
	): Promise<RealtimeTranscriptionSession> {
		const sessionId = randomUUID();
		const eventChannel = options?.eventChannel ?? RealtimeTranscriptionChannels.event;
		const session = await this.startSession(sessionId, request, {
			emit: (event) => this.sendToRenderer(owner, eventChannel, event),
			closed: (closedSessionId) => {
				this.sessions.delete(closedSessionId);
			},
		});
		this.sessions.set(sessionId, { session, owner });
		owner.once('destroyed', () => this.closeSession(sessionId));
		this.dependencies.logger?.info('SpeechToTextService', `Started session "${sessionId}"`);
		return this.sessionState(session);
	}

	async transcribe(request: SpeechToTextTranscribeRequest): Promise<SpeechToTextTranscription> {
		const sessionId = randomUUID();
		let session: SpeechToTextRealtimeSession | null = null;
		const transcripts: string[] = [];

		return new Promise((resolve, reject) => {
			let settled = false;
			const done = (error?: Error): void => {
				if (settled) return;
				settled = true;
				if (error) {
					reject(error);
					return;
				}

				resolve({
					model: session?.model ?? '',
					transcript: transcripts.join('\n').trim(),
				});
			};

			void this.startSession(sessionId, request, {
				emit: (event) => {
					if (event.type === 'completed') {
						if (event.transcript.trim()) transcripts.push(event.transcript.trim());
						return;
					}
					if (event.type === 'error') {
						done(new Error(event.message));
						session?.close();
					}
				},
				closed: () => {
					done();
				},
			})
				.then((createdSession) => {
					session = createdSession;
					createdSession.appendAudio(request.audio);
					createdSession.finish();
				})
				.catch((error: unknown) => {
					done(error instanceof Error ? error : new Error(String(error)));
					session?.close();
				});
		});
	}

	private async startSession(
		sessionId: string,
		request: RealtimeTranscriptionStartRequest | undefined,
		callbacks: SpeechToTextSessionCallbacks
	): Promise<SpeechToTextRealtimeSession> {
		const resolved = this.resolveRuntime();
		const adapter = this.adapters.find((candidate) =>
			candidate.supports(resolved.provider.id, resolved.model.id)
		);
		if (!adapter) {
			throw new Error(
				`No speech-to-text adapter is available for provider "${resolved.provider.id}" and model "${resolved.model.id}".`
			);
		}

		return adapter.startSession({
			sessionId,
			provider: resolved.provider,
			operator: resolved.operator,
			model: resolved.model,
			request,
			callbacks,
		});
	}

	appendAudio(owner: WebContents, sessionId: string, audio: string): void {
		if (typeof audio !== 'string' || audio.length === 0) return;
		this.requireSessionForSender(sessionId, owner).session.appendAudio(audio);
	}

	getSession(owner: WebContents, sessionId: string): RealtimeTranscriptionSession {
		return this.sessionState(this.requireSessionForSender(sessionId, owner).session);
	}

	finish(owner: WebContents, sessionId: string): void {
		this.requireSessionForSender(sessionId, owner).session.finish();
	}

	cancel(owner: WebContents, sessionId: string): void {
		const runtime = this.requireSessionForSender(sessionId, owner);
		this.sessions.delete(sessionId);
		runtime.session.cancel();
	}

	destroy(): void {
		for (const sessionId of [...this.sessions.keys()]) {
			this.closeSession(sessionId);
		}
	}

	private resolveRuntime(): ResolvedSpeechToTextRuntime {
		const settings = this.dependencies.store.getSpeechToTextSettings();
		if (!settings) {
			throw new Error('Speech-to-text is not configured. Select a provider and model in Settings.');
		}

		const providerId = settings.providerId.trim().toLowerCase();
		const modelId = settings.modelId.trim();
		if (!providerId) throw new Error('Speech-to-text provider is not configured.');
		if (!modelId) throw new Error('Speech-to-text model is not configured.');
		if (!isAllowedSpeechToTextModel(providerId, modelId)) {
			throw new Error(`Model is not supported for speech-to-text: ${modelId}`);
		}

		const provider = this.dependencies.store.getProviderById(providerId);
		if (!provider) throw new Error(`Speech-to-text provider is not configured: ${providerId}`);
		const apiKey = provider.apiKey.trim();
		if (!apiKey) throw new Error(`API key missing for speech-to-text provider: ${providerId}`);

		const operator = this.dependencies.store.getSpeechToTextOperator();
		if (!operator) {
			throw new Error('Speech-to-text settings are invalid. Select a supported provider and model.');
		}

		return {
			operator,
			provider,
			model: {
				id: modelId,
				name: operator.model.name,
			},
			settings,
		};
	}

	private requireSessionForSender(
		sessionId: string,
		sender: WebContents
	): OwnedSpeechToTextSession {
		const runtime = this.sessions.get(sessionId);
		if (!runtime || runtime.owner.id !== sender.id) {
			throw new Error('Realtime transcription session was not found.');
		}
		return runtime;
	}

	private sendToRenderer(
		owner: WebContents,
		channel: string,
		event: Parameters<WebContents['send']>[1]
	): void {
		if (owner.isDestroyed()) return;
		owner.send(channel, event);
	}

	private closeSession(sessionId: string): void {
		const runtime = this.sessions.get(sessionId);
		if (!runtime) return;
		this.sessions.delete(sessionId);
		runtime.session.close();
	}

	private sessionState(session: SpeechToTextRealtimeSession): RealtimeTranscriptionSession {
		return { id: session.id, model: session.model, sampleRate: session.sampleRate };
	}
}
