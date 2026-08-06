import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WikiPage from '../../../src/renderer/src/pages/settings/pages/wiki/Page';

jest.mock('react-i18next', () => {
	const translations: Record<string, string> = {
		'common.save': 'Save',
		'settings.tabs.wiki': 'Wiki',
		'settings.wiki.description': 'Persistent Markdown wiki',
		'settings.wiki.behaviorTitle': 'Wiki behavior',
		'settings.wiki.behaviorDescription': 'Behavior settings',
		'settings.wiki.enabled': 'Enable wiki knowledge',
		'settings.wiki.enabledDescription': 'Expose wiki tools',
		'settings.wiki.autoFileAnswers': 'Automatic filing',
		'settings.wiki.autoFileAnswersDescription': 'Save durable answers',
		'settings.wiki.requireReview': 'Review major changes',
		'settings.wiki.requireReviewDescription': 'Queue risky changes',
		'settings.wiki.lintOnStartup': 'Lint on startup',
		'settings.wiki.lintOnStartupDescription': 'Inspect integrity',
		'settings.wiki.sourcePath': 'Raw source folder',
		'settings.wiki.sourceDescription': 'Source files',
		'settings.wiki.targetPath': 'Generated wiki folder',
		'settings.wiki.targetDescription': 'Generated pages',
		'settings.wiki.pickSource': 'Choose raw source folder',
		'settings.wiki.pickTarget': 'Choose generated wiki folder',
		'settings.wiki.scheduleEnabled': 'Scheduled generation',
		'settings.wiki.cronExpression': 'Cron expression',
		'settings.wiki.runNow': 'Run now',
		'settings.wiki.saved': 'Wiki settings saved.',
		'settings.wiki.runResult':
			'Processed {{processed}}, skipped {{skipped}}, created {{created}}, updated {{updated}}.',
	};
	const t = (key: string, values?: Record<string, string | number>): string =>
		Object.entries(values ?? {}).reduce(
			(text, [name, value]) => text.replace(`{{${name}}}`, String(value)),
			translations[key] ?? key
		);
	return { useTranslation: () => ({ t }) };
});

jest.mock('@/components/model-provider-select', () => {
	const React = jest.requireActual<typeof import('react')>('react');
	return {
		llmProviderGroups: () => [{ id: 'openai', models: [{ id: 'gpt-5', name: 'GPT-5' }] }],
		resolveStoredModelProvider: () => ({ providerId: 'openai', modelId: 'gpt-5' }),
		ModelProviderSelect: ({ providerId, modelId }: { providerId: string; modelId: string }) =>
			React.createElement('div', null, `${providerId}/${modelId}`),
	};
});

const settings = {
	enabled: true,
	providerId: '',
	modelId: '',
	sourcePath: '/wiki/raw',
	targetPath: '/wiki/data',
	autoFileAnswers: false,
	requireReviewForMajorChanges: true,
	retrievalPriority: 'wiki_first' as const,
	lintOnStartup: false,
	schedule: { enabled: false, cronExpression: '0 3 * * *' },
};

const wikiApi = {
	getSettings: jest.fn(),
	getStatus: jest.fn(),
	saveSettings: jest.fn(),
	run: jest.fn(),
	pickDirectory: jest.fn(),
	openDirectory: jest.fn(),
};

beforeEach(() => {
	Object.defineProperty(window, 'wiki', {
		configurable: true,
		value: wikiApi,
	});
	wikiApi.getSettings.mockResolvedValue(settings);
	wikiApi.getStatus.mockResolvedValue({
		running: false,
		settingsPath: '/settings/wiki.json',
	});
	wikiApi.saveSettings.mockImplementation(async (value) => value);
	wikiApi.run.mockResolvedValue({
		processedSources: 1,
		skippedSources: 2,
		createdPages: 3,
		updatedPages: 4,
		completedAt: '2026-07-28T12:00:00.000Z',
	});
	wikiApi.pickDirectory.mockResolvedValue('/chosen/raw');
	wikiApi.openDirectory.mockResolvedValue(undefined);
});

describe('Wiki settings', () => {
	it('loads defaults, edits a path and saves through the isolated wiki API', async () => {
		const user = userEvent.setup();
		render(<WikiPage />);

		const source = await screen.findByLabelText('Raw source folder');
		expect(source).toHaveValue('/wiki/raw');
		await user.clear(source);
		await user.type(source, '/documents');
		await user.click(screen.getByRole('button', { name: 'Save' }));

		await waitFor(() =>
			expect(wikiApi.saveSettings).toHaveBeenCalledWith({
				...settings,
				providerId: 'openai',
				modelId: 'gpt-5',
				sourcePath: '/documents',
			})
		);
		expect(await screen.findByText('Wiki settings saved.')).toBeInTheDocument();
	});

	it('picks a source folder and runs the incremental compiler', async () => {
		const user = userEvent.setup();
		render(<WikiPage />);

		await user.click(await screen.findByRole('button', { name: 'Choose raw source folder' }));
		expect(screen.getByLabelText('Raw source folder')).toHaveValue('/chosen/raw');
		await user.click(screen.getByRole('button', { name: 'Run now' }));

		await waitFor(() => expect(wikiApi.run).toHaveBeenCalled());
		expect(
			await screen.findByText('Processed 1, skipped 2, created 3, updated 4.')
		).toBeInTheDocument();
	});
});
