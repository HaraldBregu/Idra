import type { Dispatch } from 'react';
import { useEffect } from 'react';
import { openExternalUrl } from '@/lib/external-links';
import { providers } from '@/lib/providers';
import type { StoredProvider as Provider } from '../../../../../shared/provider_types';
import { actionableProviderCatalog, getErrorMessage } from '../constants';
import type { ProviderCatalogItem, ProviderSetupEntry } from '../types';
import type { SetupAction } from '../state/actions';
import type { SetupState } from '../state/types';

function toStoredProvider(providerId: string, apiKey: string): Provider | undefined {
	const provider = providers().find((item) => item.id === providerId);
	if (!provider) return undefined;
	return {
		id: provider.id,
		name: provider.name,
		apiKey,
		baseUrl: provider.baseUrl,
	};
}

async function isProviderApiKeySaved(providerId: string): Promise<boolean> {
	const provider = await window.provider.get(providerId);
	return Boolean(provider?.apiKey.trim());
}

async function setProviderApiKey(providerId: string, apiKey: string): Promise<void> {
	const provider = toStoredProvider(providerId, apiKey);
	if (!provider) throw new Error('Unknown provider.');
	await window.provider.set(provider);
}

export function useProviderSetup(state: SetupState, dispatch: Dispatch<SetupAction>) {
	const { step, providerEntries, savingProviderId } = state;

	useEffect(() => {
		if (step !== 'providers') return;
		let cancelled = false;

		async function loadApiKeyStatus(): Promise<void> {
			try {
				const savedEntries = await Promise.all(
					actionableProviderCatalog().map(async (provider) => {
						const saved = await isProviderApiKeySaved(provider.id);
						return [provider.id, saved] as const;
					})
				);
				if (cancelled) return;
				const savedStatus = Object.fromEntries(savedEntries);
				dispatch({ type: 'MERGE_PROVIDER_SAVED_STATUS', savedStatus });
			} catch (error) {
				if (cancelled) return;
				console.error('[useProviderSetup] Failed to check saved provider status:', error);
				dispatch({
					type: 'SET_ERROR',
					message: getErrorMessage(error, 'Could not check saved provider access.'),
				});
			}
		}

		void loadApiKeyStatus();
		return () => {
			cancelled = true;
		};
	}, [step, dispatch]);

	function updateProviderEntry(providerId: string, patch: Partial<ProviderSetupEntry>): void {
		dispatch({ type: 'UPDATE_PROVIDER_ENTRY', providerId, patch });
	}

	function handleProviderApiKeyChange(providerId: string, apiKey: string): void {
		dispatch({ type: 'CLEAR_ERROR' });
		updateProviderEntry(providerId, { apiKey });
	}

	async function saveProviderEntry(providerId: string): Promise<boolean> {
		const entry = providerEntries.find((item) => item.providerId === providerId);
		if (!entry) return false;

		const apiKey = entry.apiKey.trim();
		if (!apiKey) {
			dispatch({ type: 'SET_ERROR', message: 'Enter an API key before saving this provider.' });
			return false;
		}

		dispatch({ type: 'SET_SAVING_PROVIDER', providerId });
		dispatch({ type: 'CLEAR_ERROR' });
		try {
			await setProviderApiKey(providerId, apiKey);
			updateProviderEntry(providerId, { apiKey: '', apiKeySaved: true, editing: false });
			return true;
		} catch (error) {
			console.error('[useProviderSetup] Failed to save API key:', error);
			dispatch({
				type: 'SET_ERROR',
				message: getErrorMessage(error, 'Could not save provider API key.'),
			});
			return false;
		} finally {
			dispatch({ type: 'SET_SAVING_PROVIDER', providerId: null });
		}
	}

	async function handleContinueProviders(): Promise<void> {
		const hasProviderDraft = providerEntries.some(
			(entry) => entry.apiKeySaved || entry.apiKey.trim().length > 0
		);
		if (!hasProviderDraft || savingProviderId) return;

		dispatch({ type: 'SET_SAVING_PROVIDER', providerId: 'all' });
		dispatch({ type: 'CLEAR_ERROR' });
		try {
			const entriesToSave = providerEntries.filter((entry) => entry.apiKey.trim().length > 0);
			for (const entry of entriesToSave) {
				await setProviderApiKey(entry.providerId, entry.apiKey.trim());
			}
			if (entriesToSave.length > 0) {
				dispatch({
					type: 'MARK_PROVIDERS_SAVED',
					providerIds: entriesToSave.map((entry) => entry.providerId),
				});
			}
			dispatch({ type: 'GO_TO_STEP', step: 'models' });
		} catch (error) {
			console.error('[useProviderSetup] Failed to save provider API keys:', error);
			dispatch({
				type: 'SET_ERROR',
				message: getErrorMessage(error, 'Could not save provider API keys.'),
			});
		} finally {
			dispatch({ type: 'SET_SAVING_PROVIDER', providerId: null });
		}
	}

	function handleOpenProviderLink(provider: ProviderCatalogItem): void {
		if (!provider.apiConfigurationUrl) return;
		openExternalUrl(provider.apiConfigurationUrl);
	}

	return {
		updateProviderEntry,
		handleProviderApiKeyChange,
		saveProviderEntry,
		handleContinueProviders,
		handleOpenProviderLink,
	};
}
