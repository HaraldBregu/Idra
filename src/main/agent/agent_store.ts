import path from 'node:path';
import Store from 'electron-store';
import { userDataLocation } from '../shared/user_data_location';

export type AssistantConfiguration = {
	providerId: string | undefined;
	modelId: string | undefined;
};

const AGENT_STORE_NAME = 'settings';

const DEFAULT_ASSISTANT_CONFIGURATION: AssistantConfiguration = {
	providerId: undefined,
	modelId: undefined,
};

const store = new Store<{ assistant_configuration: AssistantConfiguration }>({
	name: AGENT_STORE_NAME,
	cwd: path.resolve(userDataLocation(), 'agent'),
	accessPropertiesByDotNotation: false,
	defaults: { assistant_configuration: DEFAULT_ASSISTANT_CONFIGURATION },
});

function getAssistantConfiguration(): AssistantConfiguration {
	return { ...DEFAULT_ASSISTANT_CONFIGURATION, ...store.get('assistant_configuration') };
}

function saveAssistantConfiguration(patch: Partial<AssistantConfiguration>): void {
	store.set('assistant_configuration', { ...getAssistantConfiguration(), ...patch });
}

export function getProviderId(): string | undefined {
	return getAssistantConfiguration().providerId;
}

export function setProviderId(providerId: string): void {
	saveAssistantConfiguration({ providerId });
}

export function getModelId(): string | undefined {
	return getAssistantConfiguration().modelId;
}

export function setModelId(modelId: string): void {
	saveAssistantConfiguration({ modelId });
}
