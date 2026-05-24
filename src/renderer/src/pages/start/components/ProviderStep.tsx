import React from 'react';
import { KeyRound } from 'lucide-react';
import { actionableProviderCatalog, STEP_COPY } from '../constants';
import type { ProviderCatalogItem, ProviderSetupEntry } from '../types';
import { ProviderCard } from './ProviderCard';

type ProviderStepProps = {
	readonly providerEntries: ProviderSetupEntry[];
	readonly savingProviderId: string | null;
	readonly onUpdateEntry: (providerId: string, patch: Partial<ProviderSetupEntry>) => void;
	readonly onApiKeyChange: (providerId: string, apiKey: string) => void;
	readonly onSave: (providerId: string) => Promise<boolean>;
	readonly onOpenLink: (provider: ProviderCatalogItem) => void;
};

export function ProviderStep({
	providerEntries,
	savingProviderId,
	onUpdateEntry,
	onApiKeyChange,
	onSave,
	onOpenLink,
}: ProviderStepProps): React.JSX.Element {
	const { title, description } = STEP_COPY.providers;

	return (
		<div className="mx-auto flex min-h-full w-full max-w-2xl flex-col px-4 py-8 sm:px-6">
			<div>
				<h1 className="text-2xl font-bold leading-tight tracking-normal text-foreground">
					{title}
				</h1>
				<p className="mt-2 max-w-xl text-xs font-medium leading-relaxed text-muted-foreground">
					{description}
				</p>
			</div>

			<div className="mt-4 space-y-2">
				{actionableProviderCatalog.map((provider) => (
					<ProviderCard
						key={provider.id}
						provider={provider}
						entry={providerEntries.find((item) => item.providerId === provider.id)}
						savingProviderId={savingProviderId}
						onUpdateEntry={onUpdateEntry}
						onApiKeyChange={onApiKeyChange}
						onSave={onSave}
						onOpenLink={onOpenLink}
					/>
				))}
			</div>

			<div className="mt-auto pt-4">
				<div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-muted-foreground">
					<KeyRound className="size-4 shrink-0" />
					<p className="text-xs font-medium leading-snug">
						Keys are stored locally and never shared.
					</p>
				</div>
			</div>
		</div>
	);
}
