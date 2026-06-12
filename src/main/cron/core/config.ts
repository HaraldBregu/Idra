export interface CronServiceConfiguration {
	enabled: boolean;
}

export type CronServiceConfigurationPatch = Partial<CronServiceConfiguration>;

export interface CronConfigurationStore {
	readConfiguration(): CronServiceConfigurationPatch;
	writeConfiguration(configuration: CronServiceConfiguration): CronServiceConfiguration;
}

export function defaultCronEnabled(): boolean {
	return process.env.SKIP_CRON !== '1' && process.env.CRON_ENABLED !== 'false';
}

export function normalizeCronServiceConfigurationPatch(
	value: unknown
): CronServiceConfigurationPatch {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
	const record = value as Record<string, unknown>;
	return {
		enabled: typeof record.enabled === 'boolean' ? record.enabled : undefined,
	};
}

export function resolveCronServiceConfiguration(
	stored: CronServiceConfigurationPatch,
	overrides: CronServiceConfigurationPatch = {}
): CronServiceConfiguration {
	return {
		enabled: overrides.enabled ?? stored.enabled ?? defaultCronEnabled(),
	};
}
