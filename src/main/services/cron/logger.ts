export function handleLoggerFire(scheduleId: string, message: string): void {
	console.info('[CronService]', `Schedule ${scheduleId} fired: ${message}`);
}
