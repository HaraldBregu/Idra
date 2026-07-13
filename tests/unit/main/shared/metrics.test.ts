import { setupMemoryMonitor } from '../../../../src/main/shared/metrics';
import type { LoggerService } from '../../../../src/main/shared';

function fakeLogger(): LoggerService {
	return { info: jest.fn() } as unknown as LoggerService;
}

describe('setupMemoryMonitor', () => {
	beforeEach(() => jest.useFakeTimers());
	afterEach(() => jest.useRealTimers());

	it('samples immediately and then on the interval', () => {
		const logger = fakeLogger();
		setupMemoryMonitor(logger, 1000);
		expect(logger.info).toHaveBeenCalledTimes(1);
		expect((logger.info as jest.Mock).mock.calls[0][0]).toBe('MemoryMonitor');
		expect((logger.info as jest.Mock).mock.calls[0][1]).toMatch(/rss=\d+MB/);

		jest.advanceTimersByTime(2000);
		expect(logger.info).toHaveBeenCalledTimes(3);
	});

	it('is idempotent — a second call does not start a new monitor', () => {
		const logger = fakeLogger();
		setupMemoryMonitor(logger, 1000);
		expect(logger.info).not.toHaveBeenCalled();
	});
});
