import type { Dispatch } from 'react';
import type { ProviderCatalogItem, ProviderSetupEntry } from '../types';
import type { SetupAction } from '../state/actions';
import type { SetupState } from '../state/types';
export declare function useProviderSetup(state: SetupState, dispatch: Dispatch<SetupAction>): {
    updateProviderEntry: (providerId: string, patch: Partial<ProviderSetupEntry>) => void;
    handleProviderApiKeyChange: (providerId: string, apiKey: string) => void;
    saveProviderEntry: (providerId: string) => Promise<boolean>;
    handleContinueProviders: () => Promise<void>;
    handleOpenProviderLink: (provider: ProviderCatalogItem) => void;
};
