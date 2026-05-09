import React, { useEffect, useState } from 'react';
import type { Provider } from '../../../../shared/providers';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/Select';

type ModelOption = {
	label: string;
	value: string;
};

const modelOptionsByProvider: Record<string, readonly ModelOption[]> = {
	openai: [
		{ label: 'GPT-5.2', value: 'gpt-5.2' },
		{ label: 'GPT-5.1', value: 'gpt-5.1' },
	],
	anthropic: [
		{ label: 'Claude Opus 4.5', value: 'claude-opus-4.5' },
		{ label: 'Claude Sonnet 4.5', value: 'claude-sonnet-4.5' },
	],
};

const ConfigPage: React.FC = () => {
	const [providers, setProviders] = useState<Provider[]>([]);
	const [selectedProvider, setSelectedProvider] = useState('');
	const modelOptions = modelOptionsByProvider[selectedProvider] ?? [];
	const [selectedModel, setSelectedModel] = useState(modelOptions[0]?.value ?? '');

	useEffect(() => {
		let cancelled = false;

		async function loadProviders(): Promise<void> {
			const storedProviders = await window.app.getProviders();
			if (cancelled) return;

			setProviders(storedProviders);
			const firstProviderId = storedProviders[0]?.id ?? '';
			setSelectedProvider(firstProviderId);
			setSelectedModel(modelOptionsByProvider[firstProviderId]?.[0]?.value ?? '');
		}

		void loadProviders();

		return () => {
			cancelled = true;
		};
	}, []);

	function handleProviderChange(value: string | null): void {
		const providerId = value ?? '';
		const nextModelOptions = modelOptionsByProvider[providerId] ?? [];

		setSelectedProvider(providerId);
		setSelectedModel(nextModelOptions[0]?.value ?? '');
	}

	return (
		<main className="flex h-full min-h-0 items-center justify-center bg-background px-6">
			<section className="w-full max-w-2xl space-y-4 text-center">
				<p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Friday</p>
				<h1 className="text-4xl font-semibold tracking-normal text-foreground">Config</h1>
				<p className="text-base text-muted-foreground">Configure your assistant settings.</p>
				<div className="mx-auto w-full max-w-sm space-y-4 text-left">
					<div className="space-y-2">
						<label className="text-sm font-medium text-foreground" htmlFor="config-provider">
							Provider
						</label>
						<Select
							value={selectedProvider}
							onValueChange={handleProviderChange}
							disabled={providers.length === 0}
						>
							<SelectTrigger id="config-provider" className="h-10">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{providers.map((provider) => (
									<SelectItem key={provider.id} value={provider.id}>
										{provider.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div className="space-y-2">
						<label className="text-sm font-medium text-foreground" htmlFor="config-model">
							Model
						</label>
						<Select
							value={selectedModel}
							onValueChange={(value) => {
								setSelectedModel(value ?? '');
							}}
							disabled={modelOptions.length === 0}
						>
							<SelectTrigger id="config-model" className="h-10">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{modelOptions.map((model) => (
									<SelectItem key={model.value} value={model.value}>
										{model.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</div>
			</section>
		</main>
	);
};

export default ConfigPage;
