const schedule = jest.fn();
const getWikiSettings = jest.fn();
const runWiki = jest.fn();

jest.mock('node-cron', () => ({
	__esModule: true,
	default: {
		schedule,
	},
}));

jest.mock('../../../../src/main/wiki/wiki_get_settings', () => ({
	getWikiSettings,
}));

jest.mock('../../../../src/main/wiki/wiki_run', () => ({
	runWiki,
}));

import { rescheduleWiki } from '../../../../src/main/wiki/wiki_reschedule';
import { wikiRuntime } from '../../../../src/main/wiki/wiki_runtime';

describe('wiki scheduling', () => {
	beforeEach(() => {
		schedule.mockClear();
		wikiRuntime.task = undefined;
		getWikiSettings.mockReturnValue({
			enabled: true,
			providerId: 'openai',
			modelId: 'gpt-5',
			sourcePath: '/tmp/raw',
			targetPath: '/tmp/data',
			schedule: { enabled: true, cronExpression: '0 3 * * *' },
		});
		schedule.mockReturnValue({ destroy: jest.fn(), getNextRun: jest.fn() });
	});

	it('creates a namespaced no-overlap cron task', () => {
		rescheduleWiki();

		expect(schedule).toHaveBeenCalledWith('0 3 * * *', expect.any(Function), {
			name: 'wiki:ingest',
			noOverlap: true,
		});
	});

	it('destroys the prior task and leaves scheduling disabled', () => {
		const destroy = jest.fn();
		wikiRuntime.task = { destroy } as never;
		getWikiSettings.mockReturnValue({
			...getWikiSettings(),
			schedule: { enabled: false, cronExpression: '0 3 * * *' },
		});

		rescheduleWiki();

		expect(destroy).toHaveBeenCalled();
		expect(schedule).not.toHaveBeenCalled();
		expect(wikiRuntime.task).toBeUndefined();
	});
});
