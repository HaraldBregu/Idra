import {
	getImageCreatorModelsForProvider,
	isAllowedImageCreatorModelForProvider,
	type ConfiguredModelOperator,
	type Model,
} from '../../shared/agents/service';
import type { ModelModuleSettings, SettingsStoreAccessor } from '../../shared/store';
import {
	getConfiguredModelOperatorForStore,
	getModelModuleSettingsForStore,
	modelModuleSettings,
} from './assistant';
import type { ProvidersStore } from './providers';

export class ImageCreatorStore {
	constructor(
		private readonly store: SettingsStoreAccessor,
		private readonly providers: ProvidersStore
	) {}

	getImageCreatorOperator(): ConfiguredModelOperator | undefined {
		return getConfiguredModelOperatorForStore('imageCreator', this.store, this.providers);
	}

	getImageCreatorSettings(): ModelModuleSettings | undefined {
		return getModelModuleSettingsForStore(this.store, 'imageCreator');
	}

	setImageCreatorOperator(providerId: string, model: Model): boolean {
		const provider = this.providers.getProviderById(providerId);
		if (!provider || !isAllowedImageCreatorModelForProvider(provider, model.id)) return false;
		const catalogModel = getImageCreatorModelsForProvider(provider).find(
			(entry) => entry.id === model.id
		);
		const current = getModelModuleSettingsForStore(this.store, 'imageCreator');
		this.store.set(
			'imageCreator',
			modelModuleSettings(provider.id, catalogModel ?? model, current?.options)
		);
		return true;
	}
}
