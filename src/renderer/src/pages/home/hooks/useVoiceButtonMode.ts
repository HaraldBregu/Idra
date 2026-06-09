import { useEffect, useState } from 'react';
import { appApi, isRealtimeSpeechToTextModel } from '@/lib/compat';

export type VoiceButtonMode = 'dictate' | 'record' | 'disabled';

export function useVoiceButtonMode(): VoiceButtonMode {
	const [mode, setMode] = useState<VoiceButtonMode>('disabled');

	useEffect(() => {
		void appApi
			.getSpeechTranscriberService()
			.then((selection) => {
				if (!selection?.model?.id) {
					setMode('disabled');
					return;
				}
				setMode(
					isRealtimeSpeechToTextModel(selection.provider.id, selection.model.id)
						? 'dictate'
						: 'record'
				);
			})
			.catch(() => setMode('disabled'));
	}, []);

	return mode;
}
