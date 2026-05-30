import { Bot, ImageIcon, Mic, Music, Video, Volume2, type LucideIcon } from 'lucide-react';
import {
	DEFAULT_PROVIDERS,
	MUSIC_CREATOR_MODELS,
	TEXT_TO_SPEECH_MODELS,
	TEXT_TO_SPEECH_PROVIDER_ID,
	TEXT_TO_VIDEO_MODELS,
	type PublicProvider,
} from '../../../../../../../shared/providers';
import {
	ASSISTANT_OPERATOR_ID,
	ASSISTANT_RUNTIME_ID,
	IMAGE_CREATOR_OPERATOR_ID,
	MUSIC_CREATOR_OPERATOR_ID,
	OPERATOR_DEFINITIONS,
	SPEECH_TO_TEXT_OPERATOR_ID,
	TEXT_TO_SPEECH_OPERATOR_ID,
	TEXT_TO_VIDEO_OPERATOR_ID,
	type ConfiguredModelOperator,
	type Model,
} from '../../../../../../../shared/agents/service';

export interface OperatorConfig {
	readonly nameKey: string;
	readonly descriptionKey: string;
	readonly configDescKey: string;
	readonly providerDescKey: string;
	readonly modelLabelKey: string;
	readonly modelDescKey: string;
	readonly icon: LucideIcon;
	readonly isAssistant: boolean;
	readonly isCapability: boolean;
	// isRuntime: false → operator is "coming soon"; shows a read-only preview UI
	readonly isRuntime: boolean;
	readonly operatorDef: typeof OPERATOR_DEFINITIONS[keyof typeof OPERATOR_DEFINITIONS];
	readonly getOperator: () => Promise<ConfiguredModelOperator | undefined>;
	readonly saveOperator: (provider: PublicProvider, model: Model) => Promise<boolean>;
	// null for the assistant (uses window.app.getModels instead)
	readonly getCapabilityModels: ((provider: PublicProvider) => Promise<Model[]>) | null;
	readonly providerMissingKey: string | null;
	readonly readOnly: {
		readonly providerName: string;
		readonly providerValue: string;
		readonly model: Model | undefined;
	} | null;
}

