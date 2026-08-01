import React from 'react';
import { useTranslation } from 'react-i18next';
import { SettingsPageHeader, SettingsPageShell } from '../../components';
import StoragePage from '../storage/Page';
import VectorDbPage from '../vectordb/Page';
import SearchPage from '../search/Page';
import TasksPage from '../tasks/Page';

const ApplicationPage: React.FC = () => {
	const { t } = useTranslation();

	return (
		<>
			<SettingsPageShell>
				<SettingsPageHeader title={t('settings.tabs.application')} />
			</SettingsPageShell>
			<StoragePage />
			<VectorDbPage />
			<SearchPage />
			<TasksPage />
		</>
	);
};

export default ApplicationPage;
