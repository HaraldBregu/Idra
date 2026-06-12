import path from 'node:path';
import { app } from 'electron';
import Store from 'electron-store';
import { Service } from 'typedi';
import { DEFAULT_PROVIDERS } from '../../shared/providers';
import {
	SPEECH_TO_TEXT_PROVIDER_BASE_URLS,
	SPEECH_TO_TEXT_PROVIDER_IDS,
	type SpeechToTextProviderId,
} from '../../shared/providers/models/stt';
import { normalizeProviderId } from '../../shared/providers/models/types';
import type { Provider, ProviderRecord } from '../../shared/providers/types';
import type { SttProviderSpec } from './types';

interface SttSettingsSchema {
	providerId: string | undefined;
	modelId: string | undefined;
	providers: ProviderRecord;
}

const DEFAULT_SETTINGS: SttSettingsSchema = {
	providerId: undefined,
	modelId: undefined,
	providers: {},
};

const STT_SETTINGS_STORE_NAME = 'settings.stt';

export interface SttSettingsStoreOptions {
	cwd?: string;
}

@Service()
export class SttSettingsStore {
	private readonly store: Store<SttSettingsSchema>;

	constructor(options: SttSettingsStoreOptions = {}) {
		this.store = new Store<SttSettingsSchema>({
			name: STT_SETTINGS_STORE_NAME,
			cwd: options.cwd ?? resolveSttSettingsLocation(),
			accessPropertiesByDotNotation: false,
			defaults: DEFAULT_SETTINGS,
		});
	}

	getProviderId(): string | undefined {
		return optionalTrimmedString(this.store.get('providerId'));
	}

	getModelId(): string | undefined {
		return optionalTrimmedString(this.store.get('modelId'));
	}

	setSelection(providerId: string, modelId: string): void {
		this.store.set('providerId', providerId);
		this.store.set('modelId', modelId);
	}

	listProviders(): ProviderRecord {
		const raw = this.store.get('providers');
		if (!isRecord(raw)) return {};
		const providers: ProviderRecord = {};
		for (const [id, value] of Object.entries(raw)) {
			const providerId = resolveSttProviderId(id);
			if (providerId && isProvider(value)) providers[providerId] = normalizeProvider(value);
		}
		return providers;
	}

	getProvider(providerId: string): Provider | undefined {
		const normalized = resolveSttProviderId(providerId);
		if (!normalized) return undefined;
		const stored = this.listProviders()[normalized];
		return stored ? withDefaultProviderValues(normalized, stored) : undefined;
	}

	setProvider(providerId: string, provider: Provider): Provider {
		const normalized = requireSttProviderId(providerId);
		const next = withDefaultProviderValues(normalized, provider);
		const providers = this.listProviders();
		providers[normalized] = next;
		this.store.set('providers', providers);
		return next;
	}

	hasProvider(providerId: string): boolean {
		const provider = this.getProvider(providerId);
		return Boolean(provider?.apiKey.trim());
	}

	getProviderSpec(providerId: SpeechToTextProviderId): SttProviderSpec {
		const stored = this.getProvider(providerId);
		const defaults = defaultProvider(providerId);
		return {
			id: providerId,
			name: stored?.name || defaults?.name || providerId,
			apiKey: stored?.apiKey.trim() ?? '',
			baseURL: stored?.baseUrl || SPEECH_TO_TEXT_PROVIDER_BASE_URLS[providerId],
		};
	}
}

function resolveSttSettingsLocation(): string {
	try {
		return path.resolve(app.getPath('appData'), app.getName());
	} catch {
		const base = process.env.APPDATA ?? process.env.XDG_CONFIG_HOME ?? process.env.HOME ?? process.cwd();
		return path.resolve(base, app?.getName?.() ?? 'Friday');
	}
}

function optionalTrimmedString(value: unknown): string | undefined {
	if (typeof value !== 'string') return undefined;
	const trimmed = value.trim();
	return trimmed || undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isProvider(value: unknown): value is Provider {
	return (
		isRecord(value) &&
		typeof value.name === 'string' &&
		typeof value.apiKey === 'string' &&
		typeof value.baseUrl === 'string'
	);
}

function normalizeProvider(provider: Provider): Provider {
	return {
		name: provider.name.trim(),
		apiKey: provider.apiKey.trim(),
		baseUrl: provider.baseUrl.trim(),
	};
}

function resolveSttProviderId(providerId: string): SpeechToTextProviderId | undefined {
	const normalized = normalizeProviderId(providerId);
	if ((SPEECH_TO_TEXT_PROVIDER_IDS as readonly string[]).includes(normalized)) {
		return normalized as SpeechToTextProviderId;
	}
	return undefined;
}

function requireSttProviderId(providerId: string): SpeechToTextProviderId {
	const normalized = resolveSttProviderId(providerId);
	if (!normalized) throw new Error(`Unsupported speech-to-text provider: ${providerId}`);
	return normalized;
}

function defaultProvider(providerId: SpeechToTextProviderId) {
	return DEFAULT_PROVIDERS.find((provider) => provider.id === providerId);
}

function withDefaultProviderValues(providerId: SpeechToTextProviderId, provider: Provider): Provider {
	const defaults = defaultProvider(providerId);
	const normalized = normalizeProvider(provider);
	return {
		name: normalized.name || defaults?.name || providerId,
		apiKey: normalized.apiKey,
		baseUrl: normalized.baseUrl || SPEECH_TO_TEXT_PROVIDER_BASE_URLS[providerId],
	};
}
