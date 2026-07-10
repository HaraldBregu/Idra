import type { LucideIcon } from 'lucide-react';
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

export type ModelServiceId = typeof AGENTS.assistant;

export type ModelServiceDefinition = {
	id: ModelServiceId;
	stepName: string;
	stepTitle: string;
	stepDescription: string;
	icon: LucideIcon;
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
