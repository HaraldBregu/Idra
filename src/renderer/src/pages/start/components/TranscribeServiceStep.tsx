import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ModelProviderConfiguration } from '@pages/settings/components/model-configuration';
import { SPEECH_MODE_IDS } from '../constants';
import type { ModelServiceDefinition, SpeechModeStateMap } from '../types';
import type { SttSelectionMode } from '../../../../../shared/stt_transcription';
import { toModelConfigurationState } from './ModelServiceStep';
import { StepHeader } from './StepHeader';

type SpeechModeConfig = {
	readonly mode: SttSelectionMode;
	readonly titleKey: string;
	readonly descriptionKey: string;
	readonly providerDescriptionKey: string;
	readonly modelDescriptionKey: string;
};

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

type TranscribeServiceStepProps = {
	readonly service: ModelServiceDefinition;
	readonly speechModeStates: SpeechModeStateMap;
	readonly loadingModels: boolean;
	readonly savingConfig: boolean;
	readonly onProviderChange: (mode: SttSelectionMode, value: string | null) => void;
	readonly onModelChange: (mode: SttSelectionMode, value: string | null) => void;
};

export function TranscribeServiceStep({
	service,
	speechModeStates,
	loadingModels,
	savingConfig,
	onProviderChange,
	onModelChange,
}: TranscribeServiceStepProps): React.JSX.Element {
	const { t } = useTranslation();
	const modeConfigStates = useMemo(
		() =>
			SPEECH_MODE_IDS.reduce(
				(acc, mode) => ({
					...acc,
					[mode]: toModelConfigurationState(
						speechModeStates[mode],
						loadingModels,
						savingConfig
					),
				}),
				{} as Record<SttSelectionMode, ReturnType<typeof toModelConfigurationState>>
			),
		[loadingModels, savingConfig, speechModeStates]
	);

	return (
		<div className="mx-auto flex min-h-full w-full max-w-2xl flex-col justify-center px-4 py-8 sm:px-6">
			<div className="mb-6 flex size-11 items-center justify-center rounded-full bg-foreground/[0.06] text-foreground">
				<ServiceIcon className="size-5" strokeWidth={1.6} aria-hidden="true" />
			</div>

			<Badge variant="secondary" className="mb-3 w-fit">
				Optional
			</Badge>

			<h1 className="text-2xl font-bold leading-tight tracking-normal text-foreground">
				{service.stepTitle}
			</h1>
			<p className="mt-2 max-w-md text-xs font-medium leading-relaxed text-muted-foreground">
				{service.stepDescription}
			</p>

			<div className="mt-8 max-w-md space-y-6">
				{SPEECH_MODE_CONFIGS.map((config) => (
					<div key={config.mode} className="space-y-2">
						<div>
							<h2 className="text-sm font-semibold leading-tight text-foreground">
								{t(config.titleKey)}
							</h2>
							<p className="mt-1 text-xs leading-relaxed text-muted-foreground">
								{t(config.descriptionKey)}
							</p>
						</div>
						<ModelProviderConfiguration
							configState={modeConfigStates[config.mode]}
							idPrefix={`transcribe-${config.mode}`}
							providerDescription={t(config.providerDescriptionKey)}
							modelDescription={t(config.modelDescriptionKey)}
							collapsible={false}
							showSaveButton={false}
							onProviderChange={(value) => onProviderChange(config.mode, value)}
							onModelChange={(value) => onModelChange(config.mode, value)}
							onSave={() => undefined}
						/>
					</div>
				))}
			</div>
		</div>
	);
}
