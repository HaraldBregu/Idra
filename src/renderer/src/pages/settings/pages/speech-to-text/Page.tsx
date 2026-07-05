import React from 'react';
import { AGENTS } from '@/lib/compat';
import { ModelServiceSettingsPage } from '../model-services/Page';

const SpeechToTextPage: React.FC = () => {
	return <ModelServiceSettingsPage serviceId={AGENTS.speechToText} />;
};

export default SpeechToTextPage;
