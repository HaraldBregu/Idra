import React from 'react';
import { useTranslation } from 'react-i18next';
import { SettingsPageHeader, SettingsPageShell } from '../../components';
import { MediaPermissionsSection } from '../../components/media';

const SystemPage: React.FC = () => {
	const { t } = useTranslation();

	return (
		<SettingsPageShell>
			<SettingsPageHeader
				title={t('settings.tabs.system')}
				description={t('settings.system.description')}
			/>
			<MediaPermissionsSection />
		</SettingsPageShell>
	);
};

export default SystemPage;