const OPERATOR_CONFIGS: Record<string, OperatorConfig> = {
	[ASSISTANT_OPERATOR_ID]: {
		nameKey: 'settings.operators.assistantName',
		descriptionKey: 'settings.operators.fridayDescription',
		configDescKey: 'settings.operators.subtitle',
		providerDescKey: 'settings.operators.providerDescription',
		modelLabelKey: 'settings.operators.model',
		modelDescKey: 'settings.operators.modelDescription',
		icon: Bot,
		isAssistant: true,
		isCapability: false,
		isRuntime: true,
		operatorDef: OPERATOR_DEFINITIONS.assistant,
		getOperator: () => window.store.getAssistantOperator(),
		saveOperator: (p, m) => window.store.saveAssistantOperator(p, m),
		getCapabilityModels: null,
		providerMissingKey: null,
		readOnly: null,
	},
	[SPEECH_TO_TEXT_OPERATOR_ID]: {
		nameKey: 'settings.operators.speechTranscriberName',
		descriptionKey: 'settings.operators.speechTranscriberDescription',
		configDescKey: 'settings.operators.speechConfigurationSubtitle',
		providerDescKey: 'settings.operators.speechProviderDescription',
		modelLabelKey: 'settings.operators.speechModel',
		modelDescKey: 'settings.operators.speechModelDescription',
		icon: Mic,
		isAssistant: false,
		isCapability: true,
		isRuntime: true,
		operatorDef: OPERATOR_DEFINITIONS.speechToText,
		getOperator: () => window.store.getSpeechToTextOperator(),
		saveOperator: (p, m) => window.store.saveSpeechToTextOperator(p, m),
		getCapabilityModels: (p) => window.app.getSpeechToTextModels(p),
		providerMissingKey: 'settings.operators.speechProviderMissing',
		readOnly: null,
	},
	[TEXT_TO_SPEECH_OPERATOR_ID]: {
		nameKey: 'settings.operators.textToSpeechName',
		descriptionKey: 'settings.operators.textToSpeechDescription',
		configDescKey: 'settings.operators.textToSpeechConfigurationSubtitle',
		providerDescKey: 'settings.operators.textToSpeechProviderDescription',
		modelLabelKey: 'settings.operators.textToSpeechModel',
		modelDescKey: 'settings.operators.textToSpeechModelDescription',
		icon: Volume2,
		isAssistant: false,
		isCapability: true,
		isRuntime: false,
		operatorDef: OPERATOR_DEFINITIONS.textToSpeech,
		getOperator: () => window.store.getTextToSpeechOperator(),
		saveOperator: (p, m) => window.store.saveTextToSpeechOperator(p, m),
		getCapabilityModels: (p) => window.app.getTextToSpeechModels(p),
		providerMissingKey: null,
		readOnly: {
			providerName:
				DEFAULT_PROVIDERS.find((p) => p.id === TEXT_TO_SPEECH_PROVIDER_ID)?.name ?? 'ElevenLabs',
			providerValue: TEXT_TO_SPEECH_PROVIDER_ID,
			model: TEXT_TO_SPEECH_MODELS[0],
		},
	},
	[IMAGE_CREATOR_OPERATOR_ID]: {
		nameKey: 'settings.operators.imageAssistantName',
		descriptionKey: 'settings.operators.imageAssistantDescription',
		configDescKey: 'settings.operators.imageConfigurationSubtitle',
		providerDescKey: 'settings.operators.imageProviderDescription',
		modelLabelKey: 'settings.operators.imageModel',
		modelDescKey: 'settings.operators.imageModelDescription',
		icon: ImageIcon,
		isAssistant: false,
		isCapability: true,
		isRuntime: true,
		operatorDef: OPERATOR_DEFINITIONS.imageCreator,
		getOperator: () => window.store.getImageCreatorOperator(),
		saveOperator: (p, m) => window.store.saveImageCreatorOperator(p, m),
		getCapabilityModels: (p) => window.app.getImageCreatorModels(p),
		providerMissingKey: null,
		readOnly: null,
	},
	[TEXT_TO_VIDEO_OPERATOR_ID]: {
		nameKey: 'settings.operators.videoCreatorName',
		descriptionKey: 'settings.operators.videoCreatorDescription',
		configDescKey: 'settings.operators.videoConfigurationSubtitle',
		providerDescKey: 'settings.operators.videoProviderDescription',
		modelLabelKey: 'settings.operators.videoModel',
		modelDescKey: 'settings.operators.videoModelDescription',
		icon: Video,
		isAssistant: false,
		isCapability: true,
		isRuntime: false,
		operatorDef: OPERATOR_DEFINITIONS.videoCreator,
		getOperator: () => window.store.getTextToVideoOperator(),
		saveOperator: (p, m) => window.store.saveTextToVideoOperator(p, m),
		getCapabilityModels: (p) => window.app.getTextToVideoModels(p),
		providerMissingKey: null,
		readOnly: {
			providerName: 'Video provider',
			providerValue: 'video-provider-coming-soon',
			model: TEXT_TO_VIDEO_MODELS[0],
		},
	},
	[MUSIC_CREATOR_OPERATOR_ID]: {
		nameKey: 'settings.operators.musicCreatorName',
		descriptionKey: 'settings.operators.musicCreatorDescription',
		configDescKey: 'settings.operators.musicConfigurationSubtitle',
		providerDescKey: 'settings.operators.musicProviderDescription',
		modelLabelKey: 'settings.operators.musicModel',
		modelDescKey: 'settings.operators.musicModelDescription',
		icon: Music,
		isAssistant: false,
		isCapability: true,
		isRuntime: false,
		operatorDef: OPERATOR_DEFINITIONS.musicCreator,
		getOperator: () => window.store.getMusicCreatorOperator(),
		saveOperator: (p, m) => window.store.saveMusicCreatorOperator(p, m),
		getCapabilityModels: (p) => window.app.getMusicCreatorModels(p),
		providerMissingKey: null,
		readOnly: {
			providerName: 'Music provider',
			providerValue: 'music-provider-coming-soon',
			model: MUSIC_CREATOR_MODELS[0],
		},
	},
};

export function resolveOperatorConfig(operatorId: string): OperatorConfig | undefined {
	// The assistant can be reached via two IDs
	if (operatorId === ASSISTANT_RUNTIME_ID) return OPERATOR_CONFIGS[ASSISTANT_OPERATOR_ID];
	return OPERATOR_CONFIGS[operatorId];
}
