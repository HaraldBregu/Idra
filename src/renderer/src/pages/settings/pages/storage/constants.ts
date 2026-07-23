export const DEFAULT_SYNC_INTERVAL_MINUTES = 24 * 60;

export const SYNC_INTERVAL_OPTIONS: readonly { minutes: number; labelKey: string }[] = [
	{ minutes: 0, labelKey: 'settings.storage.autoSync.off' },
	{ minutes: 15, labelKey: 'settings.storage.autoSync.every15m' },
	{ minutes: 30, labelKey: 'settings.storage.autoSync.every30m' },
	{ minutes: 60, labelKey: 'settings.storage.autoSync.every1h' },
	{ minutes: 180, labelKey: 'settings.storage.autoSync.every3h' },
	{ minutes: 360, labelKey: 'settings.storage.autoSync.every6h' },
	{ minutes: 720, labelKey: 'settings.storage.autoSync.every12h' },
	{ minutes: 1440, labelKey: 'settings.storage.autoSync.every1d' },
	{ minutes: 2880, labelKey: 'settings.storage.autoSync.every2d' },
	{ minutes: 10080, labelKey: 'settings.storage.autoSync.every7d' },
];
