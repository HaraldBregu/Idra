import { useEffect, useState } from 'react';
import { speechToTextApiTypes } from '@/lib/providers';

export type VoiceButtonMode = 'dictate' | 'record' | 'disabled';

export function useVoiceButtonMode(): VoiceButtonMode {
	const [mode, setMode] = useState<VoiceButtonMode>('disabled');

	useEffect(() => {
		void window.models.transcribe
			.getSelection()
			.then((selection) => {
				if (!selection?.model?.id) {
					setMode('disabled');
					return;
				}
				const apiTypes = speechToTextApiTypes(selection.provider.id, selection.model.id);
				if (apiTypes.includes('stream')) {
					setMode('dictate');
					return;
				}
				setMode(apiTypes.includes('batch') ? 'record' : 'disabled');
			})
			.catch(() => setMode('disabled'));
	}, []);

	return mode;
}
