export function handleLoggerFire(scheduleId: string): void {
	console.info('[CronService]', `Schedule ${scheduleId} fired.`);
}
