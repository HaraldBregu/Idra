import React from 'react';
import { AGENTS } from '@/lib/compat';
import { ModelServiceSettingsPage } from '../model-services/Page';

const AssistantPage: React.FC = () => {
	return <ModelServiceSettingsPage serviceId={AGENTS.assistant} />;
};

export default AssistantPage;
