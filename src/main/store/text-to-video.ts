import {
	isAllowedTextToVideoModel,
	type ConfiguredModelOperator,
	type Model,
} from '../../shared/agents/service';
import { getTextToVideoModelsByProvider } from '../../shared/providers';
import type { SettingsStoreAccessor } from '../../shared/store';
import {
	getConfiguredModelOperatorForStore,
	getModelModuleSettingsForStore,
	modelModuleSettings,
} from './assistant';
import type { ProvidersStore } from './providers';

export class TextToVideoStore {
	constructor(
		private readonly store: SettingsStoreAccessor,
		private readonly providers: ProvidersStore
	) {}

	getTextToVideoOperator(): ConfiguredModelOperator | undefined {
		return getConfiguredModelOperatorForStore('textToVideo', this.store, this.providers);
	}

	setTextToVideoOperator(providerId: string, model: Model): boolean {
		const provider = this.providers.getProviderById(providerId);
		if (!provider || !isAllowedTextToVideoModel(provider.id, model.id)) return false;
		const current = getModelModuleSettingsForStore(this.store, 'textToVideo');
		const catalogModel = getTextToVideoModelsByProvider(provider.id).find(
			(entry) => entry.id === model.id
		);
		this.store.set(
			'textToVideo',
			modelModuleSettings(provider.id, catalogModel ?? model, current?.options)
		);
		return true;
	}
}
