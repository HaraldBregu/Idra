import React, { useEffect, useMemo, useState } from 'react';

type Provider = string | {
	id?: string;
	name?: string;
	label?: string;
	displayName?: string;
	provider?: string;
};

type ProviderOption = {
	label: string;
	value: string;
};

type AppApi = {
	getproviders?: () => Promise<Provider[]> | Provider[];
	getProviders?: () => Promise<Provider[]> | Provider[];
};

function normalizeProvider(provider: Provider, index: number): ProviderOption {
	if (typeof provider === 'string') {
		return {
			label: provider,
			value: provider,
		};
	}

	const value = provider.id ?? provider.provider ?? provider.name ?? provider.label ?? `provider-${index}`;
	const label = provider.displayName ?? provider.label ?? provider.name ?? provider.provider ?? value;

	return {
		label,
		value,
	};
}

const StartPage: React.FC = () => {
	const [providers, setProviders] = useState<Provider[]>([]);
	const [selectedProvider, setSelectedProvider] = useState('');
	const [isLoadingProviders, setIsLoadingProviders] = useState(true);

	const providerOptions = useMemo(
		() => providers.map((provider, index) => normalizeProvider(provider, index)),
		[providers],
	);

	useEffect(() => {
		let isMounted = true;

		const loadProviders = async (): Promise<void> => {
			try {
				const appapi = (window as Window & { appapi?: AppApi }).appapi;
				const getProviders = appapi?.getproviders ?? appapi?.getProviders;
				const nextProviders = getProviders ? await getProviders.call(appapi) : [];

				if (isMounted) {
					setProviders(Array.isArray(nextProviders) ? nextProviders : []);
				}
			} finally {
				if (isMounted) {
					setIsLoadingProviders(false);
				}
			}
		};

		void loadProviders();

		return () => {
			isMounted = false;
		};
	}, []);

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
						disabled={isLoadingProviders || providerOptions.length === 0}
						id="provider-select"
						onChange={(event) => {
							setSelectedProvider(event.target.value);
						}}
						value={selectedProvider}
					>
						<option disabled value="">
							{isLoadingProviders ? 'Loading providers...' : 'Select a provider'}
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
