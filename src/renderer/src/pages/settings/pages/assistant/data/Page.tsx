import React from 'react';
import { useTranslation } from 'react-i18next';
import { SettingsPageHeader, SettingsPageShell } from '../../../components';
import { DataControls } from '../../../components/data';

const DataPage: React.FC = () => {
	const { t } = useTranslation();

	return (
		<SettingsPageShell>
			<SettingsPageHeader
				title={t('settings.dataControls.title')}
				description={t('settings.dataControls.description')}
			/>

			<DataControls kinds={['memory', 'sessions']} />
		</SettingsPageShell>
	);
};

export default DataPage;
