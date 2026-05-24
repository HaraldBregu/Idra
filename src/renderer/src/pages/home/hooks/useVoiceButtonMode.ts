import { useEffect, useState } from 'react';
import { isRealtimeVoiceModel } from '../../../../../shared/providers';

export type VoiceButtonMode = 'dictate' | 'record' | 'disabled';

export function useVoiceButtonMode(): VoiceButtonMode {
	const [mode, setMode] = useState<VoiceButtonMode>('disabled');

	useEffect(() => {
		void window.app
			.getSpeechToTextOperator()
			.then((operator) => {
				if (!operator?.model?.id) {
					setMode('disabled');
					return;
				}
				setMode(
					isRealtimeVoiceModel(operator.provider.id, operator.model.id)
						? 'dictate'
						: 'record'
				);
			})
			.catch(() => setMode('disabled'));
	}, []);

	return mode;
}
