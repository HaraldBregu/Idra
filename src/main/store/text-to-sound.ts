import {
	isAllowedMusicCreatorModel,
	type ConfiguredModelOperator,
	type Model,
} from '../../shared/agents/service';
import { getMusicModelsByProvider } from '../../shared/providers';
import type { SettingsStoreAccessor } from '../../shared/store';
import {
	getConfiguredModelOperatorForStore,
	getModelModuleSettingsForStore,
	modelModuleSettings,
} from './assistant';
import type { ProvidersStore } from './providers';

export class TextToSoundStore {
	constructor(
		private readonly store: SettingsStoreAccessor,
		private readonly providers: ProvidersStore
	) {}

	getTextToSoundOperator(): ConfiguredModelOperator | undefined {
		return getConfiguredModelOperatorForStore('textToSound', this.store, this.providers);
	}

	setTextToSoundOperator(providerId: string, model: Model): boolean {
		const provider = this.providers.getProviderById(providerId);
		if (!provider || !isAllowedMusicCreatorModel(provider.id, model.id)) return false;
		const current = getModelModuleSettingsForStore(this.store, 'textToSound');
		const catalogModel = getMusicModelsByProvider(provider.id).find(
			(entry) => entry.id === model.id
		);
		this.store.set(
			'textToSound',
			modelModuleSettings(provider.id, catalogModel ?? model, current?.options)
		);
		return true;
	}
}
