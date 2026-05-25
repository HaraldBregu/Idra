import {
	getSpeechToTextModels,
	isAllowedSpeechToTextModel,
	type ConfiguredModelOperator,
	type Model,
	type ModelOperatorSelection,
} from '../../shared/agents/service';
import type { SettingsStoreAccessor } from '../../shared/store';
import {
	getConfiguredModelOperatorForStore,
	getModelModuleSettingsForStore,
	modelModuleSettings,
} from './assistant';
import type { ProvidersStore } from './providers';

export class SpeechToTextStore {
	constructor(
		private readonly store: SettingsStoreAccessor,
		private readonly providers: ProvidersStore
	) {}

	getSpeechToTextOperator(): ConfiguredModelOperator | undefined {
		return getConfiguredModelOperatorForStore('speechToText', this.store, this.providers);
	}

	setSpeechToTextOperator(providerId: string, model: Model): boolean {
		const provider = this.providers.getProviderById(providerId);
		if (!provider || !isAllowedSpeechToTextModel(provider.id, model.id)) return false;
		const current = getModelModuleSettingsForStore(this.store, 'speechToText');
		const catalogModel = getSpeechToTextModels(provider.id).find((entry) => entry.id === model.id);
		this.store.set(
			'speechToText',
			modelModuleSettings(provider.id, catalogModel ?? model, current?.options)
		);
		return true;
	}

	getSpeechTranscriberService(): ModelOperatorSelection | undefined {
		const operator = this.getSpeechToTextOperator();
		return operator ? { provider: operator.provider, model: operator.model } : undefined;
	}

	setSpeechTranscriberService(providerId: string, model: Model): boolean {
		return this.setSpeechToTextOperator(providerId, model);
	}
}
