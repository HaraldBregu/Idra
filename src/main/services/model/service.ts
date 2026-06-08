import Store from 'electron-store';
import type { Model, ModelSelection } from '../../../shared/agents/service';
import type { PublicProvider } from '../../../shared/providers';

type ModelSelectionKey =
	| 'agent'
	| 'speechTranscriber'
	| 'textToSpeech'
	| 'imageCreator'
	| 'textToVideo'
	| 'textToSound';

type ModelSelectionRecord = Partial<Record<ModelSelectionKey, ModelSelection>>;

type ModelSelectionStore = {
	get<TKey extends ModelSelectionKey>(key: TKey): ModelSelectionRecord[TKey];
	set<TKey extends ModelSelectionKey>(key: TKey, value: ModelSelectionRecord[TKey]): void;
};

export class ModelSelectionStoreService {
	private readonly store: ModelSelectionStore;

	constructor() {
		this.store = new Store<ModelSelectionRecord>({
			name: 'model-selections',
			accessPropertiesByDotNotation: false,
		}) as unknown as ModelSelectionStore;
	}

	getAgentService(): ModelSelection | undefined {
		return this.store.get('agent');
	}

	saveAgentService(provider: PublicProvider, model: Model): boolean {
		this.store.set('agent', { provider, model });
		return true;
	}

	getSpeechTranscriberService(): ModelSelection | undefined {
		return this.store.get('speechTranscriber');
	}

	saveSpeechTranscriberService(provider: PublicProvider, model: Model): boolean {
		this.store.set('speechTranscriber', { provider, model });
		return true;
	}

	getTextToSpeechService(): ModelSelection | undefined {
		return this.store.get('textToSpeech');
	}

	saveTextToSpeechService(provider: PublicProvider, model: Model): boolean {
		this.store.set('textToSpeech', { provider, model });
		return true;
	}

	getImageCreatorService(): ModelSelection | undefined {
		return this.store.get('imageCreator');
	}

	saveImageCreatorService(provider: PublicProvider, model: Model): boolean {
		this.store.set('imageCreator', { provider, model });
		return true;
	}

	getTextToVideoService(): ModelSelection | undefined {
		return this.store.get('textToVideo');
	}

	saveTextToVideoService(provider: PublicProvider, model: Model): boolean {
		this.store.set('textToVideo', { provider, model });
		return true;
	}

	getTextToSoundService(): ModelSelection | undefined {
		return this.store.get('textToSound');
	}

	saveTextToSoundService(provider: PublicProvider, model: Model): boolean {
		this.store.set('textToSound', { provider, model });
		return true;
	}
}
