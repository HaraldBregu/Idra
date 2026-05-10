import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DEFAULT_PROVIDERS, type Provider, type PublicProvider } from '../../../../shared/providers';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/Select';

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

const providerOptions = DEFAULT_PROVIDERS.map((provider, index) =>
	normalizeProvider(provider, index),
);

const MASKED_API_KEY = '********' as const;

const StartPage: React.FC = () => {
	const navigate = useNavigate();
	const [apiKey, setApiKey] = useState('');
	const [apiKeySaved, setApiKeySaved] = useState(false);
	const [saving, setSaving] = useState(false);
	const [selectedProvider, setSelectedProvider] = useState(providerOptions[0]?.value ?? '');
	const canSave =
		selectedProvider.length > 0 && (apiKeySaved || apiKey.trim().length > 0) && !saving;

	useEffect(() => {
		let cancelled = false;

		async function loadApiKeyStatus(): Promise<void> {
			const providers = await window.app.getProviders();
			if (cancelled) return;

			const providerImplemented = providers.some((provider: PublicProvider) => {
				return provider.id.trim().toLowerCase() === selectedProvider.trim().toLowerCase();
			});
			const saved = providerImplemented
				? await window.app.isProviderApiKeySaved(selectedProvider)
				: false;
			if (cancelled) return;

			setApiKeySaved(saved);
			setApiKey(saved ? MASKED_API_KEY : '');
		}

		void loadApiKeyStatus();

		return () => {
			cancelled = true;
		};
	}, [selectedProvider]);

	async function handleSave(): Promise<void> {
		if (!canSave) return;

		setSaving(true);
		try {
			if (apiKeySaved && apiKey === MASKED_API_KEY) {
				navigate('/config');
				return;
			}

			await window.app.setProviderApiKey(selectedProvider, apiKey.trim());
			navigate('/config');
		} finally {
			setSaving(false);
		}
	}

	return (
		<main className="flex h-full min-h-0 items-center justify-center bg-background px-6">
			<section className="w-full max-w-2xl space-y-4 text-center">
				<p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Friday</p>
				<h1 className="text-4xl font-semibold tracking-normal text-foreground">Start</h1>
				<p className="text-base text-muted-foreground">Set up your workspace to begin.</p>
				<div className="mx-auto w-full max-w-sm space-y-4 text-left">
					<div className="space-y-2">
						<label className="text-sm font-medium text-foreground" htmlFor="provider-select">
							Provider
						</label>
						<Select
							value={selectedProvider}
							onValueChange={(value) => {
								setSelectedProvider(value ?? '');
							}}
							disabled={providerOptions.length === 0}
						>
							<SelectTrigger id="provider-select" className="h-10">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{providerOptions.map((provider, index) => (
									<SelectItem key={`${provider.value}-${index}`} value={provider.value}>
										{provider.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div className="space-y-2">
						<label className="text-sm font-medium text-foreground" htmlFor="api-key">
							API Key
						</label>
						<Input
							autoComplete="off"
							className="h-10"
							id="api-key"
							onChange={(event) => {
								setApiKeySaved(false);
								setApiKey(event.target.value);
							}}
							onFocus={(event) => {
								if (apiKeySaved) {
									event.currentTarget.select();
								}
							}}
							placeholder="Enter API key"
							spellCheck={false}
							type="password"
							value={apiKey}
						/>
					</div>
					<Button
						className="h-10 w-full"
						disabled={!canSave}
						onClick={() => {
							void handleSave();
						}}
						type="button"
					>
						{saving ? 'Saving...' : 'Save'}
					</Button>
				</div>
			</section>
		</main>
	);
};

export default StartPage;
