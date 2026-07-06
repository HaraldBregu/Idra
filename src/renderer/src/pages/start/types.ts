import type { LucideIcon } from 'lucide-react';
import type { SttSelectionMode } from '../../../../shared/stt_transcription';
import { AGENTS } from '@/lib/compat';
import type { PublicProvider } from '../../../../shared';
import type { Model, ModelSelection } from '@/lib/compat';

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
	| typeof AGENTS.assistant
	| typeof AGENTS.speechToText
	| typeof AGENTS.textToSpeech
	| typeof AGENTS.textToImage;

export type ModelServiceDefinition = {
	id: ModelServiceId;
	label: string;
	stepName: string;
	stepTitle: string;
	stepDescription: string;
	icon: LucideIcon;
	required: boolean;
	getSelection: () => Promise<ModelSelection | undefined>;
	getModels: (provider: PublicProvider) => Promise<Model[]>;
	saveSelection: (provider: PublicProvider, model: Model) => Promise<boolean>;
};

export type ModelServiceState = {
	providerId: string;
	modelId: string;
	modelGroups: ProviderModelGroup[];
};

export type ModelServiceStateMap = Record<ModelServiceId, ModelServiceState>;

export type SetupStep = 'presentation' | 'providers' | ModelServiceId;
