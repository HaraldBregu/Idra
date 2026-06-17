import React from 'react';
import type { ProviderCatalogItem, ProviderSetupEntry } from '../types';
type ProviderStepProps = {
    readonly providerEntries: ProviderSetupEntry[];
    readonly savingProviderId: string | null;
    readonly onUpdateEntry: (providerId: string, patch: Partial<ProviderSetupEntry>) => void;
    readonly onApiKeyChange: (providerId: string, apiKey: string) => void;
    readonly onSave: (providerId: string) => Promise<boolean>;
    readonly onOpenLink: (provider: ProviderCatalogItem) => void;
};
export declare function ProviderStep({ providerEntries, savingProviderId, onUpdateEntry, onApiKeyChange, onSave, onOpenLink, }: ProviderStepProps): React.JSX.Element;
export {};
