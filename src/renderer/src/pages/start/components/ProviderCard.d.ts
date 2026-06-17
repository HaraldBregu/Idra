import React from 'react';
import type { ProviderCatalogItem, ProviderSetupEntry } from '../types';
type ProviderCardProps = {
    readonly provider: ProviderCatalogItem;
    readonly entry: ProviderSetupEntry | undefined;
    readonly savingProviderId: string | null;
    readonly onUpdateEntry: (providerId: string, patch: Partial<ProviderSetupEntry>) => void;
    readonly onApiKeyChange: (providerId: string, apiKey: string) => void;
    readonly onSave: (providerId: string) => Promise<boolean>;
    readonly onOpenLink: (provider: ProviderCatalogItem) => void;
};
export declare function ProviderCard({ provider, entry, savingProviderId, onUpdateEntry, onApiKeyChange, onSave, onOpenLink, }: ProviderCardProps): React.JSX.Element;
export {};
