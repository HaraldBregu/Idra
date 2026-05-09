import React, { useEffect, useState } from 'react';
import type { Provider } from '../../../../shared/providers';
import type { Model } from '../../../../shared/service';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/Select';

const ConfigPage: React.FC = () => {
	const [providers, setProviders] = useState<Provider[]>([]);
	const [selectedProvider, setSelectedProvider] = useState('');
	const [models, setModels] = useState<Model[]>([]);
	const [selectedModel, setSelectedModel] = useState('');
	const [loadingModels, setLoadingModels] = useState(false);

	useEffect(() => {
		let cancelled = false;

		async function loadProviders(): Promise<void> {
			const storedProviders = await window.app.getProviders();
			if (cancelled) return;

			setProviders(storedProviders);
			const firstProviderId = storedProviders[0]?.id ?? '';
			setSelectedProvider(firstProviderId);
		}

		void loadProviders();

		return () => {
			cancelled = true;
		};
	}, []);

	useEffect(() => {
		let cancelled = false;

		async function loadModels(): Promise<void> {
			if (!selectedProvider) {
				setModels([]);
				setSelectedModel('');
				return;
			}

			setLoadingModels(true);
			try {
				const providerModels = await window.app.getModelsForProvider(selectedProvider);
				if (cancelled) return;

				setModels(providerModels);
				setSelectedModel(providerModels[0]?.id ?? '');
			} finally {
				if (!cancelled) {
					setLoadingModels(false);
				}
			}
		}

		void loadModels();

		return () => {
			cancelled = true;
		};
	}, [selectedProvider]);

	function handleProviderChange(value: string | null): void {
		const providerId = value ?? '';

		setSelectedProvider(providerId);
		setModels([]);
		setSelectedModel('');
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
							disabled={loadingModels || models.length === 0}
						>
							<SelectTrigger id="config-model" className="h-10">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{models.map((model) => (
									<SelectItem key={model.id} value={model.id}>
										{model.name}
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
