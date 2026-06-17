import type { PublicProvider } from '../../../../shared/providers';
import type { Model } from '@/lib/compat';
import type { ModelServiceDefinition, ModelServiceId, ModelServiceState, ModelServiceStateMap, ProviderCatalogItem, ProviderOption, SetupStep } from './types';
export declare const MODEL_SERVICE_DEFINITIONS: readonly ModelServiceDefinition[];
export declare const MODEL_SERVICE_STEP_IDS: readonly ModelServiceId[];
export declare const SETUP_STEPS: readonly SetupStep[];
export declare const SETUP_STEP_TITLES: Record<SetupStep, string>;
export declare const MASKED_API_KEY_LABEL: "sk-************";
export declare const STEP_COPY: Record<'presentation' | 'providers', {
    title: string;
    description: string;
}>;
export declare const providerOptions: ProviderOption[];
export declare const supportedProviderIds: Set<string>;
export declare const actionableProviderCatalog: readonly ProviderCatalogItem[];
export declare function getErrorMessage(error: unknown, fallback: string): string;
export declare function getProviderCatalogItem(providerId: string): ProviderCatalogItem;
export declare function isModelStep(step: SetupStep): step is ModelServiceId;
export declare function createInitialModelServiceState(): ModelServiceStateMap;
export declare function getSelectedServiceModel(serviceState: ModelServiceState): {
    provider: PublicProvider;
    model: Model;
} | undefined;
