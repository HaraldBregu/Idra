import type { LucideIcon } from 'lucide-react';
import type { PublicProvider } from '../../../../shared/providers';
import type {
	ASSISTANT_OPERATOR_ID,
	ConfiguredModelOperator,
	IMAGE_CREATOR_OPERATOR_ID,
	Model,
	MUSIC_CREATOR_OPERATOR_ID,
	SPEECH_TO_TEXT_OPERATOR_ID,
	TEXT_TO_SPEECH_OPERATOR_ID,
	TEXT_TO_VIDEO_OPERATOR_ID,
} from '../../../../shared/agents/service';

export type ProviderOption = {
	label: string;
	value: string;
};

export type ProviderSetupEntry = {
	providerId: string;
	apiKey: string;
	apiKeySaved: boolean;
	editing: boolean;
};

export type ProviderCatalogItem = {
	id: string;
	name: string;
	capabilities: string;
	supported: boolean;
	apiConfigurationUrl?: string;
};

export type ProviderModelGroup = {
	provider: PublicProvider;
	models: Model[];
};

export type ModelServiceId =
	| typeof ASSISTANT_OPERATOR_ID
	| typeof SPEECH_TO_TEXT_OPERATOR_ID
	| typeof TEXT_TO_SPEECH_OPERATOR_ID
	| typeof IMAGE_CREATOR_OPERATOR_ID
	| typeof TEXT_TO_VIDEO_OPERATOR_ID
	| typeof MUSIC_CREATOR_OPERATOR_ID;

export type ModelServiceDefinition = {
	id: ModelServiceId;
	label: string;
	stepName: string;
	stepTitle: string;
	stepDescription: string;
	icon: LucideIcon;
	required: boolean;
	getOperator: () => Promise<ConfiguredModelOperator | undefined>;
	getModels: (provider: PublicProvider) => Promise<Model[]>;
	saveOperator: (provider: PublicProvider, model: Model) => Promise<boolean>;
};

export type ModelServiceState = {
	providerId: string;
	modelId: string;
	modelGroups: ProviderModelGroup[];
};

export type ModelServiceStateMap = Record<ModelServiceId, ModelServiceState>;

export type SetupStep = 'presentation' | 'providers' | ModelServiceId;
