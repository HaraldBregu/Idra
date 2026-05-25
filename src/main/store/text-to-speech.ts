import {
	isAllowedTextToSpeechModel,
	type ConfiguredModelOperator,
	type Model,
} from '../../shared/agents/service';
import { getTextToSpeechModelsByProvider } from '../../shared/providers';
import type { SettingsStoreAccessor } from '../../shared/store';
import {
	getConfiguredModelOperatorForStore,
	getModelModuleSettingsForStore,
	modelModuleSettings,
} from './assistant';
import type { ProvidersStore } from './providers';

export class TextToSpeechStore {
	constructor(
		private readonly store: SettingsStoreAccessor,
		private readonly providers: ProvidersStore
	) {}

	getTextToSpeechOperator(): ConfiguredModelOperator | undefined {
		return getConfiguredModelOperatorForStore('textToSpeech', this.store, this.providers);
	}

	setTextToSpeechOperator(providerId: string, model: Model): boolean {
		const provider = this.providers.getProviderById(providerId);
		if (!provider || !isAllowedTextToSpeechModel(provider.id, model.id)) return false;
		const current = getModelModuleSettingsForStore(this.store, 'textToSpeech');
		const catalogModel = getTextToSpeechModelsByProvider(provider.id).find(
			(entry) => entry.id === model.id
		);
		this.store.set(
			'textToSpeech',
			modelModuleSettings(provider.id, catalogModel ?? model, current?.options)
		);
		return true;
	}
}
