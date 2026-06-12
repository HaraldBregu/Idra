import path from 'node:path';
import { app } from 'electron';
import Store from 'electron-store';
import { Service } from 'typedi';

interface SttSettingsSchema {
	providerId: string | undefined;
	modelId: string | undefined;
}

const DEFAULT_SETTINGS: SttSettingsSchema = {
	providerId: undefined,
	modelId: undefined,
};

export interface SttSettingsStoreOptions {
	cwd?: string;
}

@Service()
export class SttSettingsStore {
	private readonly store: Store<SttSettingsSchema>;

	constructor(options: SttSettingsStoreOptions = {}) {
		this.store = new Store<SttSettingsSchema>({
			name: 'settings',
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
}

function resolveSttSettingsLocation(): string {
	try {
		return path.join(app.getPath('userData'), 'stt');
	} catch {
		const base = process.env.APPDATA ?? process.env.XDG_CONFIG_HOME ?? process.env.HOME ?? process.cwd();
		return path.join(path.resolve(base, app?.getName?.() ?? 'Friday'), 'stt');
	}
}

function optionalTrimmedString(value: unknown): string | undefined {
	if (typeof value !== 'string') return undefined;
	const trimmed = value.trim();
	return trimmed || undefined;
}
