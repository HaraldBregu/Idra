import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WikiPage from '../../../src/renderer/src/pages/settings/pages/wiki/Page';

jest.mock('react-i18next', () => {
	const translations: Record<string, string> = {
		'common.save': 'Save',
		'common.cancel': 'Cancel',
		'settings.wiki.title': 'LLM Wiki',
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
		'settings.wiki.scheduleTitle': 'Automation',
		'settings.wiki.scheduleFrequency': 'Generation frequency',
		'settings.wiki.scheduleDescription': 'Choose how often generation runs.',
		'settings.wiki.scheduleOptions.off': 'Off',
		'settings.wiki.scheduleOptions.every4h': 'Every 4 hours',
		'settings.wiki.scheduleOptions.every12h': 'Every 12 hours',
		'settings.wiki.scheduleOptions.every1d': 'Every day',
		'settings.wiki.scheduleOptions.every7d': 'Every week',
		'settings.wiki.scheduleOptions.custom': 'Custom schedule',
		'settings.wiki.runNow': 'Run now',
		'settings.wiki.cancelling': 'Cancelling...',
		'settings.wiki.progress.generating': 'Generating {{current}} of {{total}} · {{source}}',
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
	cancel: jest.fn(),
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
	wikiApi.cancel.mockResolvedValue(true);
	wikiApi.pickDirectory.mockResolvedValue('/chosen/raw');
	wikiApi.openDirectory.mockResolvedValue(undefined);
});

describe('Wiki settings', () => {
	it('loads defaults, edits a path and saves through the isolated wiki API', async () => {
		const user = userEvent.setup();
		render(<WikiPage />);

		expect(await screen.findByRole('heading', { name: 'LLM Wiki' })).toBeInTheDocument();
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

	it('shows live source progress and cancels an active run', async () => {
		const user = userEvent.setup();
		wikiApi.getStatus.mockResolvedValue({
			running: true,
			settingsPath: '/settings/wiki.json',
			progress: {
				phase: 'generating',
				currentSource: 2,
				totalSources: 10,
				source: 'luna.md',
				startedAt: '2026-08-06T12:00:00.000Z',
			},
		});

		render(<WikiPage />);

		expect(await screen.findByText('Generating 2 of 10 · luna.md')).toBeInTheDocument();
		await user.click(screen.getByRole('button', { name: 'Cancel' }));
		await waitFor(() => expect(wikiApi.cancel).toHaveBeenCalled());
	});

	it('saves a friendly automation schedule preset', async () => {
		const user = userEvent.setup();
		wikiApi.getSettings.mockResolvedValue({
			...settings,
			schedule: { enabled: true, cronExpression: '0 */12 * * *' },
		});

		render(<WikiPage />);

		expect(await screen.findByRole('heading', { name: 'Automation' })).toBeInTheDocument();
		const frequency = screen.getByRole('combobox', { name: 'Generation frequency' });
		expect(frequency).toHaveTextContent('Every 12 hours');

		await user.click(frequency);
		await user.click(await screen.findByRole('option', { name: 'Every 4 hours' }));
		await user.click(screen.getByRole('button', { name: 'Save' }));

		await waitFor(() =>
			expect(wikiApi.saveSettings).toHaveBeenCalledWith(
				expect.objectContaining({
					schedule: { enabled: true, cronExpression: '0 */4 * * *' },
				})
			)
		);
	});
});
