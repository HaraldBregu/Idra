import type { LoggerService } from './index';

let memoryMonitorInterval: NodeJS.Timeout | null = null;

export function setupMemoryMonitor(logger: LoggerService, intervalMs = 30_000): void {
	if (memoryMonitorInterval) return;
	const sample = (): void => {
		const m = process.memoryUsage();
		const mb = (n: number): number => Math.round(n / 1024 / 1024);
		const line =
			`[mem] rss=${mb(m.rss)}MB heapUsed=${mb(m.heapUsed)}MB ` +
			`heapTotal=${mb(m.heapTotal)}MB external=${mb(m.external)}MB ` +
			`arrayBuffers=${mb(m.arrayBuffers)}MB`;
		logger.info('MemoryMonitor', line);
	};
	sample();
	memoryMonitorInterval = setInterval(sample, intervalMs);
	memoryMonitorInterval.unref?.();
}
