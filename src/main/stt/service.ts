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
import { RealtimeTranscriptionChannels } from '../../shared/ipc-channels';
import type { Provider } from '../../shared/providers';
import { createElevenLabsSpeechToTextAdapter } from './elevenlabs-realtime-adapter';
import { createMistralRealtimeSpeechToTextAdapter } from './mistral-realtime-adapter';
import { createOpenAIRealtimeSpeechToTextAdapter } from './openai-realtime-adapter';
import { createQwenRealtimeSpeechToTextAdapter } from './qwen-realtime-adapter';
import { createXaiSpeechToTextAdapter } from './xai-realtime-adapter';
import type { SpeechToTextRealtimeAdapter, SpeechToTextRealtimeSession } from './types';

interface SpeechToTextServiceDependencies {
	store: StoreService;
	logger?: Pick<LoggerService, 'info'>;
	adapters?: readonly SpeechToTextRealtimeAdapter[];
}

interface OwnedSpeechToTextSession {
	session: SpeechToTextRealtimeSession;
	owner: WebContents;
}

export class SpeechToTextService {
	private readonly adapters: readonly SpeechToTextRealtimeAdapter[];
	private readonly sessions = new Map<string, OwnedSpeechToTextSession>();

	constructor(private readonly dependencies: SpeechToTextServiceDependencies) {
		this.adapters = dependencies.adapters ?? [
			createOpenAIRealtimeSpeechToTextAdapter(),
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
		request?: RealtimeTranscriptionStartRequest
	): Promise<RealtimeTranscriptionSession> {
		const resolved = this.resolveRuntime();
		const adapter = this.adapters.find((candidate) =>
			candidate.supports(resolved.provider.id, resolved.model.id)
		);
		if (!adapter) {
			throw new Error(
				`No speech-to-text adapter is available for provider "${resolved.provider.id}" and model "${resolved.model.id}".`
			);
		}

		const sessionId = randomUUID();
		const session = await adapter.startSession({
			sessionId,
			provider: resolved.provider,
			operator: resolved.operator,
			model: resolved.model,
			request,
			callbacks: {
				emit: (event) => this.sendToRenderer(owner, event),
				closed: (closedSessionId) => {
					this.sessions.delete(closedSessionId);
				},
			},
		});
		this.sessions.set(sessionId, { session, owner });
		owner.once('destroyed', () => this.closeSession(sessionId));
		this.dependencies.logger?.info('SpeechToTextService', `Started session "${sessionId}"`);
		return { id: session.id, model: session.model, sampleRate: session.sampleRate };
	}

	appendAudio(owner: WebContents, sessionId: string, audio: string): void {
		if (typeof audio !== 'string' || audio.length === 0) return;
		this.requireSessionForSender(sessionId, owner).session.appendAudio(audio);
	}

	finish(owner: WebContents, sessionId: string): void {
		this.requireSessionForSender(sessionId, owner).session.finish();
	}

	cancel(owner: WebContents, sessionId: string): void {
		this.requireSessionForSender(sessionId, owner).session.cancel();
	}

	private resolveRuntime(): {
		operator: ConfiguredModelOperator;
		provider: Provider;
		model: Model;
	} {
		const operator = this.dependencies.store.getSpeechToTextOperator();
		if (!operator) {
			throw new Error('Speech-to-text is not configured. Select a provider and model in Settings.');
		}

		const providerId = operator.provider.id.trim().toLowerCase();
		const modelId = operator.model.id.trim();
		if (!providerId) throw new Error('Speech-to-text provider is not configured.');
		if (!modelId) throw new Error('Speech-to-text model is not configured.');
		if (!isAllowedSpeechToTextModel(providerId, modelId)) {
			throw new Error(`Model is not supported for speech-to-text: ${modelId}`);
		}

		const provider = this.dependencies.store.getProviderById(providerId);
		if (!provider) throw new Error(`Speech-to-text provider is not configured: ${providerId}`);
		const apiKey = provider.apiKey.trim();
		if (!apiKey) throw new Error(`API key missing for speech-to-text provider: ${providerId}`);

		return {
			operator,
			provider,
			model: {
				id: modelId,
				name: operator.model.name,
			},
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
		event: Parameters<WebContents['send']>[1]
	): void {
		if (owner.isDestroyed()) return;
		owner.send(RealtimeTranscriptionChannels.event, event);
	}

	private closeSession(sessionId: string): void {
		const runtime = this.sessions.get(sessionId);
		if (!runtime) return;
		this.sessions.delete(sessionId);
		runtime.session.close();
	}
}
