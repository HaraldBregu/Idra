import React, { useEffect, useMemo, useState } from 'react';
import { DEFAULT_PROVIDERS, type Provider } from '../../../../shared/providers';

type ProviderOption = {
	label: string;
	value: string;
};

function normalizeProvider(provider: Provider, index: number): ProviderOption {
	const value = provider.id || `provider-${index}`;
	const label = provider.name || value;

	return {
		label,
		value,
	};
}

const StartPage: React.FC = () => {
	const [selectedProvider, setSelectedProvider] = useState('');

	const providerOptions = useMemo(
		() => DEFAULT_PROVIDERS.map((provider, index) => normalizeProvider(provider, index)),
		[],
	);

	useEffect(() => {
		if (!selectedProvider && providerOptions.length > 0) {
			setSelectedProvider(providerOptions[0].value);
		}
	}, [providerOptions, selectedProvider]);

	return (
		<main className="flex h-full min-h-0 items-center justify-center bg-background px-6">
			<section className="w-full max-w-2xl space-y-4 text-center">
				<p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Friday</p>
				<h1 className="text-4xl font-semibold tracking-normal text-foreground">Start</h1>
				<p className="text-base text-muted-foreground">Set up your workspace to begin.</p>
				<div className="mx-auto w-full max-w-sm space-y-2 text-left">
					<label className="text-sm font-medium text-foreground" htmlFor="provider-select">
						Provider
					</label>
					<select
						className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-50"
						disabled={providerOptions.length === 0}
						id="provider-select"
						onChange={(event) => {
							setSelectedProvider(event.target.value);
						}}
						value={selectedProvider}
					>
						<option disabled value="">
							Select a provider
						</option>
						{providerOptions.map((provider, index) => (
							<option key={`${provider.value}-${index}`} value={provider.value}>
								{provider.label}
							</option>
						))}
					</select>
				</div>
			</section>
		</main>
	);
};

export default StartPage;
