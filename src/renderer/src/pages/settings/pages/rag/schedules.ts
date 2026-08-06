export const RAG_SCHEDULES = [
	{ key: 'every4h', cron: '0 */4 * * *', labelKey: 'settings.rag.scheduleEvery4Hours' },
	{ key: 'every12h', cron: '0 */12 * * *', labelKey: 'settings.rag.scheduleEvery12Hours' },
	{ key: 'every1d', cron: '0 3 * * *', labelKey: 'settings.rag.scheduleEveryDay' },
	{ key: 'every7d', cron: '0 3 * * 1', labelKey: 'settings.rag.scheduleEveryWeek' },
] as const;
