import React from 'react';
import { useTranslation } from 'react-i18next';
import { SettingsPageHeader, SettingsPageShell, SettingsPanel } from '../../components';
import { getSettingsOverviewItem, SettingsOverviewCard } from '../overview/Page';

const APPLICATION_PATHS = [
	'/settings/storage',
	'/settings/vectordb',
	'/settings/search',
	'/settings/tasks',
] as const;

const ApplicationPage: React.FC = () => {
	const { t } = useTranslation();

	return (
		<SettingsPageShell>
			<SettingsPageHeader title={t('settings.tabs.application')} />
			<SettingsPanel>
				{APPLICATION_PATHS.map((path) => (
					<SettingsOverviewCard key={path} item={getSettingsOverviewItem(path)} />
				))}
			</SettingsPanel>
		</SettingsPageShell>
	);
};

export default ApplicationPage;
