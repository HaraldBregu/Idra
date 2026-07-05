import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DEFAULT_PROVIDERS } from '../../../../../../shared';
	SPEECH_TO_TEXT_STREAM_API_TYPE,
	supportsSpeechToTextModelApiType,
} from '../../../../../../shared/provider_models_definitions';
import type { SpeechToTextApiType } from '../../../../../../shared/provider_models_types';
import type { SttSelectionMode } from '../../../../../../shared/stt_transcription';
import type { Model } from '@/lib/compat';
import {
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
import { getProviderCatalogItem } from '../../../start/constants';
import type { ProviderModelGroup } from '../../../start/types';
import TranscribeTest from './TranscribeTest';

type SpeechModeStateMap = Record<SttSelectionMode, ModelConfigurationState>;

interface SpeechModeConfig {
	readonly mode: SttSelectionMode;
	readonly titleKey: string;
	readonly descriptionKey: string;
	readonly providerDescriptionKey: string;
	readonly modelDescriptionKey: string;
}

const SPEECH_MODE_CONFIGS: readonly SpeechModeConfig[] = [
	{
		mode: 'realtime',
		titleKey: 'settings.modelServices.realtimeConfiguration',
		descriptionKey: 'settings.modelServices.realtimeConfigurationDescription',
		providerDescriptionKey: 'settings.modelServices.realtimeProviderDescription',
		modelDescriptionKey: 'settings.modelServices.realtimeModelDescription',
	},
	{
		mode: 'transcribe',
		titleKey: 'settings.modelServices.transcribeConfiguration',
		descriptionKey: 'settings.modelServices.transcribeConfigurationDescription',
		providerDescriptionKey: 'settings.modelServices.transcribeProviderDescription',
		modelDescriptionKey: 'settings.modelServices.transcribeModelDescription',
	},
];

function speechModeApiType(mode: SttSelectionMode): SpeechToTextApiType {
	return mode === 'realtime' ? SPEECH_TO_TEXT_STREAM_API_TYPE : SPEECH_TO_TEXT_BATCH_API_TYPE;
}

function speechModeModels(
	providerId: string,
	models: readonly Model[],
	mode: SttSelectionMode
): Model[] {
	const apiType = speechModeApiType(mode);
	return models.filter((model) => supportsSpeechToTextModelApiType(providerId, model.id, apiType));
}

async function loadSpeechModeState(
	mode: SttSelectionMode,
	fallbackErrorMessage: string,
	fallbackModelErrorMessage: string
): Promise<ModelConfigurationState> {
	try {
		const selection = await window.transcribe.getSelection(mode);
		const providers = mergeProviders(await window.transcribe.listProviders(), selection?.provider);
		const modelGroups: ProviderModelGroup[] = [];
		let firstModelError: unknown;

		for (const provider of providers) {
			try {
				const models = speechModeModels(
					provider.id,
					await window.transcribe.listModels(provider.id),
					mode
				);
				const nextModels =
					selection?.provider.id === provider.id &&
					supportsSpeechToTextModelApiType(
						provider.id,
						selection.model.id,
						speechModeApiType(mode)
					)
						? mergeModels(models, selection.model)
						: models;
				if (nextModels.length > 0) modelGroups.push({ provider, models: nextModels });
			} catch (error) {
				firstModelError ??= error;
			}
		}

		const preferredGroup =
			modelGroups.find((group) => group.provider.id === selection?.provider.id) ?? modelGroups[0];
		const preferredModel =
			preferredGroup?.models.find((model) => model.id === selection?.model.id) ??
			preferredGroup?.models[0];

		return {
			providers,
			modelGroups,
			providerId: preferredGroup?.provider.id ?? '',
			modelId: preferredModel?.id ?? '',
			loading: false,
			loadingModels: false,
			saving: false,
			saved: false,
			error: firstModelError
				? firstErrorMessage(firstModelError, fallbackModelErrorMessage)
				: null,
		};
	} catch (error) {
		return {
			...initialModelConfigurationState,
			loading: false,
			loadingModels: false,
			error: firstErrorMessage(error, fallbackErrorMessage),
		};
	}
}

const SpeechToTextPage: React.FC = () => {
	const { t } = useTranslation();
	const [speechStates, setSpeechStates] = useState<SpeechModeStateMap>({
		realtime: initialModelConfigurationState,
		transcribe: initialModelConfigurationState,
	});

	useEffect(() => {
		let mounted = true;
		setSpeechStates({
			realtime: { ...initialModelConfigurationState, loading: true, loadingModels: true },
			transcribe: { ...initialModelConfigurationState, loading: true, loadingModels: true },
		});
		void Promise.all([
			loadSpeechModeState(
				'realtime',
				t('settings.modelServices.loadError'),
				t('settings.modelServices.modelsLoadError')
			),
			loadSpeechModeState(
				'transcribe',
				t('settings.modelServices.loadError'),
				t('settings.modelServices.modelsLoadError')
			),
		]).then(([realtime, transcribe]) => {
			if (mounted) setSpeechStates({ realtime, transcribe });
		});
		return () => {
			mounted = false;
		};
	}, [t]);

	const handleSpeechProviderChange = (mode: SttSelectionMode, nextProviderId: string): void => {
		setSpeechStates((current) => {
			const modeState = current[mode];
			const group = modeState.modelGroups.find((item) => item.provider.id === nextProviderId);
			return {
				...current,
				[mode]: {
					...modeState,
					providerId: nextProviderId,
					modelId: group?.models[0]?.id ?? '',
					saved: false,
					error: null,
				},
			};
		});
	};

	const handleSpeechModelChange = (mode: SttSelectionMode, nextModelId: string): void => {
		setSpeechStates((current) => ({
			...current,
			[mode]: {
				...current[mode],
				modelId: nextModelId,
				saved: false,
				error: null,
			},
		}));
	};

	const handleSpeechSave = async (mode: SttSelectionMode): Promise<void> => {
		const modeState = speechStates[mode];
		const group = modeState.modelGroups.find((item) => item.provider.id === modeState.providerId);
		const provider = group?.provider;
		const model = group?.models.find((item) => item.id === modeState.modelId);
		if (!provider || !model) return;

		setSpeechStates((current) => ({
			...current,
			[mode]: { ...current[mode], saving: true, saved: false, error: null },
		}));
		try {
			const didSave = await window.transcribe.saveSelection(provider.id, model.id, mode);
			if (!didSave) throw new Error(t('settings.modelServices.saveError'));
			setSpeechStates((current) => ({
				...current,
				[mode]: { ...current[mode], saving: false, saved: true },
			}));
		} catch (error) {
			setSpeechStates((current) => ({
				...current,
				[mode]: {
					...current[mode],
					saving: false,
					error: firstErrorMessage(error, t('settings.modelServices.saveError')),
				},
			}));
		}
	};

	return (
		<SettingsPageShell>
			<SettingsPageHeader
				title={t('settings.modelServices.speechTranscriberName')}
				description={t('settings.modelServices.speechTranscriberDescription')}
			/>

			<SettingsSection title={t('settings.modelServices.configuration')}>
				<div className="grid gap-2">
					{SPEECH_MODE_CONFIGS.map((config) => {
						const modeState = speechStates[config.mode];
						const group = modeState.modelGroups.find(
							(item) => item.provider.id === modeState.providerId
						);
						const provider = group?.provider;
						const model = group?.models.find((item) => item.id === modeState.modelId);
						const summary =
							provider && model
								? `${getProviderCatalogItem(provider.id).name} - ${model.name || model.id}`
								: t(config.descriptionKey);

						return (
							<ModelProviderConfiguration
								key={config.mode}
								configState={modeState}
								triggerTitle={t(config.titleKey)}
								triggerDescription={summary}
								providerDescription={t(config.providerDescriptionKey)}
								modelDescription={t(config.modelDescriptionKey)}
								idPrefix={`speech-to-text-${config.mode}`}
								showInlineError
								onProviderChange={(nextProviderId) =>
									handleSpeechProviderChange(config.mode, nextProviderId)
								}
								onModelChange={(nextModelId) =>
									handleSpeechModelChange(config.mode, nextModelId)
								}
								onSave={() => void handleSpeechSave(config.mode)}
							/>
						);
					})}
				</div>
			</SettingsSection>

			<SettingsSection
				title={t('settings.modelServices.test')}
				description={t('settings.modelServices.testTranscribeDescription')}
			>
				<TranscribeTest />
			</SettingsSection>
		</SettingsPageShell>
	);
};

export default SpeechToTextPage;
