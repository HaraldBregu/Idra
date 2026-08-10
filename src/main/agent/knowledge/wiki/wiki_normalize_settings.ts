import path from 'node:path';
import cron from 'node-cron';
import type { WikiSettings } from '../../../../shared/wiki_types';
import { realPath } from '../../../shared/real_path';
import { DEFAULT_WIKI_SETTINGS } from './wiki_settings_store';

type WikiSettingsInput = Partial<WikiSettings> &
	Pick<WikiSettings, 'providerId' | 'modelId' | 'sourcePath' | 'targetPath' | 'schedule'>;

export function normalizeWikiSettings(input: WikiSettingsInput): WikiSettings {
	const providerId = input.providerId?.trim() ?? '';
	const modelId = input.modelId?.trim() ?? '';
	const sourcePath = realPath(input.sourcePath?.trim() ?? '');
	const targetPath = realPath(input.targetPath?.trim() ?? '');
	const cronExpression = input.schedule?.cronExpression?.trim().replace(/\s+/g, ' ') ?? '';
	const enabled = input.schedule?.enabled === true;

	if (!input.sourcePath?.trim()) throw new Error('Wiki source path is required.');
	if (!input.targetPath?.trim()) throw new Error('Wiki target path is required.');
	if (!cronExpression || !cron.validate(cronExpression)) {
		throw new Error('Wiki schedule must be a valid cron expression.');
	}
	if (enabled && (!providerId || !modelId)) {
		throw new Error('Select a provider and model before enabling the wiki schedule.');
	}

	const targetFromSource = path.relative(sourcePath, targetPath);
	const sourceFromTarget = path.relative(targetPath, sourcePath);
	const targetNested =
		!targetFromSource || (!targetFromSource.startsWith('..') && !path.isAbsolute(targetFromSource));
	const sourceNested =
		!sourceFromTarget || (!sourceFromTarget.startsWith('..') && !path.isAbsolute(sourceFromTarget));
	if (targetNested || sourceNested) {
		throw new Error('Wiki source and target folders must be separate, non-nested folders.');
	}

	return {
		enabled: input.enabled ?? DEFAULT_WIKI_SETTINGS.enabled,
		providerId,
		modelId,
		sourcePath,
		targetPath,
		autoFileAnswers: input.autoFileAnswers ?? DEFAULT_WIKI_SETTINGS.autoFileAnswers,
		requireReviewForMajorChanges:
			input.requireReviewForMajorChanges ?? DEFAULT_WIKI_SETTINGS.requireReviewForMajorChanges,
		retrievalPriority: 'wiki_first',
		lintOnStartup: input.lintOnStartup ?? DEFAULT_WIKI_SETTINGS.lintOnStartup,
		schedule: { enabled, cronExpression },
	};
}
