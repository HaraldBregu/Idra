import { useEffect, useState } from 'react';
import {
	SPEECH_TO_TEXT_BATCH_API_TYPE,
	SPEECH_TO_TEXT_STREAM_API_TYPE,
	getSpeechToTextModelApiTypes,
} from '@shared/providers/models/stt';

export type VoiceButtonMode = 'dictate' | 'record' | 'disabled';

export function useVoiceButtonMode(): VoiceButtonMode {
	const [mode, setMode] = useState<VoiceButtonMode>('disabled');

	useEffect(() => {
		void window.voice
			.getSelection()
			.then((selection) => {
				if (!selection?.model?.id) {
					setMode('disabled');
					return;
				}
				const apiTypes = getSpeechToTextModelApiTypes(selection.provider.id, selection.model.id);
				if (apiTypes.includes(SPEECH_TO_TEXT_STREAM_API_TYPE)) {
					setMode('dictate');
					return;
				}
				setMode(apiTypes.includes(SPEECH_TO_TEXT_BATCH_API_TYPE) ? 'record' : 'disabled');
			})
			.catch(() => setMode('disabled'));
	}, []);

	return mode;
}
