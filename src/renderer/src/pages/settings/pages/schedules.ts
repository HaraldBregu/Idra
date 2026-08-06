export const SETTINGS_SCHEDULES = [
	{ key: 'every4h', cron: '0 */4 * * *' },
	{ key: 'every12h', cron: '0 */12 * * *' },
	{ key: 'every1d', cron: '0 3 * * *' },
	{ key: 'every7d', cron: '0 3 * * 1' },
] as const;
