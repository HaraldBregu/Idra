export type SettingsSchema = {
	providerId: string | undefined;
	modelId: string | undefined;
};

export const DEFAULT_AGENT_SETTINGS: SettingsSchema = {
	providerId: undefined,
	modelId: undefined,
};
