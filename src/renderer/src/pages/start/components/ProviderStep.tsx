import React from 'react';
import { useTranslation } from 'react-i18next';
import ProvidersPage from '../../settings/pages/providers/Page';
import { SettingsSection } from '../../settings/components';
import { actionableDatabaseCatalog, STEP_COPY } from '../constants';
import { DatabaseProviderCard } from './DatabaseProviderCard';
import { StepHeader } from './StepHeader';

export function ProviderStep(): React.JSX.Element {
	const { t } = useTranslation();
	const { title, description } = STEP_COPY.providers;

	return (
		<div className="mx-auto flex min-h-full w-full max-w-2xl flex-col px-4 py-8 sm:px-6">
			<StepHeader title={title} description={description} />
			<div className="mt-6">
				<ProvidersPage embedded />

				<SettingsSection title={t('settings.overview.groups.vectorDatabases')}>
					<div className="space-y-3 pb-4">
						{actionableDatabaseCatalog().map((provider) => (
							<DatabaseProviderCard key={provider.id} provider={provider} />
						))}
					</div>
				</SettingsSection>
			</div>
		</div>
	);
}
