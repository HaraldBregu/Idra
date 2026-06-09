import React from 'react';
import { SettingsEmptyState, SettingsPageHeader, SettingsPageShell } from '../../components';

const HeartbeatPage: React.FC = () => {
	return (
		<SettingsPageShell>
			<SettingsPageHeader title="Heartbeat" />
			<SettingsEmptyState title="Heartbeat is unavailable." />
		</SettingsPageShell>
	);
};

export default HeartbeatPage;
