import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { SettingsPageHeader, SettingsPageShell, SettingsSection } from '../../components';
import StoragePage from '../storage/Page';

const CloudPage: React.FC = () => {
	const { t } = useTranslation();
	const navigate = useNavigate();

	return (
		<SettingsPageShell>
			<SettingsPageHeader
				title={t('settings.tabs.cloud')}
				description={t('settings.overview.descriptions.cloud')}
			/>
			<SettingsSection
				title={t('settings.storage.configurationTitle')}
				description={t('settings.storage.description')}
			>
				<StoragePage
					inline
					emptyAction={
						<Button
							variant="outline"
							size="sm"
							className="self-start"
							onClick={() => navigate('/settings/providers/storage')}
						>
							{t('settings.storage.configureProvider')}
						</Button>
					}
				/>
			</SettingsSection>
		</SettingsPageShell>
	);
};

export default CloudPage;
