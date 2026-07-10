import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';
import { DEFAULT_PROVIDERS } from '../../../../../../shared';
import {
	cloneModels,
	normalizeProviderId,
	TEXT_TO_SPEECH_MODELS_BY_PROVIDER,
	TEXT_TO_SPEECH_PROVIDER_IDS,
} from '../../../../../../shared/provider_models_definitions';
import type { PublicProvider } from '../../../../../../shared';
import {
	SettingsNotice,
	SettingsPageHeader,
	SettingsPageShell,
	SettingsSection,
} from '../../components';
import { ModelProviderConfiguration } from '../../components/model-configuration';
import {
	firstErrorMessage,
	initialModelConfigurationState,
	mergeModels,
	mergeProviders,
	type ModelConfigurationState,
} from '../../components/model-configuration-state';
import type { ProviderModelGroup } from '../../../start/types';
import type { Model, ModelSelection } from '@/lib/compat';
import VoiceTest from './VoiceTest';

type CatalogProvider = (typeof DEFAULT_PROVIDERS)[number];

function toPublicProvider(provider: CatalogProvider): PublicProvider {
	return {
		id: provider.id,
		name: provider.name,
		baseUrl: provider.baseUrl,
		...(provider.capabilities ? { capabilities: provider.capabilities } : {}),
		...(provider.apiConfiguration ? { apiConfiguration: provider.apiConfiguration } : {}),
	};
}

function getCatalogProviderById(providerId: string): CatalogProvider | undefined {
	return DEFAULT_PROVIDERS.find((provider) => provider.id === providerId);
}

function getVoiceModels(providerId: string): Model[] {
	return cloneModels(TEXT_TO_SPEECH_MODELS_BY_PROVIDER[normalizeProviderId(providerId)]);
}

async function getVoiceSelection(): Promise<ModelSelection | undefined> {
	const [providerId, modelId] = await Promise.all([
		window.voice.getProviderId(),
		window.voice.getModelId(),
	]);
	if (!providerId || !modelId) return undefined;
	const provider = getCatalogProviderById(providerId);
	const model = getVoiceModels(providerId).find((item) => item.id === modelId);
	if (!provider || !model) return undefined;
	return { provider: toPublicProvider(provider), model };
}

async function saveVoiceSelection(provider: PublicProvider, model: Model): Promise<boolean> {
	await window.voice.setProviderId(provider.id);
	await window.voice.setModelId(model.id);
	return true;
}

const VoicePage: React.FC = () => {
	const { t } = useTranslation();
	const [state, setState] = useState<ModelConfigurationState>(initialModelConfigurationState);

	const selectedGroup = useMemo(
		() => state.modelGroups.find((group) => group.provider.id === state.providerId),
		[state.modelGroups, state.providerId]
	);
	const selectedProvider = selectedGroup?.provider;
	const selectedModel = selectedGroup?.models.find((model) => model.id === state.modelId);

	useEffect(() => {
		let mounted = true;

		async function loadService(): Promise<void> {
			setState((current) => ({
				...current,
				loading: true,
				loadingModels: true,
				saved: false,
				error: null,
			}));

			try {
				const selection = await getVoiceSelection();
				const providers = TEXT_TO_SPEECH_PROVIDER_IDS.flatMap((providerId) => {
					const provider = getCatalogProviderById(providerId);
					return provider ? [toPublicProvider(provider)] : [];
				});
				const mergedProviders = mergeProviders(providers, selection?.provider);
				if (!mounted) return;

				const modelGroups: ProviderModelGroup[] = [];
				let firstModelError: unknown;

				for (const provider of mergedProviders) {
					try {
						const models = await activeService.getModels(provider);
						const nextModels =
							selection?.provider.id === provider.id
								? mergeModels(models, selection.model)
								: models;
						if (nextModels.length > 0) modelGroups.push({ provider, models: nextModels });
					} catch (error) {
						firstModelError ??= error;
					}
				}

				if (!mounted) return;
				const preferredGroup =
					modelGroups.find((group) => group.provider.id === selection?.provider.id) ??
					modelGroups[0];
				const preferredModel =
					preferredGroup?.models.find((model) => model.id === selection?.model.id) ??
					preferredGroup?.models[0];

				setState({
					providers: mergedProviders,
					modelGroups,
					providerId: preferredGroup?.provider.id ?? '',
					modelId: preferredModel?.id ?? '',
					loading: false,
					loadingModels: false,
					saving: false,
					saved: false,
					error: firstModelError
						? firstErrorMessage(firstModelError, t('settings.modelServices.modelsLoadError'))
						: null,
				});
			} catch (error) {
				if (!mounted) return;
				setState({
					...initialModelConfigurationState,
					loading: false,
					loadingModels: false,
					error: firstErrorMessage(error, t('settings.modelServices.loadError')),
				});
			}
		}

		void loadService();
		return () => {
			mounted = false;
		};
	}, [service, t]);

	const handleProviderChange = (nextProviderId: string): void => {
		const group = state.modelGroups.find((item) => item.provider.id === nextProviderId);
		setState((current) => ({
			...current,
			providerId: nextProviderId,
			modelId: group?.models[0]?.id ?? '',
			saved: false,
			error: null,
		}));
	};

	const handleModelChange = (nextModelId: string): void => {
		setState((current) => ({
			...current,
			modelId: nextModelId,
			saved: false,
			error: null,
		}));
	};

	const handleSave = async (): Promise<void> => {
		if (!service || !selectedProvider || !selectedModel) return;
		setState((current) => ({ ...current, saving: true, saved: false, error: null }));
		try {
			const didSave = await service.saveSelection(selectedProvider, selectedModel);
			if (!didSave) throw new Error(t('settings.modelServices.saveError'));
			setState((current) => ({ ...current, saving: false, saved: true }));
		} catch (error) {
			setState((current) => ({
				...current,
				saving: false,
				error: firstErrorMessage(error, t('settings.modelServices.saveError')),
			}));
		}
	};

	return (
		<SettingsPageShell>
			<SettingsPageHeader
				title={t('settings.modelServices.voiceName')}
				description={t('settings.modelServices.voiceDescription')}
			/>

			{state.error && (
				<SettingsNotice variant="destructive" icon={AlertTriangle}>
					{state.error}
				</SettingsNotice>
			)}

			<SettingsSection title={t('settings.modelServices.configuration')}>
				<ModelProviderConfiguration
					configState={state}
					idPrefix="voice"
					providerDescription={t('settings.modelServices.providerDescription')}
					modelDescription={t('settings.modelServices.modelDescription')}
					onProviderChange={handleProviderChange}
					onModelChange={handleModelChange}
					onSave={() => void handleSave()}
				/>
			</SettingsSection>

			<SettingsSection
				title={t('settings.modelServices.test')}
				description={t('settings.modelServices.testVoiceDescription')}
			>
				<VoiceTest />
			</SettingsSection>
		</SettingsPageShell>
	);
};

export default VoicePage;
