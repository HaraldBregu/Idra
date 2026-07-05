import React from 'react';
import { AGENTS } from '@/lib/compat';
import { ModelServiceSettingsPage } from '../model-services/Page';

const TextToSpeechPage: React.FC = () => {
	return <ModelServiceSettingsPage serviceId={AGENTS.textToSpeech} />;
};

export default TextToSpeechPage;
